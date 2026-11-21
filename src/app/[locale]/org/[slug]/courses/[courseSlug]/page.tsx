import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { getCourseBySlug } from "@/modules/courses/service";
import CourseStatusActions from "./status-actions";

export default async function CourseDetailPage({ params }: { params: Promise<{ locale: string; slug: string; courseSlug: string }> }) {
  const { locale, slug, courseSlug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const course = await getCourseBySlug(ctx, courseSlug);
  const t = await getTranslations({ locale, namespace: "course" });
  const admin = ctx.role === "ORG_OWNER" || ctx.role === "ORG_ADMIN";

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-3xl p-6">
      <a className="text-sm underline" href={`/${locale}/org/${slug}/courses`}>
        {t("back")}
      </a>
      <h1 className="mt-4 text-2xl font-semibold">{course.title}</h1>
      <p className="mt-2 text-slate-600">{course.description ?? "—"}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded border px-2 py-1">{course.status}</span>
        {admin && (
          <>
            <a
              className="rounded border px-2 py-1"
              href={`/${locale}/org/${slug}/courses/${courseSlug}/edit`}
            >
              {t("editCourse")}
            </a>
            <CourseStatusActions slug={slug} courseSlug={courseSlug} status={course.status} />
          </>
        )}
      </div>
    </main>
  );
}
