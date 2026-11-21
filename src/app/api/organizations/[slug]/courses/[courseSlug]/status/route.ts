import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { courseStatusSchema } from "@/modules/courses/validation";
import { setCourseStatus } from "@/modules/courses/service";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `catalog-status:${ctx.organizationId}`, limit: 10, windowSeconds: 3600 });
    const parsed = courseStatusSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await setCourseStatus(ctx, courseSlug, parsed.data));
  } catch (e) { return jsonError(e); }
}
