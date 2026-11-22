import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { assertTeacherOrAbove, type AuthContext } from "@/modules/auth/permissions";
import { MemberRole } from "@/generated/prisma/enums";
import type { z } from "zod";
import type { heartbeatSchema, completeLessonSchema } from "./validation";

function utcBucketDate(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function getLessonInOrg(ctx: AuthContext, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null, module: { course: { organizationId: ctx.organizationId, deletedAt: null } } },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new NotFoundError("Lesson not found");
  return lesson;
}

async function assertStudentEnrollment(ctx: AuthContext, courseId: string) {
  if (ctx.role !== MemberRole.STUDENT) throw new ForbiddenError("Only students can send learning events");
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, studentUserId: ctx.userId, organizationId: ctx.organizationId, status: "ACTIVE" },
  });
  if (!enrollment) throw new ForbiddenError("Student is not enrolled in this course");
}

async function assertReadAccess(ctx: AuthContext, lessonId: string) {
  const lesson = await getLessonInOrg(ctx, lessonId);
  if (ctx.role === MemberRole.STUDENT) await assertStudentEnrollment(ctx, lesson.module.courseId);
  else assertTeacherOrAbove(ctx);
  return lesson;
}

export async function recordHeartbeat(ctx: AuthContext, input: z.infer<typeof heartbeatSchema>) {
  const lesson = await getLessonInOrg(ctx, input.lessonId);
  await assertStudentEnrollment(ctx, lesson.module.courseId);

  if (input.type === "LESSON_HEARTBEAT") {
    if (input.durationMs === undefined) throw new ValidationError("durationMs is required for heartbeat", { durationMs: ["Required"] });
    if (input.durationMs < 30_000) throw new ValidationError("Heartbeat interval must be at least 30000ms", { durationMs: ["Too short"] });
  }

  const bucketDate = utcBucketDate();
  await prisma.$transaction(async (tx) => {
    await tx.learningEvent.create({
      data: {
        userId: ctx.userId,
        lessonId: lesson.id,
        type: input.type,
        ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
        ...(input.clientTimestamp ? { metadata: { clientTimestamp: input.clientTimestamp } } : {}),
      },
    });
    if (input.type === "LESSON_HEARTBEAT") {
      await tx.learningTimeBucket.upsert({
        where: { userId_lessonId_bucketDate: { userId: ctx.userId, lessonId: lesson.id, bucketDate } },
        create: { userId: ctx.userId, lessonId: lesson.id, bucketDate, totalMs: input.durationMs!, eventCount: 1 },
        update: { totalMs: { increment: input.durationMs! }, eventCount: { increment: 1 } },
      });
    }
  });

  await audit({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    action: "LEARNING.HEARTBEAT_BATCH",
    targetType: "Lesson",
    targetId: lesson.id,
    metadata: { type: input.type, durationMs: input.durationMs ?? 0 },
  });
  return { ok: true };
}

export async function markLessonCompleted(ctx: AuthContext, input: z.infer<typeof completeLessonSchema>) {
  const lesson = await getLessonInOrg(ctx, input.lessonId);
  await assertStudentEnrollment(ctx, lesson.module.courseId);

  const existing = await prisma.lessonProgress.findUnique({
    where: { lessonId_studentUserId: { lessonId: lesson.id, studentUserId: ctx.userId } },
  });
  if (existing?.state === "COMPLETED") return existing;

  const activity = await prisma.learningEvent.findFirst({
    where: { userId: ctx.userId, lessonId: lesson.id, type: { in: ["LESSON_STARTED", "LESSON_HEARTBEAT"] } },
  });
  if (!activity) throw new ConflictError("Cannot complete lesson without prior learning activity");

  await prisma.learningEvent.create({ data: { userId: ctx.userId, lessonId: lesson.id, type: "LESSON_COMPLETED" } });
  const progress = await prisma.lessonProgress.upsert({
    where: { lessonId_studentUserId: { lessonId: lesson.id, studentUserId: ctx.userId } },
    create: { lessonId: lesson.id, studentUserId: ctx.userId, organizationId: ctx.organizationId, state: "COMPLETED", completedAt: new Date() },
    update: { state: "COMPLETED", completedAt: new Date(), organizationId: ctx.organizationId },
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "LESSON.COMPLETED", targetType: "Lesson", targetId: lesson.id });
  return progress;
}

