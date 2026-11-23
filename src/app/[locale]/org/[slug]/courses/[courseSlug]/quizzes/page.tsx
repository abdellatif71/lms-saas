import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { assertTeacherOrAbove } from "@/modules/auth/permissions";
import { listQuizzes } from "@/modules/quizzes/service";

export default async function QuizzesPage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string }> }) {
  const { locale, slug, courseSlug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "quiz" });
  let quizzes: Awaited<ReturnType<typeof listQuizzes>> = [];
  try { assertTeacherOrAbove(ctx); quizzes = await listQuizzes(ctx, courseSlug); } catch {}
  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{t("quizzes")}</h1><a className="rounded bg-slate-900 px-3 py-2 text-sm text-white" href={`/${locale}/org/${slug}/courses/${courseSlug}/quizzes/new`}>{t("newQuiz")}</a></div>
      <div className="mt-6 grid gap-3">
        {quizzes.length === 0 ? <p className="rounded border border-dashed p-8 text-center text-slate-600">{t("noQuizzes")}</p> : quizzes.map((quiz) => <a key={quiz.id} href={`/${locale}/org/${slug}/courses/${courseSlug}/quizzes/${quiz.id}`} className="flex items-center justify-between rounded border p-4 hover:bg-slate-50"><div><div className="font-medium">{quiz.title}</div><div className="mt-1 text-sm text-slate-600">{t("questionCount", { count: quiz.questionCount })}</div></div><span className="rounded border px-2 py-1 text-xs">{quiz.status}</span></a>)}
      </div>
    </main>
  );
}
