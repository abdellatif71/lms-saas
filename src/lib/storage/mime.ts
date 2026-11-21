import { fileTypeFromBuffer } from "file-type";
import { ValidationError } from "@/lib/errors";

const ALLOWED_BY_PURPOSE: Record<string, string[]> = {
  LESSON_VIDEO: ["video/mp4", "video/webm", "video/quicktime"],
  LESSON_PDF: ["application/pdf"],
  LESSON_IMAGE: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  COURSE_COVER: ["image/jpeg", "image/png", "image/webp"],
  ORG_LOGO: ["image/jpeg", "image/png", "image/svg+xml", "image/webp"],
  AVATAR: ["image/jpeg", "image/png", "image/webp"],
  SUBMISSION_FILE: ["application/pdf", "application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  CERTIFICATE_PDF: ["application/pdf"],
};

const MAX_BYTES_BY_PURPOSE: Record<string, number> = {
  LESSON_VIDEO: 500 * 1024 * 1024,
  LESSON_PDF: 50 * 1024 * 1024,
  LESSON_IMAGE: 5 * 1024 * 1024,
  COURSE_COVER: 5 * 1024 * 1024,
  ORG_LOGO: 2 * 1024 * 1024,
  AVATAR: 2 * 1024 * 1024,
  SUBMISSION_FILE: 50 * 1024 * 1024,
  CERTIFICATE_PDF: 5 * 1024 * 1024,
};

export function allowedMimeFor(purpose: string): string[] {
  return ALLOWED_BY_PURPOSE[purpose] ?? ["application/octet-stream"];
}

export function maxBytesFor(purpose: string): number {
  return MAX_BYTES_BY_PURPOSE[purpose] ?? 10 * 1024 * 1024;
}

export async function sniffMime(buffer: Buffer): Promise<string | null> {
  const detected = await fileTypeFromBuffer(buffer);
  return detected?.mime ?? null;
}

export function assertMimeAllowed(purpose: string, declared: string, detected: string | null) {
  const allowed = allowedMimeFor(purpose);
  // Magic bytes take precedence when available; declared MIME is only metadata
  // fallback. This prevents a file's extension or a caller header from granting type access.
  const candidate = detected ?? declared;
  if (!allowed.includes(candidate)) {
    throw new ValidationError(`MIME ${candidate} not allowed for ${purpose}. Allowed: ${allowed.join(", ")}`);
  }
}
