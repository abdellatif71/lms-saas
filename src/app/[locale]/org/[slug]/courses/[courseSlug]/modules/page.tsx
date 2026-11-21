import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { listModules } from "@/modules/lessons/modules";

export default async function ModulesPage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string }> }) {
  const { locale, slug, courseSlug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "lesson" });
  let modules: Awaited<ReturnType<typeof listModules>> = [];
  try { modules = await listModules(ctx, courseSlug); } catch {}
  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">{t("modules")}</h1><a className="rounded bg-slate-900 px-3 py-2 text-white" href={`/${locale}/org/${slug}/courses/${courseSlug}/modules/new`}>{t("newModule")}</a></div>
      {modules.length === 0 ? <p className="mt-6 text-slate-600">{t("noModules")}</p> : <div className="mt-6 space-y-3">{modules.map((module) => <a key={module.id} href={`/${locale}/org/${slug}/courses/${courseSlug}/modules/${module.id}`} className="block rounded border p-4"><div className="font-medium">{module.position + 1}. {module.title}</div><div className="mt-1 text-sm text-slate-600">{module.lessons.length} {t("lessons")}</div></a>)}</div>}
    </main>
  );
}
