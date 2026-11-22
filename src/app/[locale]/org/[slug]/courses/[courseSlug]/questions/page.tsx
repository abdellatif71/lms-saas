import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { assertTeacherOrAbove } from "@/modules/auth/permissions";
import { listQuestions } from "@/modules/questions/service";

export default async function QuestionsPage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string }> }) {
  const { locale, slug, courseSlug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "question" });
  try { assertTeacherOrAbove(ctx); } catch { return <main dir={locale === "ar" ? "rtl" : "ltr"} className="p-6 text-red-700">{t("errors.notAllowed")}</main>; }

  const questions = await listQuestions(ctx, courseSlug);
  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("questions")}</h1>
        <a className="rounded bg-slate-900 px-3 py-2 text-sm text-white" href={`/${locale}/org/${slug}/courses/${courseSlug}/questions/new`}>{t("newQuestion")}</a>
      </div>
      {questions.length === 0 ? <p className="mt-8 rounded border border-dashed p-8 text-center text-slate-600">{t("noQuestions")}</p> : (
        <div className="mt-6 space-y-2">
          {questions.map((question) => <a key={question.id} href={`/${locale}/org/${slug}/courses/${courseSlug}/questions/${question.id}/edit`} className="block rounded border p-4 hover:bg-slate-50"><div className="font-medium">{question.prompt}</div><div className="mt-1 text-sm text-slate-600">{question.type} · {question.points} {t("points")}</div></a>)}
        </div>
      )}
    </main>
  );
}
