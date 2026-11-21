import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertTeacherOrAbove } from "@/modules/auth/permissions";
import { requestUploadSchema } from "@/modules/files/validation";
import { requestUpload } from "@/modules/files/service";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    assertTeacherOrAbove(ctx);
    await checkRateLimit({ key: `file-upload:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    const parsed = requestUploadSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await requestUpload(ctx, parsed.data));
  } catch (e) {
    return jsonError(e);
  }
}
