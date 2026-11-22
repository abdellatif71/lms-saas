import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { getEnrolledCourseContent } from "@/modules/enrollment/service";
import { LessonViewer } from "../../components/LessonViewer";

export default async function LearnCoursePage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string }> }) {
  const { locale, slug, courseSlug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "enrollment" });
  const learning = await getTranslations({ locale, namespace: "learning" });
  const course = await getEnrolledCourseContent(ctx, courseSlug);
  const lessons = course.modules.flatMap((module) => module.lessons);

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div><a className="text-sm text-blue-700 underline" href={`/${locale}/org/${slug}/my-courses`}>{t("back")}</a><h1 className="mt-2 text-2xl font-semibold">{course.title}</h1></div>
      </div>
      {course.modules.length === 0 ? (
        <p className="text-slate-600">{t("courseContent")}</p>
      ) : (
        <LessonViewer slug={slug} courseSlug={courseSlug} lessons={lessons} markCompleteLabel={learning("markComplete")} timeSpentLabel={learning("timeSpent")} completedLabel={learning("completed")} />
      )}
    </main>
  );
}
