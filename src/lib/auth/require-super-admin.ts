import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function requireSuperAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true, status: true },
  });
  if (!user || user.status !== "ACTIVE" || !user.isSuperAdmin) {
    throw new ForbiddenError("Super admin required");
  }
  return { userId: session.user.id };
}
