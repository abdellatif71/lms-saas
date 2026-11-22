import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { assertTeacherOrAbove } from "@/modules/auth/permissions";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { questionCreateSchema, type QuestionCreateInput } from "@/modules/questions/validation";
import { createQuestion, listQuestions } from "@/modules/questions/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    assertTeacherOrAbove(ctx);
    await checkRateLimit({ key: `questions-list:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 });
    return NextResponse.json(await listQuestions(ctx, courseSlug));
  } catch (e) { return jsonError(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    assertTeacherOrAbove(ctx);
    await checkRateLimit({ key: `questions-create:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 });
    const parsed = questionCreateSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await createQuestion(ctx, courseSlug, parsed.data as QuestionCreateInput), { status: 201 });
  } catch (e) { return jsonError(e); }
}
