import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { getEmailProvider } from "@/lib/email";
import { generateToken } from "@/lib/auth/tokens";
import { acceptInvitation, changeMemberRole, inviteMember, removeMember, suspendMember } from "@/modules/organizations/membership";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

beforeAll(() => vi.spyOn(getEmailProvider(), "send").mockResolvedValue(undefined));
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("organization memberships", () => {
  it("invites, accepts, changes, suspends, and removes members", async () => {
    const owner = await prisma.user.create({ data: { email: `member-owner-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const member = await prisma.user.create({ data: { email: `member-user-${suffix}@example.test`, passwordHash: "test", name: "Member" } });
    userIds.push(owner.id, member.id);
    const org = await prisma.organization.create({ data: { name: "Membership Org", slug: `members-${suffix}`, memberships: { create: { userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    orgIds.push(org.id);
    const ctx = { userId: owner.id, organizationId: org.id, role: "ORG_OWNER" as const };

    await inviteMember(ctx, { email: member.email, role: "TEACHER" });
    const invitation = await prisma.invitation.findFirstOrThrow({ where: { organizationId: org.id, email: member.email } });

    const raw = generateToken();
    await prisma.invitation.update({ where: { id: invitation.id }, data: { tokenHash: raw.hash } });
    await acceptInvitation(raw.token, member.id);
    const membership = await prisma.membership.findUniqueOrThrow({ where: { userId_organizationId: { userId: member.id, organizationId: org.id } } });
    expect(membership.status).toBe("ACTIVE");

    await changeMemberRole(ctx, membership.id, "ORG_ADMIN");
    await suspendMember(ctx, membership.id);
    const suspended = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(suspended.status).toBe("SUSPENDED");
    await removeMember(ctx, membership.id);
    expect(await prisma.membership.findUnique({ where: { id: membership.id } })).toBeNull();
  });

  it("rejects owner role and owner removal", async () => {
    const owner = await prisma.user.create({ data: { email: `owner-rule-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    userIds.push(owner.id);
    const org = await prisma.organization.create({ data: { name: "Owner Rules", slug: `owner-rules-${suffix}`, memberships: { create: { userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    orgIds.push(org.id);
    const ownerMembership = await prisma.membership.findFirstOrThrow({ where: { organizationId: org.id, role: "ORG_OWNER" } });
    const ctx = { userId: owner.id, organizationId: org.id, role: "ORG_OWNER" as const };

    await expect(changeMemberRole(ctx, ownerMembership.id, "TEACHER")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeMember(ctx, ownerMembership.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
