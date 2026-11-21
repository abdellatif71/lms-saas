import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { assertTeacherOrAbove, assertSameOrg, type AuthContext } from "@/modules/auth/permissions";
import type { z } from "zod";
import type { moduleCreateSchema, moduleUpdateSchema } from "./validation";

async function getCourse(ctx: AuthContext, courseSlug: string) {
  const course = await prisma.course.findFirst({ where: { slug: courseSlug, organizationId: ctx.organizationId, deletedAt: null } });
  if (!course) throw new NotFoundError("Course not found");
  assertSameOrg(ctx, course.organizationId);
  return course;
}

export async function createModule(ctx: AuthContext, courseSlug: string, input: z.infer<typeof moduleCreateSchema>) {
  assertTeacherOrAbove(ctx);
  const course = await getCourse(ctx, courseSlug);
  const last = await prisma.module.findFirst({ where: { courseId: course.id }, orderBy: { position: "desc" }, select: { position: true } });
  const moduleRecord = await prisma.module.create({ data: { courseId: course.id, title: input.title.trim(), position: (last?.position ?? -1) + 1 } });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "MODULE.CREATED", targetType: "Module", targetId: moduleRecord.id, metadata: { courseId: course.id, position: moduleRecord.position } });
  return moduleRecord;
}

export async function listModules(ctx: AuthContext, courseSlug: string) {
  assertTeacherOrAbove(ctx);
  const course = await getCourse(ctx, courseSlug);
  return prisma.module.findMany({ where: { courseId: course.id }, include: { lessons: { where: { deletedAt: null }, orderBy: { position: "asc" } } }, orderBy: { position: "asc" } });
}

export async function updateModule(ctx: AuthContext, courseSlug: string, moduleId: string, input: z.infer<typeof moduleUpdateSchema>) {
  assertTeacherOrAbove(ctx);
  const course = await getCourse(ctx, courseSlug);
  const moduleRecord = await prisma.module.findFirst({ where: { id: moduleId, courseId: course.id } });
  if (!moduleRecord) throw new NotFoundError("Module not found");
  const updated = await prisma.module.update({ where: { id: moduleRecord.id }, data: { ...(input.title !== undefined ? { title: input.title.trim() } : {}) } });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "MODULE.UPDATED", targetType: "Module", targetId: moduleRecord.id });
  return updated;
}

export async function reorderModule(ctx: AuthContext, courseSlug: string, moduleId: string, position: number) {
  assertTeacherOrAbove(ctx);
  const course = await getCourse(ctx, courseSlug);
  const moduleRecord = await prisma.module.findFirst({ where: { id: moduleId, courseId: course.id } });
  if (!moduleRecord) throw new NotFoundError("Module not found");
  await prisma.$transaction(async (tx) => {
    const siblings = await tx.module.findMany({ where: { courseId: course.id, id: { not: moduleId } }, orderBy: { position: "asc" } });
    const target = Math.max(0, Math.min(position, siblings.length));
    const ordered = [...siblings.slice(0, target), moduleRecord, ...siblings.slice(target)];
    await Promise.all(ordered.map((item, index) => tx.module.update({ where: { id: item.id }, data: { position: index } })));
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "MODULE.REORDERED", targetType: "Module", targetId: moduleId, metadata: { position } });
  return prisma.module.findUniqueOrThrow({ where: { id: moduleId } });
}

export async function deleteModule(ctx: AuthContext, courseSlug: string, moduleId: string) {
  assertTeacherOrAbove(ctx);
  const course = await getCourse(ctx, courseSlug);
  const moduleRecord = await prisma.module.findFirst({ where: { id: moduleId, courseId: course.id } });
  if (!moduleRecord) throw new NotFoundError("Module not found");
  const lessonCount = await prisma.lesson.count({ where: { moduleId, deletedAt: null } });
  if (lessonCount > 0) throw new ConflictError("Module has lessons; cannot delete");
  await prisma.$transaction(async (tx) => {
    await tx.module.delete({ where: { id: moduleId } });
    const siblings = await tx.module.findMany({ where: { courseId: course.id, id: { not: moduleId } }, orderBy: { position: "asc" } });
    await Promise.all(siblings.map((item, index) => tx.module.update({ where: { id: item.id }, data: { position: index } })));
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "MODULE.DELETED", targetType: "Module", targetId: moduleId });
}
