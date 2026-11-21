import { z } from "zod";

export const moduleCreateSchema = z.object({ title: z.string().min(2).max(160) });
export const moduleUpdateSchema = moduleCreateSchema.partial();
export const moduleReorderSchema = z.object({ position: z.number().int().min(0) });

export const lessonCreateSchema = z.object({
  title: z.string().min(2).max(160),
  contentType: z.enum(["TEXT", "VIDEO", "PDF", "EXTERNAL"]),
  bodyText: z.string().max(20000).optional(),
  externalUrl: z.string().url().max(2000).optional(),
  fileId: z.string().uuid().optional(),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
  completionRule: z.enum(["VIEW", "MANUAL", "TIME_BASED"]).default("VIEW"),
}).refine((data) => {
  if (data.contentType === "TEXT") return !!data.bodyText;
  if (data.contentType === "VIDEO" || data.contentType === "EXTERNAL") return !!data.externalUrl;
  if (data.contentType === "PDF") return !!data.fileId;
  return false;
}, { message: "Content required for the given contentType" });

export const lessonUpdateSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  contentType: z.enum(["TEXT", "VIDEO", "PDF", "EXTERNAL"]).optional(),
  bodyText: z.string().max(20000).optional(),
  externalUrl: z.string().url().max(2000).optional(),
  fileId: z.string().uuid().optional(),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
  completionRule: z.enum(["VIEW", "MANUAL", "TIME_BASED"]).optional(),
});
export const lessonReorderSchema = z.object({ position: z.number().int().min(0), moduleId: z.string().uuid().optional() });
