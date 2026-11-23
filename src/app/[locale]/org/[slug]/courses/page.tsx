import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { listCourses } from "@/modules/courses/service";
import { MemberRole } from "@/generated/prisma/enums";
import CourseBreadcrumb from "@/components/navigation/course-breadcrumb";

export default async function CoursesPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ category?: string }> }) {
  const { locale, slug } = await params;
  const filter = await searchParams;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "course" });
  const nav = await getTranslations({ locale, namespace: "navigation" });
  let courses: Awaited<ReturnType<typeof listCourses>> = [];
  let forbidden = false;
  try { courses = await listCourses(ctx); } catch { forbidden = true; }
  if (filter.category) courses = courses.filter((course) => course.categoryId === filter.category);

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <CourseBreadcrumb
        locale={locale}
        orgSlug={slug}
        current={nav("breadcrumbCourses")}
      />

      <nav aria-label="Organization navigation" className="flex flex-wrap items-center gap-2 rounded border p-2">
        <span className="rounded bg-slate-900 px-3 py-2 text-sm text-white">{nav("navCourses")}</span>
        <a className="rounded border px-3 py-2 text-sm" href={`/${locale}/org/${slug}/categories`}>{nav("navCategories")}</a>
        <a className="rounded border px-3 py-2 text-sm" href={`/${locale}/org/${slug}/members`}>{nav("navMembers")}</a>
        <a className="rounded border px-3 py-2 text-sm" href={`/${locale}/dashboard`}>{nav("navDashboard")}</a>
        <a className="rounded border px-3 py-2 text-sm" href={`/${locale}/org/${slug}`}>{nav("backToOrganization")}</a>
      </nav>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("list")}</h1>
        {ctx.role === MemberRole.STUDENT ? (
          <div className="flex flex-wrap gap-3">
            <a className="rounded border px-3 py-2" href={`/${locale}/org/${slug}/my-courses`}>{nav("navMyCourses")}</a>
            <a className="rounded bg-slate-900 px-3 py-2 text-white" href={`/${locale}/org/${slug}/courses/available`}>{nav("navAvailableCourses")}</a>
          </div>
        ) : !forbidden && (
          <a className="rounded bg-slate-900 px-3 py-2 text-white" href={`/${locale}/org/${slug}/courses/new`}>{t("newCourse")}</a>
        )}
      </div>

      {forbidden || courses.length === 0 ? (
        <p className="mt-6 text-slate-600">{t("noCourses")}</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {courses.map((course) => (
            <a
              key={course.id}
              href={`/${locale}/org/${slug}/courses/${course.slug}`}
              className="flex items-center justify-between gap-3 rounded border p-4 hover:bg-slate-50"
            >
              <div>
                <div className="font-medium">{course.title}</div>
                <span className="mt-2 inline-block rounded-full border px-2 py-1 text-xs text-slate-600">
                  {course.status}
                </span>
              </div>
              <span className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
                {nav("manageCourse")}
              </span>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
