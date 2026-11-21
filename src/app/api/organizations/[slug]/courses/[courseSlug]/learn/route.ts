import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { getEnrolledCourseContent } from "@/modules/enrollment/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    return NextResponse.json(await getEnrolledCourseContent(ctx, courseSlug));
  } catch (e) {
    return jsonError(e);
  }
}
