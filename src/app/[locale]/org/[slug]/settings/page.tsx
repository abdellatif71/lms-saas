import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { getOrganizationBySlug } from "@/modules/organizations/service";
import SettingsForm from "./settings-form";

export default async function OrganizationSettingsPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const org = await getOrganizationBySlug(ctx, slug);
  const t = await getTranslations({ locale, namespace: "org" });

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {ctx.role === "ORG_OWNER" ? (
        <SettingsForm locale={locale} slug={slug} org={org} />
      ) : (
        <dl className="mt-6 space-y-3">
          <div><dt className="font-medium">{t("name")}</dt><dd>{org.name}</dd></div>
          <div><dt className="font-medium">{t("description")}</dt><dd>{org.description ?? "—"}</dd></div>
        </dl>
      )}
    </main>
  );
}
