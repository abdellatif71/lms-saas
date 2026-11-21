import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { assertOrgAdmin } from "@/modules/auth/permissions";
import { listMembers } from "@/modules/organizations/membership";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    assertOrgAdmin(ctx);
    return NextResponse.json(await listMembers(ctx));
  } catch (e) {
    return jsonError(e);
  }
}
