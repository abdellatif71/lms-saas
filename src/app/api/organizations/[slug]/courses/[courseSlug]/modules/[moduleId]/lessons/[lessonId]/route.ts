import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { lessonUpdateSchema } from "@/modules/lessons/validation";
import { softDeleteLesson, updateLesson } from "@/modules/lessons/service";

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; moduleId: string; lessonId: string }> }) {
  try { const { slug, courseSlug, moduleId, lessonId } = await params; const ctx = await requireOrgContext(slug); await checkRateLimit({ key: `lessons-module:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 }); const parsed = lessonUpdateSchema.safeParse(await req.json()); if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten()); return NextResponse.json(await updateLesson(ctx, courseSlug, moduleId, lessonId, parsed.data)); }
  catch (e) { return jsonError(e); }
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; moduleId: string; lessonId: string }> }) {
  try { const { slug, courseSlug, moduleId, lessonId } = await params; const ctx = await requireOrgContext(slug); await checkRateLimit({ key: `lessons-module:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 }); return NextResponse.json(await softDeleteLesson(ctx, courseSlug, moduleId, lessonId)); }
  catch (e) { return jsonError(e); }
}
