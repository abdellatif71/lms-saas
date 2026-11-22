"use client";

import { ReactNode, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export type PlayerLesson = {
  id: string;
  title: string;
  position: number;
  status?: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
};

export type PlayerModule = {
  id: string;
  title: string;
  position: number;
  lessons: PlayerLesson[];
};

export function CoursePlayer({
  slug,
  courseSlug,
  courseTitle,
  modules,
  activeLessonId,
  percentage,
  children,
}: {
  slug: string;
  courseSlug: string;
  courseTitle: string;
  modules: PlayerModule[];
  activeLessonId: string;
  percentage: number;
  children: ReactNode;
}) {
  const t = useTranslations("learn");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebar = (
    <aside className="h-full w-72 shrink-0 border-e border-slate-200 bg-white p-4">
      {modules.map((module) => (
        <div key={module.id} className="mb-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{module.title}</div>
          <div className="space-y-1">
            {[...module.lessons].sort((a, b) => a.position - b.position).map((lesson) => {
              const active = lesson.id === activeLessonId;
              const completed = lesson.status === "COMPLETED";
              const inProgress = lesson.status === "IN_PROGRESS";
              return (
                <a
                  key={lesson.id}
                  href={`/${locale}/org/${slug}/courses/${courseSlug}/learn/${lesson.id}`}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-2 rounded px-2 py-2 text-sm ${active ? "bg-blue-50 font-semibold text-blue-800" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span aria-label={completed ? t("completed") : inProgress ? t("inProgress") : t("notStarted")} className={`h-3 w-3 shrink-0 rounded-full border ${completed ? "border-emerald-600 bg-emerald-600" : inProgress ? "border-blue-600 bg-blue-200" : "border-slate-400"}`} />
                  <span className="truncate">{lesson.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );

  return (
    <div dir={dir} className="min-h-[calc(100vh-3rem)]">
      <header className="mb-4 rounded border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="rounded border px-3 py-2 md:hidden" aria-label={t("coursePlayer")} onClick={() => setDrawerOpen(true)}>☰</button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-slate-900">{courseTitle}</div>
            <div className="mt-1 text-xs text-slate-600">{percentage}% {t("progress")}</div>
          </div>
          <a className="text-sm text-blue-700 underline" href={`/${locale}/org/${slug}/my-courses`}>{t("backToMyCourses")}</a>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" aria-label={t("back")} className="absolute inset-0 bg-slate-950/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 start-0 shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="hidden md:block">{sidebar}</div>
        <main className="min-w-0 flex-1 rounded border border-slate-200 bg-white p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
