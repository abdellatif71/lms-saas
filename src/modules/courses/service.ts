import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { assertOrgAdmin, assertTeacherOrAbove, assertSameOrg, type AuthContext } from "@/modules/auth/permissions";
import { randomBytes } from "node:crypto";
import type { z } from "zod";
import type { courseCreateSchema, courseUpdateSchema, courseStatusSchema } from "./validation";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

function slugify(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

async function uniqueSlug(orgId: string, base: string): Promise<string> {
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.course.findFirst({ where: { organizationId: orgId, slug } });
    if (!exists) return slug;
    slug = `${base}-${randomBytes(3).toString("hex")}`;
  }
  throw new ConflictError("Could not generate unique slug");
}

export async function createCourse(ctx: AuthContext, input: z.infer<typeof courseCreateSchema>) {
  assertTeacherOrAbove(ctx);
  const base = input.slug ?? slugify(input.title);
  if (!SLUG_RE.test(base)) throw new ConflictError("Invalid slug");
  const slug = await uniqueSlug(ctx.organizationId, base);

  if (input.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: input.categoryId, organizationId: ctx.organizationId } });
    if (!cat) throw new NotFoundError("Category not found");
  }

  const course = await prisma.course.create({
    data: {
      organizationId: ctx.organizationId,
      authorId: ctx.userId,
      title: input.title.trim(), slug,
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      categoryId: input.categoryId ?? null,
      visibility: input.visibility,
      enrollmentRule: input.enrollmentRule,
      status: "DRAFT",
    },
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "COURSE.CREATED", targetType: "Course", targetId: course.id, metadata: { title: course.title, slug: course.slug } });
  return course;
}

export async function listCourses(ctx: AuthContext) {
  assertTeacherOrAbove(ctx);
  return prisma.course.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    include: { category: true, author: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCourseBySlug(ctx: AuthContext, slug: string) {
  assertTeacherOrAbove(ctx);
  const course = await prisma.course.findFirst({
    where: { organizationId: ctx.organizationId, slug, deletedAt: null },
    include: { category: true, author: { select: { id: true, name: true } } },
  });
  if (!course) throw new NotFoundError("Course not found");
  assertSameOrg(ctx, course.organizationId);
  return course;
}

export async function updateCourse(ctx: AuthContext, slug: string, input: z.infer<typeof courseUpdateSchema>) {
  assertTeacherOrAbove(ctx);
  const course = await prisma.course.findFirst({ where: { organizationId: ctx.organizationId, slug, deletedAt: null } });
  if (!course) throw new NotFoundError("Course not found");
  assertSameOrg(ctx, course.organizationId);

  if (input.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: input.categoryId, organizationId: ctx.organizationId } });
    if (!cat) throw new NotFoundError("Category not found");
  }

  const updated = await prisma.course.update({
    where: { id: course.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId ?? null } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.enrollmentRule !== undefined ? { enrollmentRule: input.enrollmentRule } : {}),
    },
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "COURSE.UPDATED", targetType: "Course", targetId: course.id });
  return updated;
}

export async function setCourseStatus(ctx: AuthContext, slug: string, input: z.infer<typeof courseStatusSchema>) {
  assertOrgAdmin(ctx);
  const course = await prisma.course.findFirst({ where: { organizationId: ctx.organizationId, slug, deletedAt: null } });
  if (!course) throw new NotFoundError("Course not found");
  assertSameOrg(ctx, course.organizationId);
  if (course.status === input.status) return course;

  const allowed: Array<[string, string]> = [["DRAFT", "PUBLISHED"], ["PUBLISHED", "ARCHIVED"], ["ARCHIVED", "PUBLISHED"]];
  if (!allowed.some(([from, to]) => from === course.status && to === input.status)) {
    throw new ConflictError(`Cannot transition ${course.status} -> ${input.status}`);
  }

  const updated = await prisma.course.update({
    where: { id: course.id },
    data: { status: input.status, publishedAt: input.status === "PUBLISHED" ? (course.publishedAt ?? new Date()) : course.publishedAt },
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: `COURSE.${input.status === "PUBLISHED" ? "PUBLISHED" : "ARCHIVED"}`, targetType: "Course", targetId: course.id });
  return updated;
}

export async function softDeleteCourse(ctx: AuthContext, slug: string) {
  assertOrgAdmin(ctx);
  const course = await prisma.course.findFirst({ where: { organizationId: ctx.organizationId, slug, deletedAt: null } });
  if (!course) throw new NotFoundError("Course not found");
  assertSameOrg(ctx, course.organizationId);
  const deleted = await prisma.course.update({ where: { id: course.id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "COURSE.SOFT_DELETED", targetType: "Course", targetId: course.id });
  return deleted;
}
