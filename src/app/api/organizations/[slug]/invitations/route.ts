import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { inviteSchema } from "@/modules/organizations/validation";
import { inviteMember } from "@/modules/organizations/membership";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `org-invite:${ctx.organizationId}`, limit: 20, windowSeconds: 3600 });
    const parsed = inviteSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await inviteMember(ctx, parsed.data), { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
