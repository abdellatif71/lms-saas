import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { lessonReorderSchema } from "@/modules/lessons/validation";
import { reorderLesson } from "@/modules/lessons/service";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; moduleId: string; lessonId: string }> }) {
  try { const { slug, courseSlug, moduleId, lessonId } = await params; const ctx = await requireOrgContext(slug); await checkRateLimit({ key: `lessons-module:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 }); const parsed = lessonReorderSchema.safeParse(await req.json()); if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten()); return NextResponse.json(await reorderLesson(ctx, courseSlug, moduleId, lessonId, parsed.data.position, parsed.data.moduleId)); }
  catch (e) { return jsonError(e); }
}
