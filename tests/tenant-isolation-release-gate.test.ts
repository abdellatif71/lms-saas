import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { auth } from "@/lib/auth";
import { requireOrgContext } from "@/lib/auth/context";
import { getOrganizationBySlug, updateOrganization } from "@/modules/organizations/service";
import { changeMemberRole, listMembers, removeMember, suspendMember } from "@/modules/organizations/membership";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];
let orgAId = "";
let orgBId = "";
let aliceId = "";
let bobId = "";
let bobMembershipId = "";
let ctxA: { userId: string; organizationId: string; role: "ORG_OWNER"; isSuperAdmin: boolean };

beforeAll(async () => {
  const alice = await prisma.user.create({ data: { email: `release-alice-${suffix}@example.test`, passwordHash: "test", name: "Alice" } });
  const bob = await prisma.user.create({ data: { email: `release-bob-${suffix}@example.test`, passwordHash: "test", name: "Bob" } });
  const superAdmin = await prisma.user.create({ data: { email: `release-super-${suffix}@example.test`, passwordHash: "test", name: "Super", isSuperAdmin: true } });
  aliceId = alice.id;
  bobId = bob.id;
  userIds.push(alice.id, bob.id, superAdmin.id);

  const orgA = await prisma.organization.create({ data: { name: "Release A", slug: `release-a-${suffix}`, memberships: { create: { userId: alice.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
  const orgB = await prisma.organization.create({ data: { name: "Release B", slug: `release-b-${suffix}`, memberships: { create: { userId: bob.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
  orgAId = orgA.id;
  orgBId = orgB.id;
  orgIds.push(orgA.id, orgB.id);
  bobMembershipId = (await prisma.membership.findFirstOrThrow({ where: { organizationId: orgB.id } })).id;
  ctxA = { userId: aliceId, organizationId: orgAId, role: "ORG_OWNER", isSuperAdmin: false };
});

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("tenant isolation release gate", () => {
  it("blocks organization slug reads and updates across tenants", async () => {
    await expect(getOrganizationBySlug(ctxA, `release-b-${suffix}`)).rejects.toBeTruthy();
    await expect(updateOrganization(ctxA, `release-b-${suffix}`, { name: "Hacked" })).rejects.toBeTruthy();
  });

  it("lists only organization A members", async () => {
    const members = await listMembers(ctxA);
    expect(members.map((m) => m.userId)).not.toContain(bobId);
    expect(members.every((m) => m.organizationId === orgAId)).toBe(true);
  });

  it("blocks cross-org role, suspend, and remove mutations", async () => {
    await expect(changeMemberRole(ctxA, bobMembershipId, "TEACHER")).rejects.toBeTruthy();
    await expect(suspendMember(ctxA, bobMembershipId)).rejects.toBeTruthy();
    await expect(removeMember(ctxA, bobMembershipId)).rejects.toBeTruthy();
  });

  it("requireOrgContext fails closed for Alice against org B", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: aliceId } } as never);
    await expect(requireOrgContext(`release-b-${suffix}`)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("SUPER_ADMIN without org membership cannot access org A", async () => {
    const superAdmin = await prisma.user.findFirstOrThrow({ where: { isSuperAdmin: true, email: { startsWith: `release-super-${suffix}` } } });
    vi.mocked(auth).mockResolvedValue({ user: { id: superAdmin.id } } as never);
    await expect(requireOrgContext(`release-a-${suffix}`)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
