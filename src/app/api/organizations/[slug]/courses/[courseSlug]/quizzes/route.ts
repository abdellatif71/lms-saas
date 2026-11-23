import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { quizCreateSchema } from "@/modules/quizzes/validation";
import { createQuiz, listQuizzes } from "@/modules/quizzes/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `quizzes-list:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    return NextResponse.json(await listQuizzes(ctx, courseSlug));
  } catch (e) { return jsonError(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `quizzes-create:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    const parsed = quizCreateSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await createQuiz(ctx, courseSlug, parsed.data), { status: 201 });
  } catch (e) { return jsonError(e); }
}
