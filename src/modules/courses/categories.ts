import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { assertTeacherOrAbove, assertSameOrg, type AuthContext } from "@/modules/auth/permissions";
import type { z } from "zod";
import type { categorySchema, categoryUpdateSchema } from "./validation";

function slugify(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export async function createCategory(ctx: AuthContext, input: z.infer<typeof categorySchema>) {
  assertTeacherOrAbove(ctx);
  const slug = input.slug ?? slugify(input.name);
  const existing = await prisma.category.findUnique({
    where: { organizationId_slug: { organizationId: ctx.organizationId, slug } },
  });
  if (existing) throw new ConflictError("Category slug already exists");
  const cat = await prisma.category.create({
    data: { organizationId: ctx.organizationId, name: input.name.trim(), slug },
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "CATEGORY.CREATED", targetType: "Category", targetId: cat.id, metadata: { name: cat.name, slug: cat.slug } });
  return cat;
}

export async function listCategories(ctx: AuthContext) {
  assertTeacherOrAbove(ctx);
  return prisma.category.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: "asc" },
  });
}

export async function updateCategory(ctx: AuthContext, categoryId: string, input: z.infer<typeof categoryUpdateSchema>) {
  assertTeacherOrAbove(ctx);
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, organizationId: ctx.organizationId },
  });
  if (!existing) throw new NotFoundError("Category not found");
  assertSameOrg(ctx, existing.organizationId);
  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
    },
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "CATEGORY.UPDATED", targetType: "Category", targetId: categoryId });
  return updated;
}

export async function deleteCategory(ctx: AuthContext, categoryId: string) {
  assertTeacherOrAbove(ctx);
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, organizationId: ctx.organizationId },
  });
  if (!existing) throw new NotFoundError("Category not found");
  assertSameOrg(ctx, existing.organizationId);
  const courseCount = await prisma.course.count({
    where: { categoryId, organizationId: ctx.organizationId, deletedAt: null },
  });
  if (courseCount > 0) throw new ConflictError("Category has courses; cannot delete");
  await prisma.category.delete({ where: { id: categoryId } });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "CATEGORY.DELETED", targetType: "Category", targetId: categoryId });
}
