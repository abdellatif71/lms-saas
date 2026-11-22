import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { aggregateDailyBuckets } from "@/modules/learning/aggregation";
import { recordHeartbeat } from "@/modules/learning/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

async function setup(label: string) {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: "Course", slug: `${label}-course-${suffix}` } });
  const module = await prisma.module.create({ data: { courseId: course.id, title: "Module", position: 0 } });
  const lesson = await prisma.lesson.create({ data: { moduleId: module.id, title: "Lesson", position: 0, contentType: "TEXT", bodyText: "Body" } });
  await prisma.enrollment.create({ data: { courseId: course.id, studentUserId: user.id, organizationId: org.id, status: "ACTIVE" } });
  orgIds.push(org.id); userIds.push(user.id);
  return { ctx: { userId: user.id, organizationId: org.id, role: "STUDENT" as const }, lesson };
}

describe("daily learning aggregation", () => {
  it("aggregateDailyBuckets recomputes a bucket from raw heartbeat events", async () => {
    const s = await setup("aggregation-recompute");
    await recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_HEARTBEAT", durationMs: 30000 });
    await recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_HEARTBEAT", durationMs: 45000 });
    await aggregateDailyBuckets(new Date());
    const bucket = await prisma.learningTimeBucket.findFirst({ where: { userId: s.ctx.userId, lessonId: s.lesson.id } });
    expect(bucket?.totalMs).toBe(75000);
    expect(bucket?.eventCount).toBe(2);
  });

  it("running aggregation twice is idempotent", async () => {
    const s = await setup("aggregation-idempotent");
    await recordHeartbeat(s.ctx, { lessonId: s.lesson.id, type: "LESSON_HEARTBEAT", durationMs: 30000 });
    await aggregateDailyBuckets(new Date());
    await aggregateDailyBuckets(new Date());
    const buckets = await prisma.learningTimeBucket.findMany({ where: { userId: s.ctx.userId, lessonId: s.lesson.id } });
    expect(buckets).toHaveLength(1);
    expect(buckets[0]?.totalMs).toBe(30000);
  });
});
