import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { getLessonProgress, markLessonCompleted, recordHeartbeat } from "@/modules/learning/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

async function setup(label: string, role: "STUDENT" | "TEACHER" = "STUDENT", enrolled = true) {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role, status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: "Course", slug: `${label}-course-${suffix}` } });
  const module = await prisma.module.create({ data: { courseId: course.id, title: "Module", position: 0 } });
  const lesson = await prisma.lesson.create({ data: { moduleId: module.id, title: "Lesson", position: 0, contentType: "TEXT", bodyText: "Body" } });
  if (role === "STUDENT" && enrolled) await prisma.enrollment.create({ data: { courseId: course.id, studentUserId: user.id, organizationId: org.id, status: "ACTIVE" } });
  orgIds.push(org.id); userIds.push(user.id);
  return { ctx: { userId: user.id, organizationId: org.id, role } as const, course, lesson };
}

describe("learning permissions", () => {
  it("enrolled STUDENT can heartbeat, complete, and read own progress", async () => {
    const s = await setup("permission-student");
    await recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_STARTED" });
    await expect(markLessonCompleted(s.ctx, { lessonId: s.lesson.id })).resolves.toMatchObject({ state: "COMPLETED" });
    await expect(getLessonProgress(s.ctx, s.lesson.id)).resolves.toMatchObject({ status: "COMPLETED" });
  });

  it("STUDENT not enrolled cannot heartbeat or read progress", async () => {
    const s = await setup("permission-not-enrolled", "STUDENT", false);
    await expect(recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_STARTED" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getLessonProgress(s.ctx, s.lesson.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("TEACHER+ can read progress but cannot heartbeat or complete", async () => {
    const s = await setup("permission-teacher", "TEACHER");
    await expect(getLessonProgress(s.ctx, s.lesson.id)).resolves.toBeTruthy();
    await expect(recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_STARTED" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(markLessonCompleted(s.ctx, { lessonId: s.lesson.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cross-org teacher cannot read progress", async () => {
    const alice = await setup("permission-cross-a", "TEACHER");
    const bob = await setup("permission-cross-b", "TEACHER");
    await expect(getLessonProgress(alice.ctx, bob.lesson.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
