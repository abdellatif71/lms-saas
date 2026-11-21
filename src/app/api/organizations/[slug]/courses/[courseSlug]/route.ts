import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { courseUpdateSchema } from "@/modules/courses/validation";
import { getCourseBySlug, softDeleteCourse, updateCourse } from "@/modules/courses/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    return NextResponse.json(await getCourseBySlug(ctx, courseSlug));
  } catch (e) { return jsonError(e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `catalog-course:${ctx.organizationId}`, limit: 20, windowSeconds: 3600 });
    const parsed = courseUpdateSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await updateCourse(ctx, courseSlug, parsed.data));
  } catch (e) { return jsonError(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `catalog-course:${ctx.organizationId}`, limit: 20, windowSeconds: 3600 });
    return NextResponse.json(await softDeleteCourse(ctx, courseSlug));
  } catch (e) { return jsonError(e); }
}
