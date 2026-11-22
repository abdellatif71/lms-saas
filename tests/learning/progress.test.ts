import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { getLessonProgress, getCourseProgress, markLessonCompleted, recordHeartbeat } from "@/modules/learning/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

async function setup(label: string) {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: "Course", slug: `${label}-course-${suffix}` } });
  const module = await prisma.module.create({ data: { courseId: course.id, title: "Module", position: 0 } });
  const lessonA = await prisma.lesson.create({ data: { moduleId: module.id, title: "A", position: 0, contentType: "TEXT", bodyText: "A" } });
  const lessonB = await prisma.lesson.create({ data: { moduleId: module.id, title: "B", position: 1, contentType: "TEXT", bodyText: "B" } });
  await prisma.enrollment.create({ data: { courseId: course.id, studentUserId: user.id, organizationId: org.id, status: "ACTIVE" } });
  orgIds.push(org.id); userIds.push(user.id);
  return { ctx: { userId: user.id, organizationId: org.id, role: "STUDENT" as const }, org, course, lessonA, lessonB };
}

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("learning progress", () => {
  it("getLessonProgress returns bucket time and heartbeat count", async () => {
    const s = await setup("progress-lesson");
    await recordHeartbeat(s.ctx, { lessonId: s.lessonA.id, type: "LESSON_HEARTBEAT", durationMs: 30000 });
    await recordHeartbeat(s.ctx, { lessonId: s.lessonA.id, type: "LESSON_HEARTBEAT", durationMs: 30000 });
    const progress = await getLessonProgress(s.ctx, s.lessonA.id);
    expect(progress.totalTimeMs).toBe(60000);
    expect(progress.heartbeatCount).toBe(2);
  }, 15000);

  it("getCourseProgress returns completedLessons / totalLessons percentage", async () => {
    const s = await setup("progress-course");
    await recordHeartbeat(s.ctx, { lessonId: s.lessonA.id, type: "LESSON_STARTED" });
    await markLessonCompleted(s.ctx, { lessonId: s.lessonA.id });
    const progress = await getCourseProgress(s.ctx, s.course.slug);
    expect(progress.completedLessons).toBe(1);
    expect(progress.totalLessons).toBe(2);
    expect(progress.percentage).toBe(50);
  });

  it("soft-deleted lessons are excluded from totalLessons", async () => {
    const s = await setup("progress-deleted");
    await prisma.lesson.update({ where: { id: s.lessonB.id }, data: { deletedAt: new Date() } });
    const progress = await getCourseProgress(s.ctx, s.course.slug);
    expect(progress.totalLessons).toBe(1);
  });

  it("cross-org progress access returns 404", async () => {
    const alice = await setup("progress-alice");
    const bob = await setup("progress-bob");
    await expect(getLessonProgress(alice.ctx, bob.lessonA.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
