import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { listCourses } from "@/modules/courses/service";

export default async function CoursesPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ category?: string }> }) {
  const { locale, slug } = await params;
  const filter = await searchParams;
  await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const t = await getTranslations({ locale, namespace: "course" });
  let courses: Awaited<ReturnType<typeof listCourses>> = [];
  let forbidden = false;
  try { courses = await listCourses(ctx); } catch { forbidden = true; }
  if (filter.category) courses = courses.filter((course) => course.categoryId === filter.category);

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">{t("list")}</h1>{!forbidden && <a className="rounded bg-slate-900 px-3 py-2 text-white" href={`/${locale}/org/${slug}/courses/new`}>{t("newCourse")}</a>}</div>
      {forbidden || courses.length === 0 ? <p className="mt-6 text-slate-600">{t("noCourses")}</p> : <div className="mt-6 grid gap-3">{courses.map((course) => <a key={course.id} href={`/${locale}/org/${slug}/courses/${course.slug}`} className="rounded border p-4"><div className="font-medium">{course.title}</div><div className="mt-1 text-sm text-slate-600">{course.status}</div></a>)}</div>}
    </main>
  );
}
