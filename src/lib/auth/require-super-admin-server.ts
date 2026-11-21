import { redirect } from "next/navigation";
import { requireSuperAdmin } from "./require-super-admin";

export async function requireSuperAdminOrRedirect(locale: string) {
  try {
    return await requireSuperAdmin();
  } catch {
    redirect(`/${locale}/login`);
  }
}
