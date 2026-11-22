import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLessonProgress } from "@/modules/learning/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  try {
    const { slug, lessonId } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `learning-progress:${ctx.organizationId}:${ctx.userId}`, limit: 60, windowSeconds: 3600 });
    return NextResponse.json(await getLessonProgress(ctx, lessonId));
  } catch (e) { return jsonError(e); }
}
