import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { unenrollStudent } from "@/modules/enrollment/service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string }> }) {
  try {
    const { slug, courseSlug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `org-unenroll:${ctx.userId}`, limit: 10, windowSeconds: 3600 });
    await unenrollStudent(ctx, courseSlug);
    return NextResponse.json({ success: true });
  } catch (e) {
    return jsonError(e);
  }
}
