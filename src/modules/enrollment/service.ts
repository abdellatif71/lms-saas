import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { MemberRole } from "@/generated/prisma/enums";
import type { AuthContext } from "@/modules/auth/permissions";

function assertStudent(ctx: AuthContext, action: "enroll" | "unenroll") {
  if (ctx.role !== MemberRole.STUDENT) {
    throw new ForbiddenError(action === "enroll" ? "Only students can enroll" : "Only students can unenroll");
  }
}

export async function enrollStudent(ctx: AuthContext, courseSlug: string): Promise<{ enrollmentId: string }> {
  assertStudent(ctx, "enroll");
  const course = await prisma.course.findFirst({
    where: {
      organizationId: ctx.organizationId,
      slug: courseSlug,
      deletedAt: null,
      status: "PUBLISHED",
      enrollmentRule: "OPEN",
    },
  });
  if (!course) throw new NotFoundError("Course not found or not open for enrollment");

  const existing = await prisma.enrollment.findUnique({
    where: { courseId_studentUserId: { courseId: course.id, studentUserId: ctx.userId } },
  });
  if (existing?.status === "ACTIVE") throw new ConflictError("Already enrolled");
  if (existing?.status === "COMPLETED") throw new ConflictError("Course already completed");

  const enrollment = existing
    ? await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", enrolledAt: new Date(), completedAt: null },
      })
    : await prisma.enrollment.create({
        data: {
          courseId: course.id,
          studentUserId: ctx.userId,
          organizationId: ctx.organizationId,
          status: "ACTIVE",
          enrolledAt: new Date(),
        },
      });

  await audit({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    action: "ENROLLMENT.CREATED",
    targetType: "Enrollment",
    targetId: enrollment.id,
    metadata: { courseId: course.id, courseSlug },
  });
  return { enrollmentId: enrollment.id };
}

export async function unenrollStudent(ctx: AuthContext, courseSlug: string): Promise<void> {
  assertStudent(ctx, "unenroll");
  const course = await prisma.course.findFirst({
    where: { organizationId: ctx.organizationId, slug: courseSlug, deletedAt: null },
  });
  if (!course) throw new NotFoundError("Course not found");

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_studentUserId: { courseId: course.id, studentUserId: ctx.userId } },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") {
    throw new NotFoundError("Enrollment not found or not active");
  }

  const progressCount = await prisma.lessonProgress.count({
    where: {
      organizationId: ctx.organizationId,
      studentUserId: ctx.userId,
      lesson: { module: { courseId: course.id } },
    },
  });
  if (progressCount > 0) {
    throw new ConflictError("Cannot leave a course with existing progress. Ask your teacher to remove you.");
  }

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: "DROPPED" },
  });
  await audit({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    action: "ENROLLMENT.DROPPED",
    targetType: "Enrollment",
    targetId: enrollment.id,
    metadata: { courseId: course.id, courseSlug },
  });
}

export async function listMyEnrollments(ctx: AuthContext) {
  assertStudent(ctx, "enroll");
  return prisma.enrollment.findMany({
    where: { studentUserId: ctx.userId, organizationId: ctx.organizationId },
    include: {
      course: {
        include: {
          category: true,
          author: { select: { name: true } },
          modules: {
            include: {
              lessons: {
                where: { deletedAt: null },
                include: {
                  progress: { where: { studentUserId: ctx.userId } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });
}

export async function listAvailableCourses(ctx: AuthContext) {
  assertStudent(ctx, "enroll");
  return prisma.course.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: "PUBLISHED",
      enrollmentRule: "OPEN",
      deletedAt: null,
      enrollments: { none: { studentUserId: ctx.userId, status: "ACTIVE" } },
    },
    include: { category: true, author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
  });
}

export async function getEnrolledCourseContent(ctx: AuthContext, courseSlug: string) {
  assertStudent(ctx, "enroll");
  const course = await prisma.course.findFirst({
    where: {
      organizationId: ctx.organizationId,
      slug: courseSlug,
      deletedAt: null,
      enrollments: { some: { studentUserId: ctx.userId, status: "ACTIVE" } },
    },
    include: {
      category: true,
      author: { select: { name: true } },
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            where: { deletedAt: null },
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });
  if (!course) throw new NotFoundError("Course not found or not enrolled");
  return course;
}
