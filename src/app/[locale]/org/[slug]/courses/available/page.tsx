import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { listAvailableCourses } from "@/modules/enrollment/service";
import { EnrollButton } from "../components/EnrollButton";

export default async function AvailableCoursesPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "enrollment" });
  const courses = await listAvailableCourses(ctx);

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("availableCourses")}</h1>
        <a className="text-sm text-blue-700 underline" href={`/${locale}/org/${slug}/my-courses`}>{t("myCourses")}</a>
      </div>
      {courses.length === 0 ? (
        <p className="mt-6 text-slate-600">{t("noAvailable")}</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {courses.map((course) => (
            <article key={course.id} className="flex items-center justify-between gap-4 rounded border p-4">
              <div><div className="font-medium">{course.title}</div>{course.description && <p className="mt-1 text-sm text-slate-600">{course.description}</p>}</div>
              <EnrollButton slug={slug} courseSlug={course.slug} label={t("enroll")} enrollingLabel={t("enrolling")} />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
