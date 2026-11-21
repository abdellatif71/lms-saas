import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { getEmailProvider } from "@/lib/email";
import { generateToken } from "@/lib/auth/tokens";
import { acceptInvitation, inviteMember } from "@/modules/organizations/membership";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

beforeAll(() => vi.spyOn(getEmailProvider(), "send").mockResolvedValue(undefined));
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("invitations", () => {
  it("rejects existing members, revokes old invitations, and accepts one time", async () => {
    const owner = await prisma.user.create({ data: { email: `invite-owner-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const existing = await prisma.user.create({ data: { email: `invite-existing-${suffix}@example.test`, passwordHash: "test", name: "Existing" } });
    userIds.push(owner.id, existing.id);
    const org = await prisma.organization.create({ data: { name: "Invite Org", slug: `invite-${suffix}`, memberships: { create: [{ userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() }, { userId: existing.id, role: "TEACHER", status: "ACTIVE", joinedAt: new Date() }] } } });
    orgIds.push(org.id);
    const ctx = { userId: owner.id, organizationId: org.id, role: "ORG_OWNER" as const };

    await expect(inviteMember(ctx, { email: existing.email, role: "STUDENT" })).rejects.toMatchObject({ code: "CONFLICT" });

    const invitee = await prisma.user.create({ data: { email: `invitee-${suffix}@example.test`, passwordHash: "test", name: "Invitee" } });
    userIds.push(invitee.id);
    await inviteMember(ctx, { email: invitee.email, role: "STUDENT" });
    const first = await prisma.invitation.findFirstOrThrow({ where: { organizationId: org.id, email: invitee.email } });
    await inviteMember(ctx, { email: invitee.email, role: "PARENT" });
    const revoked = await prisma.invitation.findUniqueOrThrow({ where: { id: first.id } });
    expect(revoked.expiresAt.getTime()).toBeLessThan(Date.now());

    const latest = await prisma.invitation.findFirstOrThrow({ where: { organizationId: org.id, email: invitee.email }, orderBy: { createdAt: "desc" } });
    const raw = generateToken();
    await prisma.invitation.update({ where: { id: latest.id }, data: { tokenHash: raw.hash } });
    await acceptInvitation(raw.token, invitee.id);
    await expect(acceptInvitation(raw.token, invitee.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects expired invitations", async () => {
    const owner = await prisma.user.create({ data: { email: `expired-owner-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const invitee = await prisma.user.create({ data: { email: `expired-user-${suffix}@example.test`, passwordHash: "test", name: "Invitee" } });
    userIds.push(owner.id, invitee.id);
    const org = await prisma.organization.create({ data: { name: "Expired Invite", slug: `expired-${suffix}`, memberships: { create: { userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    orgIds.push(org.id);
    const raw = generateToken();
    await prisma.invitation.create({ data: { organizationId: org.id, email: invitee.email, role: "STUDENT", tokenHash: raw.hash, invitedById: owner.id, expiresAt: new Date(Date.now() - 1000) } });
    await expect(acceptInvitation(raw.token, invitee.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
