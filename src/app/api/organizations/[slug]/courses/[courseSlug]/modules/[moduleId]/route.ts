import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { moduleUpdateSchema } from "@/modules/lessons/validation";
import { deleteModule, updateModule } from "@/modules/lessons/modules";

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; moduleId: string }> }) {
  try { const { slug, courseSlug, moduleId } = await params; const ctx = await requireOrgContext(slug); await checkRateLimit({ key: `lessons-module:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 }); const parsed = moduleUpdateSchema.safeParse(await req.json()); if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten()); return NextResponse.json(await updateModule(ctx, courseSlug, moduleId, parsed.data)); }
  catch (e) { return jsonError(e); }
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; moduleId: string }> }) {
  try { const { slug, courseSlug, moduleId } = await params; const ctx = await requireOrgContext(slug); await checkRateLimit({ key: `lessons-module:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 }); await deleteModule(ctx, courseSlug, moduleId); return NextResponse.json({ ok: true }); }
  catch (e) { return jsonError(e); }
}
