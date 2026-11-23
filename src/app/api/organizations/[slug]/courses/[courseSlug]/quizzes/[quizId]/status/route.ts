import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { quizStatusSchema } from "@/modules/quizzes/validation";
import { setQuizStatus } from "@/modules/quizzes/service";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; quizId: string }> }) {
  try {
    const { slug, quizId } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `quiz-status:${ctx.organizationId}`, limit: 10, windowSeconds: 3600 });
    const parsed = quizStatusSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await setQuizStatus(ctx, quizId, parsed.data));
  } catch (e) { return jsonError(e); }
}
