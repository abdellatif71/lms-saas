import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { assertTeacherOrAbove } from "@/modules/auth/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { deleteFile } from "@/modules/files/service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; fileId: string }> }) {
  try {
    const { slug, fileId } = await params;
    const ctx = await requireOrgContext(slug);
    assertTeacherOrAbove(ctx);
    await checkRateLimit({ key: `file-delete:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    await deleteFile(ctx, fileId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
