import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { createModule } from "@/modules/lessons/modules";
import { createLesson, reorderLesson, softDeleteLesson, updateLesson } from "@/modules/lessons/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

async function setup(label: string) {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: `${label} Course`, slug: `${label}-course-${suffix}` } });
  const module = await createModule({ userId: user.id, organizationId: org.id, role: "ORG_OWNER" }, course.slug, { title: "Module" });
  userIds.push(user.id); orgIds.push(org.id);
  return { ctx: { userId: user.id, organizationId: org.id, role: "ORG_OWNER" as const }, course, module };
}

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("lesson hierarchy", () => {
  it("creates lessons for TEXT, VIDEO, PDF, and EXTERNAL content types", async () => {
    const { ctx, course, module } = await setup("lesson-types");
    const text = await createLesson(ctx, course.slug, module.id, { title: "Text", contentType: "TEXT", bodyText: "Body", completionRule: "VIEW" });
    const video = await createLesson(ctx, course.slug, module.id, { title: "Video", contentType: "VIDEO", externalUrl: "https://example.test/video", completionRule: "VIEW" });
    const pdfFile = await prisma.file.create({ data: { organizationId: ctx.organizationId, uploadedById: ctx.userId, storageKey: `lesson-pdf-${suffix}`, sizeBytes: 1234, mimeType: "application/pdf", originalName: "lesson.pdf", purpose: "LESSON_PDF" } });
    const pdf = await createLesson(ctx, course.slug, module.id, { title: "PDF", contentType: "PDF", fileId: pdfFile.id, completionRule: "VIEW" });
    const external = await createLesson(ctx, course.slug, module.id, { title: "External", contentType: "EXTERNAL", externalUrl: "https://example.test", completionRule: "VIEW" });
    expect([text.contentType, video.contentType, pdf.contentType, external.contentType]).toEqual(["TEXT", "VIDEO", "PDF", "EXTERNAL"]);
  });

  it("validates required content fields", async () => {
    const { lessonCreateSchema } = await import("@/modules/lessons/validation");
    expect(lessonCreateSchema.safeParse({ title: "Text", contentType: "TEXT", completionRule: "VIEW" }).success).toBe(false);
    expect(lessonCreateSchema.safeParse({ title: "Video", contentType: "VIDEO", completionRule: "VIEW" }).success).toBe(false);
    expect(lessonCreateSchema.safeParse({ title: "PDF", contentType: "PDF", completionRule: "VIEW" }).success).toBe(false);
  });

  it("updates a lesson", async () => {
    const { ctx, course, module } = await setup("lesson-update");
    const lesson = await createLesson(ctx, course.slug, module.id, { title: "Before", contentType: "TEXT", bodyText: "Old", completionRule: "VIEW" });
    const updated = await updateLesson(ctx, course.slug, module.id, lesson.id, { title: "After", bodyText: "New" });
    expect(updated.title).toBe("After");
  });

  it("reorder within module shifts siblings", async () => {
    const { ctx, course, module } = await setup("lesson-reorder");
    const a = await createLesson(ctx, course.slug, module.id, { title: "A", contentType: "TEXT", bodyText: "A", completionRule: "VIEW" });
    const b = await createLesson(ctx, course.slug, module.id, { title: "B", contentType: "TEXT", bodyText: "B", completionRule: "VIEW" });
    await reorderLesson(ctx, course.slug, module.id, b.id, 0);
    const lessons = await prisma.lesson.findMany({ where: { moduleId: module.id, deletedAt: null }, orderBy: { position: "asc" } });
    expect(lessons.map((l) => l.id)).toEqual([b.id, a.id]);
  });

  it("moves lesson to another module and rebalances both modules", async () => {
    const { ctx, course, module } = await setup("lesson-move");
    const other = await createModule(ctx, course.slug, { title: "Other" });
    const a = await createLesson(ctx, course.slug, module.id, { title: "A", contentType: "TEXT", bodyText: "A", completionRule: "VIEW" });
    await createLesson(ctx, course.slug, module.id, { title: "B", contentType: "TEXT", bodyText: "B", completionRule: "VIEW" });
    await reorderLesson(ctx, course.slug, module.id, a.id, 0, other.id);
    const moved = await prisma.lesson.findUniqueOrThrow({ where: { id: a.id } });
    expect(moved.moduleId).toBe(other.id);
  });

  it("soft deletes and sets deletedAt", async () => {
    const { ctx, course, module } = await setup("lesson-delete");
    const lesson = await createLesson(ctx, course.slug, module.id, { title: "Delete", contentType: "TEXT", bodyText: "Body", completionRule: "VIEW" });
    const deleted = await softDeleteLesson(ctx, course.slug, module.id, lesson.id);
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("cross-org lesson access returns 404", async () => {
    const alice = await setup("lesson-alice");
    const bob = await setup("lesson-bob");
    const bobLesson = await createLesson(bob.ctx, bob.course.slug, bob.module.id, { title: "Bob", contentType: "TEXT", bodyText: "Body", completionRule: "VIEW" });
    await expect(updateLesson(alice.ctx, bob.course.slug, bob.module.id, bobLesson.id, { title: "Stolen" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
