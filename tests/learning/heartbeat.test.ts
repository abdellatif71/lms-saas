import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { recordHeartbeat } from "@/modules/learning/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

async function setup(label: string, role: "STUDENT" | "TEACHER" = "STUDENT") {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role, status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: "Learning", slug: `${label}-course-${suffix}`, status: "PUBLISHED" } });
  const module = await prisma.module.create({ data: { courseId: course.id, title: "Module", position: 0 } });
  const lesson = await prisma.lesson.create({ data: { moduleId: module.id, title: "Lesson", position: 0, contentType: "TEXT", bodyText: "Body" } });
  if (role === "STUDENT") await prisma.enrollment.create({ data: { courseId: course.id, studentUserId: user.id, organizationId: org.id, status: "ACTIVE" } });
  orgIds.push(org.id); userIds.push(user.id);
  return { ctx: { userId: user.id, organizationId: org.id, role } as const, org, course, lesson };
}

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("heartbeat ingestion", () => {
  it("enrolled student can send LESSON_STARTED", async () => {
    const s = await setup("heartbeat-start");
    await expect(recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_STARTED" })).resolves.toEqual({ ok: true });
  });

  it("enrolled student can send LESSON_HEARTBEAT with durationMs=30000", async () => {
    const s = await setup("heartbeat-valid");
    await expect(recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_HEARTBEAT", durationMs: 30000 })).resolves.toEqual({ ok: true });
  });

  it("heartbeat with durationMs < 30000 is rejected", async () => {
    const s = await setup("heartbeat-spam");
    await expect(recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_HEARTBEAT", durationMs: 29999 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("non-enrolled student is rejected", async () => {
    const s = await setup("heartbeat-none");
    await prisma.enrollment.deleteMany({ where: { courseId: s.course.id, studentUserId: s.ctx.userId } });
    await expect(recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_STARTED" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("teacher cannot send heartbeat", async () => {
    const s = await setup("heartbeat-teacher", "TEACHER");
    await expect(recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_STARTED" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("soft-deleted lesson rejects heartbeat", async () => {
    const s = await setup("heartbeat-deleted");
    await prisma.lesson.update({ where: { id: s.lesson.id }, data: { deletedAt: new Date() } });
    await expect(recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_STARTED" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("bucket is upserted and increments on the second heartbeat", async () => {
    const s = await setup("heartbeat-bucket");
    await recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_HEARTBEAT", durationMs: 30000 });
    await recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_HEARTBEAT", durationMs: 30000 });
    const bucket = await prisma.learningTimeBucket.findFirst({ where: { userId: s.ctx.userId, lessonId: s.lesson.id } });
    expect(bucket?.totalMs).toBe(60000);
    expect(bucket?.eventCount).toBe(2);
  });
});
