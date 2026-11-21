import { z } from "zod";

export const filePurposeSchema = z.enum([
  "LESSON_VIDEO", "LESSON_PDF", "LESSON_IMAGE", "COURSE_COVER", "ORG_LOGO",
  "AVATAR", "SUBMISSION_FILE", "CERTIFICATE_PDF",
]);

export const requestUploadSchema = z.object({
  purpose: filePurposeSchema,
  filename: z.string().min(1).max(255),
  declaredMime: z.string().min(1).max(255),
  sizeBytes: z.number().int().min(1),
});

export const confirmUploadSchema = z.object({
  storageKey: z.string().min(1).max(1024),
  purpose: filePurposeSchema,
  originalName: z.string().min(1).max(255),
  declaredMime: z.string().min(1).max(255),
  declaredSize: z.number().int().min(1),
});
