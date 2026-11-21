import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { getDownloadUrl } from "@/modules/files/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; fileId: string }> }) {
  try {
    const { slug, fileId } = await params;
    const ctx = await requireOrgContext(slug);
    return NextResponse.json(await getDownloadUrl(ctx, fileId));
  } catch (e) {
    return jsonError(e);
  }
}
