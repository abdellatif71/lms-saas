import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { listMyEnrollments } from "@/modules/enrollment/service";
import { LeaveButton } from "../courses/components/LeaveButton";
import { getCourseProgress, getResumePosition } from "@/modules/learning/service";
import { formatTimeSpent } from "@/modules/learning/navigation";

export default async function MyCoursesPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "enrollment" });
  const learning = await getTranslations({ locale, namespace: "learning" });
  const learn = await getTranslations({ locale, namespace: "learn" });
  const enrollments = await listMyEnrollments(ctx);
  const courseProgress = await Promise.all(enrollments.map((enrollment) => getCourseProgress(ctx, enrollment.course.slug)));
  const resumePositions = await Promise.all(enrollments.map((enrollment) => getResumePosition(ctx, enrollment.course.slug)));

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("myCourses")}</h1>
        <a className="text-sm text-blue-700 underline" href={`/${locale}/org/${slug}/courses/available`}>{t("browseCourses")}</a>
      </div>
      {enrollments.length === 0 ? (
        <div className="mt-10 rounded border border-dashed p-8 text-center">
          <p className="text-slate-700">{learn("emptyMyCourses")}</p>
          <a className="mt-4 inline-block rounded bg-slate-900 px-4 py-2 text-sm text-white" href={`/${locale}/org/${slug}/courses/available`}>{learn("browseCourses")}</a>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {enrollments.map((enrollment, index) => {
            const progress = courseProgress[index];
            const resume = resumePositions[index];
            const blocked = enrollment.course.modules?.some((module) => module.lessons.some((lesson) => lesson.progress.length > 0)) ?? false;
            const percentage = progress?.percentage ?? 0;
            const continueHref = resume?.completed
              ? `/${locale}/org/${slug}/courses/${enrollment.course.slug}/learn/complete`
              : resume?.lessonId
                ? `/${locale}/org/${slug}/courses/${enrollment.course.slug}/learn/${resume.lessonId}`
                : `/${locale}/org/${slug}/courses/${enrollment.course.slug}/learn`;

            return (
              <article key={enrollment.id} className="grid gap-4 rounded border p-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                <div className="flex h-24 items-center justify-center rounded bg-slate-100 text-sm text-slate-500">{enrollment.course.category?.name ?? "Course"}</div>
                <div>
                  <div className="font-medium">{enrollment.course.title}</div>
                  {enrollment.course.category && <div className="mt-1 text-xs text-slate-500">{enrollment.course.category.name}</div>}
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-xs text-slate-600"><span>{learning("courseProgress")}</span><span>{percentage}%</span></div>
                    <div className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-blue-600" style={{ width: `${percentage}%` }} /></div>
                    <div className="mt-2 text-xs text-slate-600">{learn("xOfYLessons").replace("{completed}", String(progress?.completedLessons ?? 0)).replace("{total}", String(progress?.totalLessons ?? 0))} · {learn("totalTimeSpent")}: {formatTimeSpent(progress?.totalTimeMs ?? 0)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {enrollment.status === "ACTIVE" && <a className="rounded bg-slate-900 px-3 py-2 text-sm text-white" href={continueHref}>{learn("continueLearning")}</a>}
                  {enrollment.status === "ACTIVE" && (
                    <LeaveButton slug={slug} courseSlug={enrollment.course.slug} label={blocked ? t("leaveBlocked") : t("leave")} leavingLabel={t("leaving")} blocked={blocked} />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
