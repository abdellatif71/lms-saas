import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { enrollSchema } from "@/modules/enrollment/validation";
import { enrollStudent, listMyEnrollments } from "@/modules/enrollment/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    return NextResponse.json(await listMyEnrollments(ctx));
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `org-enroll:${ctx.userId}`, limit: 10, windowSeconds: 3600 });
    const parsed = enrollSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await enrollStudent(ctx, parsed.data.courseSlug), { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
