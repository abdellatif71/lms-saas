import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { markLessonCompleted, recordHeartbeat } from "@/modules/learning/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

async function setup(label: string) {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: "Course", slug: `${label}-course-${suffix}` } });
  const module = await prisma.module.create({ data: { courseId: course.id, title: "Module", position: 0 } });
  const lesson = await prisma.lesson.create({ data: { moduleId: module.id, title: "Lesson", position: 0, contentType: "TEXT", bodyText: "Body" } });
  await prisma.enrollment.create({ data: { courseId: course.id, studentUserId: user.id, organizationId: org.id, status: "ACTIVE" } });
  orgIds.push(org.id); userIds.push(user.id);
  return { ctx: { userId: user.id, organizationId: org.id, role: "STUDENT" as const }, course, lesson };
}

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("learning completion anti-cheat", () => {
  it("cannot complete without prior STARTED or HEARTBEAT", async () => {
    const s = await setup("complete-no-activity");
    await expect(markLessonCompleted(s.ctx, { lessonId: s.lesson.id })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("complete after heartbeat works and sets LessonProgress COMPLETED", async () => {
    const s = await setup("complete-after-heartbeat");
    await recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_HEARTBEAT", durationMs: 30000 });
    const progress = await markLessonCompleted(s.ctx, { lessonId: s.lesson.id });
    expect(progress.state).toBe("COMPLETED");
    expect(progress.completedAt).not.toBeNull();
  });

  it("complete twice is idempotent with no duplicate COMPLETED event", async () => {
    const s = await setup("complete-twice");
    await recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_STARTED" });
    await markLessonCompleted(s.ctx, { lessonId: s.lesson.id });
    await markLessonCompleted(s.ctx, { lessonId: s.lesson.id });
    const completedEvents = await prisma.learningEvent.count({ where: { userId: s.ctx.userId, lessonId: s.lesson.id, type: "LESSON_COMPLETED" } });
    expect(completedEvents).toBe(1);
  });

  it("writes LESSON.COMPLETED audit log", async () => {
    const s = await setup("complete-audit");
    await recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_STARTED" });
    await markLessonCompleted(s.ctx, { lessonId: s.lesson.id });
    await expect(prisma.auditLog.findFirst({ where: { actorId: s.ctx.userId, action: "LESSON.COMPLETED", targetId: s.lesson.id } })).resolves.not.toBeNull();
  });
});
