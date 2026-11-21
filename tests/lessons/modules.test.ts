import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { createModule, deleteModule, reorderModule } from "@/modules/lessons/modules";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

async function setup(label: string, role: "ORG_OWNER" | "TEACHER" = "TEACHER") {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role, status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: `${label} Course`, slug: `${label}-course-${suffix}` } });
  userIds.push(user.id); orgIds.push(org.id);
  return { ctx: { userId: user.id, organizationId: org.id, role } as const, org, course };
}

describe("module hierarchy", () => {
  it("TEACHER creates module and position auto-increments", async () => {
    const { ctx, course } = await setup("module-create", "TEACHER");
    const a = await createModule(ctx, course.slug, { title: "First" });
    const b = await createModule(ctx, course.slug, { title: "Second" });
    expect(a.position).toBe(0); expect(b.position).toBe(1);
  });

  it("reorder shifts siblings correctly", async () => {
    const { ctx, course } = await setup("module-reorder", "ORG_OWNER");
    const a = await createModule(ctx, course.slug, { title: "A" });
    const b = await createModule(ctx, course.slug, { title: "B" });
    const c = await createModule(ctx, course.slug, { title: "C" });
    await reorderModule(ctx, course.slug, c.id, 0);
    const modules = await prisma.module.findMany({ where: { courseId: course.id }, orderBy: { position: "asc" } });
    expect(modules.map((m) => m.id)).toEqual([c.id, a.id, b.id]);
  });

  it("delete empty module works", async () => {
    const { ctx, course } = await setup("module-empty", "ORG_OWNER");
    const module = await createModule(ctx, course.slug, { title: "Empty" });
    await expect(deleteModule(ctx, course.slug, module.id)).resolves.toBeUndefined();
  });

  it("delete module with lessons fails 409", async () => {
    const { ctx, course } = await setup("module-lessons", "ORG_OWNER");
    const module = await createModule(ctx, course.slug, { title: "Has lessons" });
    await prisma.lesson.create({ data: { moduleId: module.id, title: "Lesson", position: 0, contentType: "TEXT", bodyText: "Body" } });
    await expect(deleteModule(ctx, course.slug, module.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("cross-org module access returns 404", async () => {
    const alice = await setup("module-alice", "ORG_OWNER");
    const bob = await setup("module-bob", "ORG_OWNER");
    const bobModule = await createModule(bob.ctx, bob.course.slug, { title: "Bob module" });
    await expect(updateModuleAlias(alice.ctx, bob.course.slug, bobModule.id, { title: "Stolen" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

import { updateModule as updateModuleAlias } from "@/modules/lessons/modules";
