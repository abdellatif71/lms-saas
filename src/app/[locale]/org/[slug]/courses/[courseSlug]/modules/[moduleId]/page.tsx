import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { listModules } from "@/modules/lessons/modules";
import ReorderControls from "../reorder-controls";

export default async function ModuleDetailPage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string; moduleId: string }> }) {
  const { locale, slug, courseSlug, moduleId } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const modules = await listModules(ctx, courseSlug);
  const moduleRecord = modules.find((item) => item.id === moduleId);
  const t = await getTranslations({ locale, namespace: "lesson" });
  if (!moduleRecord) return <main dir={locale === "ar" ? "rtl" : "ltr"} className="p-6">{t("errors.notFound")}</main>;

  return <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-4xl p-6"><a className="text-sm underline" href={`/${locale}/org/${slug}/courses/${courseSlug}/modules`}>{t("back")}</a><h1 className="mt-4 text-2xl font-semibold">{moduleRecord.title}</h1><div className="mt-6 flex justify-between"><h2 className="font-semibold">{t("lessons")}</h2><a className="rounded border px-3 py-2" href={`/${locale}/org/${slug}/courses/${courseSlug}/modules/${moduleId}/lessons/new`}>{t("newLesson")}</a></div>{moduleRecord.lessons.length === 0 ? <p className="mt-4 text-slate-600">{t("noLessons")}</p> : <ul className="mt-4 space-y-2">{moduleRecord.lessons.map((lesson) => <li key={lesson.id} className="flex items-center justify-between gap-3 rounded border p-3"><span>{lesson.position + 1}. {lesson.title}</span><div className="flex items-center gap-2"><a className="underline" href={`/${locale}/org/${slug}/courses/${courseSlug}/modules/${moduleId}/lessons/${lesson.id}/edit`}>{t("editLesson")}</a><ReorderControls slug={slug} courseSlug={courseSlug} moduleId={moduleId} lessonId={lesson.id} position={lesson.position} total={moduleRecord.lessons.length} /></div></li>)}</ul>}</main>;
}
