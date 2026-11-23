"use client";

import { useTranslations } from "next-intl";

interface CourseBreadcrumbProps {
  locale: string;
  orgSlug: string;
  courseSlug?: string;
  courseTitle?: string;
  current: string;
  moduleId?: string;
  moduleTitle?: string;
}

export default function CourseBreadcrumb({
  locale,
  orgSlug,
  courseSlug,
  courseTitle,
  current,
  moduleId,
  moduleTitle,
}: CourseBreadcrumbProps) {
  const t = useTranslations("navigation");

  return (
    <nav aria-label="Breadcrumb" dir={locale === "ar" ? "rtl" : "ltr"} className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-600">
      <a className="underline" href={`/${locale}`}>{t("breadcrumbHome")}</a>
      <span aria-hidden="true" className="px-1">/</span>
      <a className="underline" href={`/${locale}/org/${orgSlug}/courses`}>{t("breadcrumbOrg")}</a>
      {courseSlug && courseTitle && (
        <>
          <span aria-hidden="true" className="px-1">/</span>
          <a className="underline" href={`/${locale}/org/${orgSlug}/courses/${courseSlug}`}>
            {t("breadcrumbCourse")}: {courseTitle}
          </a>
        </>
      )}
      {moduleId && moduleTitle && (
        <>
          <span aria-hidden="true" className="px-1">/</span>
          <a className="underline" href={`/${locale}/org/${orgSlug}/courses/${courseSlug}/modules/${moduleId}`}>
            {t("breadcrumbModule")}: {moduleTitle}
          </a>
        </>
      )}
      <span aria-hidden="true" className="px-1">/</span>
      <span aria-current="page" className="font-medium text-slate-900">{current}</span>
    </nav>
  );
}
