import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { moduleCreateSchema } from "@/modules/lessons/validation";
import { createModule, listModules } from "@/modules/lessons/modules";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try { const { slug, courseSlug } = await params; const ctx = await requireOrgContext(slug); return NextResponse.json(await listModules(ctx, courseSlug)); }
  catch (e) { return jsonError(e); }
}
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try { const { slug, courseSlug } = await params; const ctx = await requireOrgContext(slug); await checkRateLimit({ key: `lessons-module:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 }); const parsed = moduleCreateSchema.safeParse(await req.json()); if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten()); return NextResponse.json(await createModule(ctx, courseSlug, parsed.data), { status: 201 }); }
  catch (e) { return jsonError(e); }
}
