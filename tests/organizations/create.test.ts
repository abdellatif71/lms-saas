import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { createOrganization } from "@/modules/organizations/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("organization creation", () => {
  it("creates an organization, owner membership, and suffixed slug collision", async () => {
    const owner = await prisma.user.create({ data: { email: `org-owner-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    userIds.push(owner.id);

    const first = await createOrganization(owner.id, { name: "Acme School", slug: `acme-${suffix}` });
    orgIds.push(first.id);
    const membership = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: owner.id, organizationId: first.id } } });
    expect(membership?.role).toBe("ORG_OWNER");

    await createOrganization(owner.id, { name: "Second Org", slug: `acme-${suffix}` }).then((org) => {
      orgIds.push(org.id);
      expect(org.slug).not.toBe(`acme-${suffix}`);
    });
  });

  it("rejects an invalid slug format", async () => {
    const owner = await prisma.user.create({ data: { email: `org-invalid-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    userIds.push(owner.id);
    await expect(createOrganization(owner.id, { name: "Invalid", slug: "Bad Slug" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
