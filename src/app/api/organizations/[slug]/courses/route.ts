import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { courseCreateSchema } from "@/modules/courses/validation";
import { createCourse, listCourses } from "@/modules/courses/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    return NextResponse.json(await listCourses(ctx));
  } catch (e) { return jsonError(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `catalog-course:${ctx.organizationId}`, limit: 20, windowSeconds: 3600 });
    const parsed = courseCreateSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await createCourse(ctx, parsed.data), { status: 201 });
  } catch (e) { return jsonError(e); }
}
