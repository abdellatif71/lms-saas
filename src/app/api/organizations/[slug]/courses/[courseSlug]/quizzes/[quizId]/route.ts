import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { quizUpdateSchema } from "@/modules/quizzes/validation";
import { getQuizTeacher, softDeleteQuiz, updateQuiz } from "@/modules/quizzes/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; quizId: string }> }) {
  try {
    const { slug, quizId } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `quiz-get:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    return NextResponse.json(await getQuizTeacher(ctx, quizId));
  } catch (e) { return jsonError(e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string; quizId: string }> }) {
  try {
    const { slug, quizId } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `quiz-update:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    const parsed = quizUpdateSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await updateQuiz(ctx, quizId, parsed.data));
  } catch (e) { return jsonError(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; quizId: string }> }) {
  try {
    const { slug, quizId } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `quiz-delete:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    await softDeleteQuiz(ctx, quizId);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
