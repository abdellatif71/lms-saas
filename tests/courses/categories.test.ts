import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { getEmailProvider } from "@/lib/email";
import { createCategory, deleteCategory, updateCategory } from "@/modules/courses/categories";
import { createCourse } from "@/modules/courses/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

beforeAll(() => vi.spyOn(getEmailProvider(), "send").mockResolvedValue(undefined));
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("category CRUD", () => {
  it("creates a category", async () => {
    const owner = await prisma.user.create({ data: { email: `cat-owner-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const org = await prisma.organization.create({ data: { name: "Cat Org", slug: `cat-org-${suffix}`, memberships: { create: { userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(owner.id); orgIds.push(org.id);
    const ctx = { userId: owner.id, organizationId: org.id, role: "ORG_OWNER" as const };
    const category = await createCategory(ctx, { name: "Science", slug: `science-${suffix}` });
    expect(category.organizationId).toBe(org.id);
  });

  it("rejects duplicate category slugs", async () => {
    const owner = await prisma.user.create({ data: { email: `cat-dupe-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const org = await prisma.organization.create({ data: { name: "Dupe Org", slug: `cat-dupe-org-${suffix}`, memberships: { create: { userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(owner.id); orgIds.push(org.id);
    const ctx = { userId: owner.id, organizationId: org.id, role: "ORG_OWNER" as const };
    await createCategory(ctx, { name: "Math", slug: `math-${suffix}` });
    await expect(createCategory(ctx, { name: "Other", slug: `math-${suffix}` })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("updates and deletes an empty category", async () => {
    const owner = await prisma.user.create({ data: { email: `cat-empty-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const org = await prisma.organization.create({ data: { name: "Empty Org", slug: `cat-empty-org-${suffix}`, memberships: { create: { userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(owner.id); orgIds.push(org.id);
    const ctx = { userId: owner.id, organizationId: org.id, role: "ORG_OWNER" as const };
    const category = await createCategory(ctx, { name: "History", slug: `history-${suffix}` });
    await expect(updateCategory(ctx, category.id, { name: "World History" })).resolves.toMatchObject({ name: "World History" });
    await expect(deleteCategory(ctx, category.id)).resolves.toBeUndefined();
  });

  it("rejects deleting a category referenced by an active course", async () => {
    const owner = await prisma.user.create({ data: { email: `cat-course-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const org = await prisma.organization.create({ data: { name: "Course Cat Org", slug: `cat-course-org-${suffix}`, memberships: { create: { userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(owner.id); orgIds.push(org.id);
    const ctx = { userId: owner.id, organizationId: org.id, role: "ORG_OWNER" as const };
    const category = await createCategory(ctx, { name: "Programming", slug: `programming-${suffix}` });
    await createCourse(ctx, { title: "TypeScript", categoryId: category.id, visibility: "ORG", enrollmentRule: "OPEN" });
    await expect(deleteCategory(ctx, category.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("returns 404 for cross-org category access", async () => {
    const alice = await prisma.user.create({ data: { email: `cat-alice-${suffix}@example.test`, passwordHash: "test", name: "Alice" } });
    const bob = await prisma.user.create({ data: { email: `cat-bob-${suffix}@example.test`, passwordHash: "test", name: "Bob" } });
    const orgA = await prisma.organization.create({ data: { name: "Cat A", slug: `cat-a-${suffix}`, memberships: { create: { userId: alice.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    const orgB = await prisma.organization.create({ data: { name: "Cat B", slug: `cat-b-${suffix}`, memberships: { create: { userId: bob.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(alice.id, bob.id); orgIds.push(orgA.id, orgB.id);
    const catB = await prisma.category.create({ data: { organizationId: orgB.id, name: "Bob Category", slug: `bob-cat-${suffix}` } });
    const ctxA = { userId: alice.id, organizationId: orgA.id, role: "ORG_OWNER" as const };
    await expect(updateCategory(ctxA, catB.id, { name: "Stolen" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteCategory(ctxA, catB.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
