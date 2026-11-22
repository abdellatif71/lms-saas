import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { assertTeacherOrAbove, assertSameOrg, type AuthContext } from "@/modules/auth/permissions";
import type { z } from "zod";
import type { lessonCreateSchema, lessonUpdateSchema } from "./validation";
import type { Prisma } from "@/generated/prisma/client";

async function getModule(ctx: AuthContext, courseSlug: string, moduleId: string) {
  const course = await prisma.course.findFirst({ where: { slug: courseSlug, organizationId: ctx.organizationId, deletedAt: null } });
  if (!course) throw new NotFoundError("Course not found");
  assertSameOrg(ctx, course.organizationId);
  const moduleRecord = await prisma.module.findFirst({ where: { id: moduleId, courseId: course.id } });
  if (!moduleRecord) throw new NotFoundError("Module not found");
  return { course, module: moduleRecord };
}

export async function createLesson(ctx: AuthContext, courseSlug: string, moduleId: string, input: z.infer<typeof lessonCreateSchema>) {
  assertTeacherOrAbove(ctx);
  const { module } = await getModule(ctx, courseSlug, moduleId);
  if (input.fileId) {
    const file = await prisma.file.findFirst({ where: { id: input.fileId, organizationId: ctx.organizationId } });
    if (!file) throw new NotFoundError("File not found");
  }
  const last = await prisma.lesson.findFirst({ where: { moduleId, deletedAt: null }, orderBy: { position: "desc" }, select: { position: true } });
  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title: input.title.trim(),
      position: (last?.position ?? -1) + 1,
      contentType: input.contentType,
      completionRule: input.completionRule,
      ...(input.bodyText !== undefined ? { bodyText: input.bodyText } : {}),
      ...(input.externalUrl !== undefined ? { externalUrl: input.externalUrl } : {}),
      ...(input.fileId !== undefined ? { fileId: input.fileId } : {}),
      ...(input.estimatedMinutes !== undefined ? { estimatedMinutes: input.estimatedMinutes } : {}),
    },
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "LESSON.CREATED", targetType: "Lesson", targetId: lesson.id, metadata: { courseId: module.courseId, moduleId, contentType: input.contentType } });
  return lesson;
}

export async function listLessons(ctx: AuthContext, courseSlug: string, moduleId: string, includeDeleted = false) {
  assertTeacherOrAbove(ctx);
  await getModule(ctx, courseSlug, moduleId);
  return prisma.lesson.findMany({ where: { moduleId, ...(includeDeleted ? {} : { deletedAt: null }) }, orderBy: { position: "asc" } });
}

export async function updateLesson(ctx: AuthContext, courseSlug: string, moduleId: string, lessonId: string, input: z.infer<typeof lessonUpdateSchema>) {
  assertTeacherOrAbove(ctx);
  const { course } = await getModule(ctx, courseSlug, moduleId);
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, moduleId, deletedAt: null } });
  if (!lesson) throw new NotFoundError("Lesson not found");
  if (input.fileId) {
    const file = await prisma.file.findFirst({ where: { id: input.fileId, organizationId: ctx.organizationId } });
    if (!file) throw new NotFoundError("File not found");
  }
  const updated = await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
      ...(input.bodyText !== undefined ? { bodyText: input.bodyText } : {}),
      ...(input.externalUrl !== undefined ? { externalUrl: input.externalUrl } : {}),
      ...(input.fileId !== undefined ? { fileId: input.fileId } : {}),
      ...(input.estimatedMinutes !== undefined ? { estimatedMinutes: input.estimatedMinutes } : {}),
      ...(input.completionRule !== undefined ? { completionRule: input.completionRule } : {}),
    },
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "LESSON.UPDATED", targetType: "Lesson", targetId: lesson.id, metadata: { courseId: course.id, moduleId } });
  return updated;
}

async function rebalance(tx: Prisma.TransactionClient, moduleId: string) {
  const lessons = await tx.lesson.findMany({ where: { moduleId, deletedAt: null }, orderBy: { position: "asc" } });
  await Promise.all(lessons.map((lesson: { id: string }, index: number) => tx.lesson.update({ where: { id: lesson.id }, data: { position: index } })));
}

export async function reorderLesson(ctx: AuthContext, courseSlug: string, moduleId: string, lessonId: string, position: number, targetModuleId?: string) {
  assertTeacherOrAbove(ctx);
  const source = await getModule(ctx, courseSlug, moduleId);
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, moduleId, deletedAt: null } });
  if (!lesson) throw new NotFoundError("Lesson not found");

  let destinationModuleId = moduleId;
  if (targetModuleId) {
    const target = await prisma.module.findFirst({ where: { id: targetModuleId, courseId: source.course.id } });
    if (!target) throw new NotFoundError("Destination module not found");
    destinationModuleId = target.id;
  }

  await prisma.$transaction(async (tx) => {
    if (destinationModuleId !== moduleId) {
      await tx.lesson.update({ where: { id: lessonId }, data: { moduleId: destinationModuleId } });
      await rebalance(tx, moduleId);
    }
    const siblings = await tx.lesson.findMany({ where: { moduleId: destinationModuleId, deletedAt: null, id: { not: lessonId } }, orderBy: { position: "asc" } });
    const target = Math.max(0, Math.min(position, siblings.length));
    const ordered = [...siblings.slice(0, target), lesson, ...siblings.slice(target)];
    await Promise.all(ordered.map((item, index) => tx.lesson.update({ where: { id: item.id }, data: { position: index, ...(destinationModuleId !== moduleId ? { moduleId: destinationModuleId } : {}) } })));
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: destinationModuleId !== moduleId ? "LESSON.MOVED" : "LESSON.REORDERED", targetType: "Lesson", targetId: lessonId, metadata: { moduleId: destinationModuleId, position } });
  return prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
}

export async function softDeleteLesson(ctx: AuthContext, courseSlug: string, moduleId: string, lessonId: string) {
  assertTeacherOrAbove(ctx);
  await getModule(ctx, courseSlug, moduleId);
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, moduleId, deletedAt: null } });
  if (!lesson) throw new NotFoundError("Lesson not found");
  const deleted = await prisma.lesson.update({ where: { id: lessonId }, data: { deletedAt: new Date() } });
  await prisma.lesson.updateMany({ where: { moduleId, deletedAt: null, position: { gt: lesson.position } }, data: { position: { decrement: 1 } } });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "LESSON.SOFT_DELETED", targetType: "Lesson", targetId: lessonId, metadata: { moduleId } });
  return deleted;
}
