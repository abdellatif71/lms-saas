import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http/errors";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;
    const org = await prisma.organization.update({ where: { id }, data: { status: "SUSPENDED" } });
    await audit({ actorId: admin.userId, organizationId: org.id, action: "ORG.SUSPENDED", targetType: "Organization", targetId: org.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
