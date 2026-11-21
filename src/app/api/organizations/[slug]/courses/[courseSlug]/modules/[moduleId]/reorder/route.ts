import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { moduleReorderSchema } from "@/modules/lessons/validation";
import { reorderModule } from "@/modules/lessons/modules";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; moduleId: string }> }) {
  try { const { slug, courseSlug, moduleId } = await params; const ctx = await requireOrgContext(slug); await checkRateLimit({ key: `lessons-module:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 }); const parsed = moduleReorderSchema.safeParse(await req.json()); if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten()); return NextResponse.json(await reorderModule(ctx, courseSlug, moduleId, parsed.data.position)); }
  catch (e) { return jsonError(e); }
}
