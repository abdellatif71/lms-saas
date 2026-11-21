import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { listAvailableCourses } from "@/modules/enrollment/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    return NextResponse.json(await listAvailableCourses(ctx));
  } catch (e) {
    return jsonError(e);
  }
}
