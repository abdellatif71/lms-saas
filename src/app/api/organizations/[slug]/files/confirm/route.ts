import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { assertTeacherOrAbove } from "@/modules/auth/permissions";
import { confirmUploadSchema } from "@/modules/files/validation";
import { confirmUpload } from "@/modules/files/service";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    assertTeacherOrAbove(ctx);
    const parsed = confirmUploadSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await confirmUpload(ctx, parsed.data));
  } catch (e) {
    return jsonError(e);
  }
}
