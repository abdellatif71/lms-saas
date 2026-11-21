import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { prisma } from "@/lib/db/client";
import { jsonError } from "@/lib/http/errors";

export async function GET() {
  try {
    await requireSuperAdmin();
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    });
    return NextResponse.json(organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      createdAt: org.createdAt,
      memberCount: org._count.memberships,
    })));
  } catch (e) {
    return jsonError(e);
  }
}
