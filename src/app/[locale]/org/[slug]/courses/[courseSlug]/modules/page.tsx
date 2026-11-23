import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { listModules } from "@/modules/lessons/modules";
import { getCourseBySlug } from "@/modules/courses/service";
import CourseBreadcrumb from "@/components/navigation/course-breadcrumb";
import ReorderControls from "./reorder-controls";

export default async function ModulesPage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string }> }) {
  const { locale, slug, courseSlug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const course = await getCourseBySlug(ctx, courseSlug);
  const t = await getTranslations({ locale, namespace: "lesson" });
  const nav = await getTranslations({ locale, namespace: "navigation" });
  let modules: Awaited<ReturnType<typeof listModules>> = [];
  try { modules = await listModules(ctx, courseSlug); } catch {}

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <CourseBreadcrumb locale={locale} orgSlug={slug} courseSlug={courseSlug} courseTitle={course.title} current={nav("breadcrumbModules")} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <a className="rounded border px-3 py-2" href={`/${locale}/org/${slug}/courses/${courseSlug}`}>{nav("backToCourse")}</a>
          <a className="rounded border px-3 py-2" href={`/${locale}/org/${slug}/courses/${courseSlug}/questions`}>{nav("questions")}</a>
          <a className="rounded border px-3 py-2" href={`/${locale}/org/${slug}/courses/${courseSlug}/quizzes`}>{nav("quizzes")}</a>
        </div>
        <a className="rounded bg-slate-900 px-3 py-2 text-white" href={`/${locale}/org/${slug}/courses/${courseSlug}/modules/new`}>{t("newModule")}</a>
      </div>

      <h1 className="mt-6 text-2xl font-semibold">{t("modules")}</h1>
      {modules.length === 0 ? (
        <p className="mt-6 text-slate-600">{t("noModules")}</p>
      ) : (
        <div className="mt-6 space-y-3">
          {modules.map((module) => (
            <div key={module.id} className="flex items-center justify-between gap-3 rounded border p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{module.position + 1}. {module.title}</div>
                <div className="mt-1 text-sm text-slate-600">{module.lessons.length} {t("lessons")}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a className="rounded border px-3 py-2 text-sm" href={`/${locale}/org/${slug}/courses/${courseSlug}/modules/${module.id}`}>
                  {nav("manageLessons")}
                </a>
                <ReorderControls slug={slug} courseSlug={courseSlug} moduleId={module.id} position={module.position} total={modules.length} kind="module" />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
