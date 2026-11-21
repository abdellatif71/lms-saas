"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function EditLessonPage() {
  const t = useTranslations("lesson");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug), courseSlug = String(params.courseSlug), moduleId = String(params.moduleId), lessonId = String(params.lessonId);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [lesson, setLesson] = useState<{ title: string; contentType: string; bodyText: string | null; externalUrl: string | null; completionRule: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/modules/${encodeURIComponent(moduleId)}/lessons`).then((r) => r.ok ? r.json() : []).then((items) => setLesson(items.find((item: { id: string }) => item.id === lessonId) ?? null)); }, [slug, courseSlug, moduleId, lessonId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = { title: form.get("title"), contentType: form.get("contentType"), bodyText: form.get("bodyText") || undefined, externalUrl: form.get("externalUrl") || undefined, completionRule: form.get("completionRule") };
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setPending(false); if (!response.ok) setError(t("errors.notAllowed"));
  }

  if (!lesson) return <main dir={dir} className="p-6">{t("saving")}</main>;
  return <main dir={dir} className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-semibold">{t("editLesson")}</h1><form className="mt-6 space-y-4" onSubmit={submit}><label className="block">{t("title")}<input name="title" defaultValue={lesson.title} required className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("contentType")}<select name="contentType" defaultValue={lesson.contentType} className="mt-1 w-full rounded border px-3 py-2"><option value="TEXT">{t("contentTypeText")}</option><option value="VIDEO">{t("contentTypeVideo")}</option><option value="PDF">{t("contentTypePdf")}</option><option value="EXTERNAL">{t("contentTypeExternal")}</option></select></label><label className="block">{t("bodyText")}<textarea name="bodyText" defaultValue={lesson.bodyText ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("externalUrl")}<input name="externalUrl" type="url" defaultValue={lesson.externalUrl ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("completionRule")}<select name="completionRule" defaultValue={lesson.completionRule} className="mt-1 w-full rounded border px-3 py-2"><option value="VIEW">{t("ruleView")}</option><option value="MANUAL">{t("ruleManual")}</option><option value="TIME_BASED">{t("ruleTimeBased")}</option></select></label>{error && <p className="text-red-600">{error}</p>}<button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{pending ? t("saving") : t("save")}</button></form></main>;
}
