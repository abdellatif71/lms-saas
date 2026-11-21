import { getTranslations } from "next-intl/server";
import { requireSuperAdminOrRedirect } from "@/lib/auth/require-super-admin-server";
import { prisma } from "@/lib/db/client";
import OrganizationsTable from "./organizations-table";

export default async function AdminOrganizationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSuperAdminOrRedirect(locale);
  const t = await getTranslations({ locale, namespace: "admin" });
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slug: true, status: true, createdAt: true, _count: { select: { memberships: true } } },
  });
  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">{t("organizations")}</h1>
      <OrganizationsTable locale={locale} organizations={organizations} />
    </main>
  );
}
