import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { listMyEnrollments } from "@/modules/enrollment/service";
import { LeaveButton } from "../courses/components/LeaveButton";
import { getCourseProgress } from "@/modules/learning/service";

export default async function MyCoursesPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "enrollment" });
  const learning = await getTranslations({ locale, namespace: "learning" });
  const enrollments = await listMyEnrollments(ctx);
  const courseProgress = await Promise.all(enrollments.map((enrollment) => getCourseProgress(ctx, enrollment.course.slug)));

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("myCourses")}</h1>
        <a className="text-sm text-blue-700 underline" href={`/${locale}/org/${slug}/courses/available`}>{t("browseCourses")}</a>
      </div>
      {enrollments.length === 0 ? (
        <p className="mt-6 text-slate-600">{t("noEnrollments")}</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {enrollments.map((enrollment, index) => {
            const progress = courseProgress[index];
            const blocked = enrollment.course.modules?.some((module) => module.lessons.some((lesson) => lesson.progress.length > 0)) ?? false;
            return (
              <article key={enrollment.id} className="flex items-center justify-between gap-4 rounded border p-4">
                <div>
                  {enrollment.status === "ACTIVE" ? (
                    <a className="font-medium text-blue-700 underline" href={`/${locale}/org/${slug}/courses/${enrollment.course.slug}/learn`}>{enrollment.course.title}</a>
                  ) : <div className="font-medium">{enrollment.course.title}</div>}
                  <div className="mt-1 text-sm text-slate-600">{enrollment.status}</div>
                  <div className="mt-2 min-w-52">
                    <div className="mb-1 flex justify-between text-xs text-slate-600"><span>{learning("courseProgress")}</span><span>{progress?.percentage ?? 0}%</span></div>
                    <div className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-blue-600" style={{ width: `${progress?.percentage ?? 0}%` }} /></div>
                  </div>
                </div>
                <div className="whitespace-nowrap text-sm text-slate-600">{progress?.percentage ?? 0}%</div>
                {enrollment.status === "ACTIVE" && (
                  <LeaveButton slug={slug} courseSlug={enrollment.course.slug} label={blocked ? t("leaveBlocked") : t("leave")} leavingLabel={t("leaving")} blocked={blocked} />
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
