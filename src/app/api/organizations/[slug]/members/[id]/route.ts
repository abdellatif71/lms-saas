import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { changeRoleSchema } from "@/modules/organizations/validation";
import { changeMemberRole, removeMember, suspendMember } from "@/modules/organizations/membership";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id } = await params;
    const ctx = await requireOrgContext(slug);
    const body = await req.json();
    if (body.status === "SUSPENDED") {
      return NextResponse.json(await suspendMember(ctx, id));
    }
    const parsed = changeRoleSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await changeMemberRole(ctx, id, parsed.data.role));
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id } = await params;
    const ctx = await requireOrgContext(slug);
    return NextResponse.json(await removeMember(ctx, id));
  } catch (e) {
    return jsonError(e);
  }
}
