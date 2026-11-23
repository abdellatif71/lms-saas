import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { getQuizStudent, getQuizTeacher } from "@/modules/quizzes/service";
import { MemberRole } from "@/generated/prisma/enums";
import QuizStatusActions from "./status-actions";

export default async function QuizDetailPage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string; quizId: string }> }) {
  const { locale, slug, courseSlug, quizId } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "quiz" });
  let quiz: Awaited<ReturnType<typeof getQuizTeacher>> | Awaited<ReturnType<typeof getQuizStudent>> | null = null;
  try { quiz = ctx.role === MemberRole.STUDENT ? await getQuizStudent(ctx, quizId) : await getQuizTeacher(ctx, quizId); } catch {}
  if (!quiz) return <main dir={locale === "ar" ? "rtl" : "ltr"} className="p-6 text-red-700">{t("errors.notFound")}</main>;
  const isStudent = ctx.role === MemberRole.STUDENT;
  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-4xl p-6">
      <a className="text-sm underline" href={`/${locale}/org/${slug}/courses/${courseSlug}/quizzes`}>{t("back")}</a>
      <div className="mt-4 flex items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{String(quiz.title)}</h1>{!isStudent && <span className="rounded border px-2 py-1 text-xs">{String(quiz.status)}</span>}</div>
      {quiz.description && <p className="mt-2 text-slate-600">{String(quiz.description)}</p>}
      {!isStudent && <div className="mt-4 flex flex-wrap gap-2"><a className="rounded border px-3 py-2" href={`/${locale}/org/${slug}/courses/${courseSlug}/quizzes/${quizId}/edit`}>{t("editQuiz")}</a><a className="rounded border px-3 py-2" href={`/${locale}/org/${slug}/courses/${courseSlug}/quizzes/${quizId}/assemble`}>{t("assemble")}</a>{(ctx.role === MemberRole.ORG_OWNER || ctx.role === MemberRole.ORG_ADMIN) && <QuizStatusActions slug={slug} courseSlug={courseSlug} quizId={quizId} status={String(quiz.status)} />}</div>}
      <div className="mt-6 space-y-2">{quiz.questions.length === 0 ? <p className="rounded border border-dashed p-8 text-center text-slate-600">{t("noQuestions")}</p> : quiz.questions.map((item: { id: string; position: number; points: number; question: { prompt: string } }) => <div key={item.id} className="rounded border p-4"><div className="font-medium">{item.position + 1}. {item.question.prompt}</div><div className="mt-1 text-sm text-slate-600">{item.points} {t("points")}</div></div>)}</div>
      {isStudent && <button disabled className="mt-4 rounded border px-4 py-2 text-slate-500">{t("startQuiz")} — {t("comingSoon")}</button>}
    </main>
  );
}
