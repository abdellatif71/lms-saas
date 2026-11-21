import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { changeMemberRole, listMembers, removeMember } from "@/modules/organizations/membership";
import { getOrganizationBySlug } from "@/modules/organizations/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("cross-org isolation", () => {
  it("rejects ctxA access to orgB and listing B members", async () => {
    const userA = await prisma.user.create({ data: { email: `iso-a-${suffix}@example.test`, passwordHash: "test", name: "A" } });
    const userB = await prisma.user.create({ data: { email: `iso-b-${suffix}@example.test`, passwordHash: "test", name: "B" } });
    userIds.push(userA.id, userB.id);
    const orgA = await prisma.organization.create({ data: { name: "Org A", slug: `iso-a-${suffix}`, memberships: { create: { userId: userA.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    const orgB = await prisma.organization.create({ data: { name: "Org B", slug: `iso-b-${suffix}`, memberships: { create: { userId: userB.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    orgIds.push(orgA.id, orgB.id);

    const ctxA = { userId: userA.id, organizationId: orgA.id, role: "ORG_OWNER" as const };
    await expect(getOrganizationBySlug(ctxA, orgB.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const ctxAAdmin = { userId: userA.id, organizationId: orgA.id, role: "ORG_ADMIN" as const };
    await expect(listMembers(ctxAAdmin)).resolves.toHaveLength(1);
  });

  it("ORG_ADMIN cannot promote or remove the owner", async () => {
    const owner = await prisma.user.create({ data: { email: `admin-owner-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const admin = await prisma.user.create({ data: { email: `admin-user-${suffix}@example.test`, passwordHash: "test", name: "Admin" } });
    userIds.push(owner.id, admin.id);
    const org = await prisma.organization.create({ data: { name: "Admin Rules", slug: `admin-rules-${suffix}`, memberships: { create: [{ userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() }, { userId: admin.id, role: "ORG_ADMIN", status: "ACTIVE", joinedAt: new Date() }] } } });
    orgIds.push(org.id);
    const ownerMembership = await prisma.membership.findFirstOrThrow({ where: { organizationId: org.id, role: "ORG_OWNER" } });
    const ctxAdmin = { userId: admin.id, organizationId: org.id, role: "ORG_ADMIN" as const };

    await expect(changeMemberRole(ctxAdmin, ownerMembership.id, "TEACHER")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeMember(ctxAdmin, ownerMembership.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ctxA cannot modify membership from orgB", async () => {
    const userA = await prisma.user.create({ data: { email: `cross-a-${suffix}@example.test`, passwordHash: "test", name: "A" } });
    const userB = await prisma.user.create({ data: { email: `cross-b-${suffix}@example.test`, passwordHash: "test", name: "B" } });
    userIds.push(userA.id, userB.id);
    const orgA = await prisma.organization.create({ data: { name: "Cross A", slug: `cross-a-${suffix}`, memberships: { create: { userId: userA.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    const orgB = await prisma.organization.create({ data: { name: "Cross B", slug: `cross-b-${suffix}`, memberships: { create: { userId: userB.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    orgIds.push(orgA.id, orgB.id);
    const memberB = await prisma.membership.findFirstOrThrow({ where: { organizationId: orgB.id } });
    const ctxA = { userId: userA.id, organizationId: orgA.id, role: "ORG_OWNER" as const };

    await expect(changeMemberRole(ctxA, memberB.id, "TEACHER")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(removeMember(ctxA, memberB.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
