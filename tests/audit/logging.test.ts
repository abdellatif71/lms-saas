import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { getEmailProvider } from "@/lib/email";
import { createOrganization } from "@/modules/organizations/service";
import { acceptInvitation, changeMemberRole, inviteMember, removeMember } from "@/modules/organizations/membership";
import { generateToken } from "@/lib/auth/tokens";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

beforeAll(() => vi.spyOn(getEmailProvider(), "send").mockResolvedValue(undefined));
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("service audit logging", () => {
  it("creates ORG.CREATED, MEMBER.INVITED, accepted, role changed, and removed entries", async () => {
    const owner = await prisma.user.create({ data: { email: `audit-owner-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const member = await prisma.user.create({ data: { email: `audit-member-${suffix}@example.test`, passwordHash: "test", name: "Member" } });
    userIds.push(owner.id, member.id);

    const created = await createOrganization(owner.id, { name: "Audit Org", slug: `audit-${suffix}` });
    orgIds.push(created.id);
    expect(await prisma.auditLog.findFirst({ where: { organizationId: created.id, action: "ORG.CREATED" } })).not.toBeNull();

    const ctx = { userId: owner.id, organizationId: created.id, role: "ORG_OWNER" as const };
    await inviteMember(ctx, { email: member.email, role: "TEACHER" });
    expect(await prisma.auditLog.findFirst({ where: { organizationId: created.id, action: "MEMBER.INVITED" } })).not.toBeNull();

    const invitation = await prisma.invitation.findFirstOrThrow({ where: { organizationId: created.id, email: member.email } });
    const raw = generateToken();
    await prisma.invitation.update({ where: { id: invitation.id }, data: { tokenHash: raw.hash } });
    const membership = await acceptInvitation(raw.token, member.id);
    expect(await prisma.auditLog.findFirst({ where: { organizationId: created.id, action: "MEMBER.INVITATION_ACCEPTED" } })).not.toBeNull();

    await changeMemberRole(ctx, membership.id, "ORG_ADMIN");
    const roleLog = await prisma.auditLog.findFirst({ where: { organizationId: created.id, action: "MEMBER.ROLE_CHANGED" } });
    expect(roleLog?.metadata).toMatchObject({ oldRole: "TEACHER", newRole: "ORG_ADMIN" });

    await removeMember(ctx, membership.id);
    expect(await prisma.auditLog.findFirst({ where: { organizationId: created.id, action: "MEMBER.REMOVED" } })).not.toBeNull();
  });

  it("audit never throws when the database write fails", async () => {
    const spy = vi.spyOn(prisma.auditLog, "create").mockRejectedValue(new Error("database unavailable"));
    await expect(audit({ action: "TEST.NO_THROW", targetType: "Test", targetId: "test-id" })).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
