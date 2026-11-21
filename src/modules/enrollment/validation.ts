import { z } from "zod";

export const enrollSchema = z.object({
  courseSlug: z.string().min(1).max(80),
});

export const unenrollSchema = z.object({
  courseSlug: z.string().min(1).max(80),
});
