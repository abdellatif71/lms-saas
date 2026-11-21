import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/client";
import { tenantPrisma } from "@/lib/db/tenant";
import { MemberRole } from "@/generated/prisma/enums";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let orgAId = "";
let orgBId = "";
let invitationAId = "";
let invitationBId = "";
let createdInvitationId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({
    data: { name: "Tenant A", slug: `tenant-a-${suffix}` },
  });
  const orgB = await prisma.organization.create({
    data: { name: "Tenant B", slug: `tenant-b-${suffix}` },
  });
  orgAId = orgA.id;
  orgBId = orgB.id;

  const userA = await prisma.user.create({
    data: { email: `tenant-a-${suffix}@example.test`, passwordHash: "test", name: "Tenant A User" },
  });
  const userB = await prisma.user.create({
    data: { email: `tenant-b-${suffix}@example.test`, passwordHash: "test", name: "Tenant B User" },
  });

  const invitationA = await prisma.invitation.create({
    data: {
      organizationId: orgAId,
      email: `invite-a-${suffix}@example.test`,
      role: MemberRole.TEACHER,
      tokenHash: `invite-a-${suffix}`,
      invitedById: userA.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const invitationB = await prisma.invitation.create({
    data: {
      organizationId: orgBId,
      email: `invite-b-${suffix}@example.test`,
      role: MemberRole.TEACHER,
      tokenHash: `invite-b-${suffix}`,
      invitedById: userB.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  invitationAId = invitationA.id;
  invitationBId = invitationB.id;
});

afterAll(async () => {
  await prisma.invitation.deleteMany({
    where: { id: { in: [invitationAId, invitationBId, createdInvitationId].filter(Boolean) } },
  });
  await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId].filter(Boolean) } } });
  await prisma.user.deleteMany({
    where: { email: { endsWith: `-${suffix}@example.test` } },
  });
  await prisma.$disconnect();
});

describe("tenant isolation", () => {
  it("returns only invitations belonging to each organization", async () => {
    const invitationsA = await tenantPrisma(orgAId).invitation.findMany();
    const invitationsB = await tenantPrisma(orgBId).invitation.findMany();

    expect(invitationsA.map(({ id }) => id)).toEqual([invitationAId]);
    expect(invitationsB.map(({ id }) => id)).toEqual([invitationBId]);
  });

  it("injects organizationId when creating a tenant invitation", async () => {
    const invitation = await tenantPrisma(orgAId).invitation.create({
      // @ts-expect-error organizationId is intentionally omitted to verify tenant injection.
      data: {
        email: `created-a-${suffix}@example.test`,
        role: MemberRole.STUDENT,
        tokenHash: `created-a-${suffix}`,
        invitedById: (await prisma.user.findFirstOrThrow({ where: { email: { startsWith: `tenant-a-${suffix}` } } })).id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Set expiration time
      },
    });

    createdInvitationId = invitation.id;
    expect(invitation.organizationId).toBe(orgAId);
  });
});
