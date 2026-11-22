import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { getResumePosition } from "@/modules/learning/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `learning-resume:${ctx.organizationId}:${ctx.userId}`, limit: 60, windowSeconds: 3600 });
    return NextResponse.json(await getResumePosition(ctx, courseSlug));
  } catch (e) { return jsonError(e); }
}
