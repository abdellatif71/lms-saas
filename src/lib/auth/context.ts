import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import type { AuthContext } from "@/modules/auth/permissions";
import { MemberRole, MemberStatus } from "@/generated/prisma/enums";

export async function requireOrgContext(slug: string): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") throw new ForbiddenError("Organization not found or access denied");

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) throw new ForbiddenError("Organization not found or access denied");

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: org.id,
      },
    },
  });

  if (!membership || membership.status !== MemberStatus.ACTIVE || org.status !== "ACTIVE") {
    throw new ForbiddenError("Organization not found or access denied");
  }

  return {
    userId: session.user.id,
    organizationId: org.id,
    role: membership.role as MemberRole,
    isSuperAdmin: user.isSuperAdmin,
  };
}
