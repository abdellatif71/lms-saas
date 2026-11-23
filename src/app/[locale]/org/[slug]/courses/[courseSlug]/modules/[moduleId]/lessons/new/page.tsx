"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import FileUploader from "@/components/file-uploader";

export default function NewLessonPage() {
  const t = useTranslations("lesson");
  const nav = useTranslations("navigation");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug), courseSlug = String(params.courseSlug), moduleId = String(params.moduleId);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [contentType, setContentType] = useState("TEXT");
  const [fileId, setFileId] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget); const body = { title: form.get("title"), contentType, bodyText: contentType === "TEXT" ? form.get("bodyText") : undefined, externalUrl: contentType === "VIDEO" || contentType === "EXTERNAL" ? form.get("externalUrl") : undefined, fileId: fileId || undefined, estimatedMinutes: form.get("estimatedMinutes") ? Number(form.get("estimatedMinutes")) : undefined, completionRule: form.get("completionRule") };
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/modules/${encodeURIComponent(moduleId)}/lessons`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setPending(false); if (!response.ok) { setError(t("errors.contentRequired")); return; }
    window.location.assign(`/${locale}/org/${slug}/courses/${courseSlug}/modules/${moduleId}`);
  }

  return (
    <main dir={dir} className="mx-auto max-w-xl p-6">
      <a className="text-sm underline" href={`/${locale}/org/${slug}/courses/${courseSlug}/modules/${moduleId}`}>{nav("backToModules")}</a>
      <h1 className="text-2xl font-semibold">{t("newLesson")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">{t("title")}<input name="title" required minLength={2} maxLength={160} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="block">{t("contentType")}
          <select name="contentType" value={contentType} onChange={(event) => setContentType(event.target.value)} className="mt-1 w-full rounded border px-3 py-2">
            <option value="TEXT">{t("contentTypeText")}</option><option value="VIDEO">{t("contentTypeVideo")}</option><option value="PDF">{t("contentTypePdf")}</option><option value="EXTERNAL">{t("contentTypeExternal")}</option>
          </select>
        </label>
        {contentType === "TEXT" && <label className="block">{t("bodyText")}<textarea name="bodyText" maxLength={20000} className="mt-1 w-full rounded border px-3 py-2" /></label>}
        {(contentType === "VIDEO" || contentType === "EXTERNAL") && <label className="block">{t("externalUrl")}<input name="externalUrl" type="url" className="mt-1 w-full rounded border px-3 py-2" /></label>}
        {contentType === "PDF" && <FileUploader orgSlug={slug} purpose="LESSON_PDF" accept="application/pdf" onUploaded={setFileId} />}
        <label className="block">{t("estimatedMinutes")}<input name="estimatedMinutes" type="number" min="1" max="600" className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="block">{t("completionRule")}<select name="completionRule" className="mt-1 w-full rounded border px-3 py-2"><option value="VIEW">{t("ruleView")}</option><option value="MANUAL">{t("ruleManual")}</option><option value="TIME_BASED">{t("ruleTimeBased")}</option></select></label>
        {error && <p className="text-red-600">{error}</p>}
        <button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{pending ? t("saving") : t("save")}</button>
      </form>
    </main>
  );
}
