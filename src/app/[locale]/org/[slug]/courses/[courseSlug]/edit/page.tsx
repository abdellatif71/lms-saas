"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function EditCoursePage() {
  const t = useTranslations("course");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug);
  const courseSlug = String(params.courseSlug);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [course, setCourse] = useState<{ title: string; description: string | null; visibility: string; enrollmentRule: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}`).then((r) => r.ok ? r.json() : null).then(setCourse); }, [slug, courseSlug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description") || "", visibility: form.get("visibility"), enrollmentRule: form.get("enrollmentRule") }) });
    setPending(false); if (!response.ok) setError(t("errors.notAllowed"));
  }

  if (!course) return <main dir={dir} className="p-6">{t("saving")}</main>;
  return <main dir={dir} className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-semibold">{t("editCourse")}</h1><form className="mt-6 space-y-4" onSubmit={submit}><label className="block">{t("title")}<input name="title" defaultValue={course.title} required minLength={3} maxLength={160} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("description")}<textarea name="description" defaultValue={course.description ?? ""} maxLength={5000} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("visibility")}<select name="visibility" defaultValue={course.visibility} className="mt-1 w-full rounded border px-3 py-2"><option value="PRIVATE">{t("visibilityPrivate")}</option><option value="ORG">{t("visibilityOrg")}</option><option value="PUBLIC">{t("visibilityPublic")}</option></select></label><label className="block">{t("enrollmentRule")}<select name="enrollmentRule" defaultValue={course.enrollmentRule} className="mt-1 w-full rounded border px-3 py-2"><option value="OPEN">{t("enrollmentOpen")}</option><option value="INVITE_ONLY">{t("enrollmentInviteOnly")}</option></select></label>{error && <p className="text-red-600">{error}</p>}<button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{pending ? t("saving") : t("save")}</button></form></main>;
}
