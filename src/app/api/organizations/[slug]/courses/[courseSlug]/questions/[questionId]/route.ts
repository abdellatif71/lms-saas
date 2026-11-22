import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { assertTeacherOrAbove } from "@/modules/auth/permissions";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { questionUpdateSchema } from "@/modules/questions/validation";
import { deleteQuestion, getQuestion, updateQuestion } from "@/modules/questions/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; questionId: string }> }) {
  try {
    const { slug, courseSlug, questionId } = await params;
    const ctx = await requireOrgContext(slug);
    assertTeacherOrAbove(ctx);
    await checkRateLimit({ key: `questions-get:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 });
    return NextResponse.json(await getQuestion(ctx, courseSlug, questionId));
  } catch (e) { return jsonError(e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; questionId: string }> }) {
  try {
    const { slug, courseSlug, questionId } = await params;
    const ctx = await requireOrgContext(slug);
    assertTeacherOrAbove(ctx);
    await checkRateLimit({ key: `questions-update:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 });
    const parsed = questionUpdateSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await updateQuestion(ctx, courseSlug, questionId, parsed.data));
  } catch (e) { return jsonError(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; questionId: string }> }) {
  try {
    const { slug, courseSlug, questionId } = await params;
    const ctx = await requireOrgContext(slug);
    assertTeacherOrAbove(ctx);
    await checkRateLimit({ key: `questions-delete:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 });
    await deleteQuestion(ctx, courseSlug, questionId);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
