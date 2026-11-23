import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { quizAssembleSchema } from "@/modules/quizzes/validation";
import { assembleQuestions } from "@/modules/quizzes/service";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; quizId: string }> }) {
  try {
    const { slug, quizId } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `quiz-assemble:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    const parsed = quizAssembleSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await assembleQuestions(ctx, quizId, parsed.data));
  } catch (e) { return jsonError(e); }
}
