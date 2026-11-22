import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/client";
import { getCourseProgress, getResumePosition } from "@/modules/learning/service";
import { formatTimeSpent } from "@/modules/learning/navigation";

export default async function CourseCompletionPage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string }> }) {
  const { locale, slug, courseSlug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const resume = await getResumePosition(ctx, courseSlug);
  const progress = await getCourseProgress(ctx, courseSlug);
  if (!resume.completed || progress.percentage !== 100) {
    if (resume.lessonId) redirect(`/${locale}/org/${slug}/courses/${courseSlug}/learn/${resume.lessonId}`);
    redirect(`/${locale}/org/${slug}/courses/${courseSlug}/learn`);
  }

  const completed = await prisma.lessonProgress.findMany({
    where: { organizationId: ctx.organizationId, studentUserId: ctx.userId, state: "COMPLETED", lesson: { module: { course: { slug: courseSlug, organizationId: ctx.organizationId } } } },
    orderBy: { completedAt: "desc" },
    take: 1,
  });
  const learn = await getTranslations({ locale, namespace: "learn" });

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6 text-center">
      <div className="mt-10 rounded-xl border border-emerald-200 bg-emerald-50 p-8">
        <div className="text-5xl" aria-hidden="true">✓</div>
        <h1 className="mt-4 text-3xl font-bold text-emerald-950">{learn("courseCompleted")}</h1>
        <p className="mt-3 text-slate-700">{learn("totalTimeSpent")}: {formatTimeSpent(progress.totalTimeMs)}</p>
        {completed[0]?.completedAt && <p className="mt-2 text-sm text-slate-600">{new Intl.DateTimeFormat(locale).format(completed[0].completedAt)}</p>}
        <p className="mt-6 text-sm text-slate-600">{learn("certificateComingSoon")}</p>
        <a className="mt-6 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" href={`/${locale}/org/${slug}/my-courses`}>{learn("backToMyCourses")}</a>
      </div>
    </main>
  );
}
