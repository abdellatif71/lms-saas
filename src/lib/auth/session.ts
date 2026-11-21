import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireSessionOrRedirect(locale: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  return session;
}
