import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { completeLessonSchema } from "@/modules/learning/validation";
import { markLessonCompleted } from "@/modules/learning/service";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `learning-complete:${ctx.organizationId}:${ctx.userId}`, limit: 30, windowSeconds: 3600 });
    const parsed = completeLessonSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await markLessonCompleted(ctx, parsed.data));
  } catch (e) { return jsonError(e); }
}
