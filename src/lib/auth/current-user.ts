import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  memberships: { organizationId: string; role: string }[];
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      memberships: {
        where: { status: "ACTIVE" },
        select: { organizationId: true, role: true },
      },
    },
  });
  return user;
}
