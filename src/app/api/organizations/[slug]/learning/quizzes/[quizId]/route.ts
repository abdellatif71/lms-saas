import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { getQuizStudent } from "@/modules/quizzes/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; quizId: string }> }) {
  try {
    const { slug, quizId } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `quiz-student:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 });
    return NextResponse.json(await getQuizStudent(ctx, quizId));
  } catch (e) { return jsonError(e); }
}
