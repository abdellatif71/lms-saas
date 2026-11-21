import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/).optional(),
});

export const categoryUpdateSchema = categorySchema.partial();

export const courseCreateSchema = z.object({
  title: z.string().min(3).max(160),
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/).optional(),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid().optional(),
  visibility: z.enum(["PRIVATE", "ORG", "PUBLIC"]).default("ORG"),
  enrollmentRule: z.enum(["OPEN", "INVITE_ONLY"]).default("OPEN"),
});

export const courseUpdateSchema = courseCreateSchema.partial().omit({ slug: true });

export const courseStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});
