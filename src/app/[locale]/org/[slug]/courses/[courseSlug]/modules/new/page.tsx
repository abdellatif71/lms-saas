"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function NewModulePage() {
  const t = useTranslations("lesson");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug);
  const courseSlug = String(params.courseSlug);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/modules`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title") }) });
    setPending(false);
    if (!response.ok) { setError(t("errors.notAllowed")); return; }
    window.location.assign(`/${locale}/org/${slug}/courses/${courseSlug}/modules`);
  }

  return <main dir={dir} className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-semibold">{t("newModule")}</h1><form className="mt-6 space-y-4" onSubmit={submit}><label className="block">{t("title")}<input name="title" required minLength={2} maxLength={160} className="mt-1 w-full rounded border px-3 py-2" /></label>{error && <p className="text-red-600">{error}</p>}<button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{pending ? t("saving") : t("save")}</button></form></main>;
}