export async function getLessonProgress(ctx: AuthContext, lessonId: string) {
  const lesson = await assertReadAccess(ctx, lessonId);
  const [progress, buckets, heartbeatCount, last] = await Promise.all([
    prisma.lessonProgress.findUnique({ where: { lessonId_studentUserId: { lessonId: lesson.id, studentUserId: ctx.userId } } }),
    prisma.learningTimeBucket.findMany({ where: { userId: ctx.userId, lessonId: lesson.id }, select: { totalMs: true } }),
    prisma.learningEvent.count({ where: { userId: ctx.userId, lessonId: lesson.id, type: "LESSON_HEARTBEAT" } }),
    prisma.learningEvent.findFirst({ where: { userId: ctx.userId, lessonId: lesson.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  return {
    status: progress?.state ?? "NOT_STARTED",
    completedAt: progress?.completedAt ?? null,
    totalTimeMs: buckets.reduce((sum, bucket) => sum + bucket.totalMs, 0),
    heartbeatCount,
    lastActivityAt: last?.createdAt ?? null,
  };
}

export async function getResumePosition(ctx: AuthContext, courseSlug: string) {
  if (ctx.role !== MemberRole.STUDENT) throw new ForbiddenError("Only students can resume a course");
  const course = await prisma.course.findFirst({
    where: {
      organizationId: ctx.organizationId,
      slug: courseSlug,
      deletedAt: null,
    },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { where: { deletedAt: null }, orderBy: { position: "asc" } } },
      },
    },
  });
  if (!course) throw new NotFoundError("Course not found or not enrolled");
  const enrollment = await prisma.enrollment.findFirst({ where: { courseId: course.id, studentUserId: ctx.userId, organizationId: ctx.organizationId, status: "ACTIVE" } });
  if (!enrollment) throw new ForbiddenError("Student is not enrolled in this course");

  const lessons = course.modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id })));
  if (lessons.length === 0) return { empty: true, completed: false, lessonId: null, moduleId: null, lastLessonId: null };

  const progress = await prisma.lessonProgress.findMany({
    where: { studentUserId: ctx.userId, lessonId: { in: lessons.map((lesson) => lesson.id) }, state: "COMPLETED" },
    select: { lessonId: true },
  });
  const completedIds = new Set(progress.map((row) => row.lessonId));
  const next = lessons.find((lesson) => !completedIds.has(lesson.id));
  if (next) return { empty: false, completed: false, lessonId: next.id, moduleId: next.moduleId, lastLessonId: null };

  const last = lessons.at(-1)!;
  return { empty: false, completed: true, lessonId: null, moduleId: null, lastLessonId: last.id };
}

export async function getCourseProgress(ctx: AuthContext, courseSlug: string) {
  let course;
  if (ctx.role === MemberRole.STUDENT) {
    course = await prisma.course.findFirst({
      where: { slug: courseSlug, organizationId: ctx.organizationId, deletedAt: null, enrollments: { some: { studentUserId: ctx.userId, status: "ACTIVE" } } },
      include: { modules: { include: { lessons: { where: { deletedAt: null }, orderBy: { position: "asc" } } } } },
    });
  } else {
    assertTeacherOrAbove(ctx);
    course = await prisma.course.findFirst({
      where: { slug: courseSlug, organizationId: ctx.organizationId, deletedAt: null },
      include: { modules: { include: { lessons: { where: { deletedAt: null }, orderBy: { position: "asc" } } } } },
    });
  }
  if (!course) throw new NotFoundError("Course not found");

  const lessons = course.modules.flatMap((module) => module.lessons);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const [progressRows, buckets] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { studentUserId: ctx.userId, lessonId: { in: lessonIds }, state: "COMPLETED" }, select: { lessonId: true, completedAt: true } }),
    prisma.learningTimeBucket.findMany({ where: { userId: ctx.userId, lessonId: { in: lessonIds } }, select: { lessonId: true, totalMs: true } }),
  ]);
  const completedIds = new Set(progressRows.map((row) => row.lessonId));
  const perLesson = lessons.map((lesson) => ({
    lessonId: lesson.id,
    status: completedIds.has(lesson.id) ? "COMPLETED" : "NOT_STARTED",
    completedAt: progressRows.find((row) => row.lessonId === lesson.id)?.completedAt ?? null,
    totalTimeMs: buckets.filter((bucket) => bucket.lessonId === lesson.id).reduce((sum, bucket) => sum + bucket.totalMs, 0),
  }));
  const completedLessons = perLesson.filter((lesson) => lesson.status === "COMPLETED").length;
  const totalLessons = perLesson.length;
  return {
    completedLessons,
    totalLessons,
    percentage: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
    totalTimeMs: buckets.reduce((sum, bucket) => sum + bucket.totalMs, 0),
    lessons: perLesson,
  };
}
