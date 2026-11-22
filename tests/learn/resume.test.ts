import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { getResumePosition } from "@/modules/learning/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

async function setup(label: string, lessonCount = 3, enrolled = true) {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: "Resume Course", slug: `${label}-course-${suffix}` } });
  const modules = [];
  const lessons = [];
  for (let moduleIndex = 0; moduleIndex < 2; moduleIndex++) {
    const module = await prisma.module.create({ data: { courseId: course.id, title: `Module ${moduleIndex}`, position: moduleIndex } });
    modules.push(module);
  }
  for (let i = 0; i < lessonCount; i++) {
    const module = i < 2 ? modules[0]! : modules[1]!;
    const lesson = await prisma.lesson.create({ data: { moduleId: module.id, title: `Lesson ${i}`, position: i < 2 ? i : i - 2, contentType: "TEXT", bodyText: "Body" } });
    lessons.push(lesson);
  }
  if (enrolled) await prisma.enrollment.create({ data: { courseId: course.id, studentUserId: user.id, organizationId: org.id, status: "ACTIVE" } });
  orgIds.push(org.id); userIds.push(user.id);
  return { ctx: { userId: user.id, organizationId: org.id, role: "STUDENT" as const }, course, lessons };
}

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("resume position", () => {
  it("no progress returns the first lesson", async () => {
    const s = await setup("resume-first");
    await expect(getResumePosition(s.ctx, s.course.slug)).resolves.toMatchObject({ empty: false, completed: false, lessonId: s.lessons[0]!.id });
  });

  it("completed prefix returns the first incomplete lesson in flattened order", async () => {
    const s = await setup("resume-incomplete");
    await prisma.lessonProgress.create({ data: { lessonId: s.lessons[0]!.id, studentUserId: s.ctx.userId, organizationId: s.ctx.organizationId, state: "COMPLETED", completedAt: new Date() } });
    await expect(getResumePosition(s.ctx, s.course.slug)).resolves.toMatchObject({ lessonId: s.lessons[1]!.id, completed: false });
  });

  it("all lessons completed returns completed true and lastLessonId", async () => {
    const s = await setup("resume-complete");
    for (const lesson of s.lessons) await prisma.lessonProgress.create({ data: { lessonId: lesson.id, studentUserId: s.ctx.userId, organizationId: s.ctx.organizationId, state: "COMPLETED", completedAt: new Date() } });
    await expect(getResumePosition(s.ctx, s.course.slug)).resolves.toMatchObject({ completed: true, lastLessonId: s.lessons[2]!.id });
  });

  it("course with no lessons returns empty", async () => {
    const s = await setup("resume-empty", 0);
    await expect(getResumePosition(s.ctx, s.course.slug)).resolves.toMatchObject({ empty: true, completed: false });
  });

  it("not-enrolled student returns 403", async () => {
    const s = await setup("resume-not-enrolled", 2, false);
    await expect(getResumePosition(s.ctx, s.course.slug)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cross-org course returns 404", async () => {
    const alice = await setup("resume-alice");
    const bob = await setup("resume-bob");
    await expect(getResumePosition(alice.ctx, bob.course.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
