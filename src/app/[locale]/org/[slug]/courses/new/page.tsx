"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function NewCoursePage() {
  const t = useTranslations("course");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/organizations/${encodeURIComponent(slug)}/categories`).then((r) => r.ok ? r.json() : []).then(setCategories).catch(() => setCategories([]));
  }, [slug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = { title: form.get("title"), description: form.get("description") || undefined, categoryId: form.get("categoryId") || undefined, visibility: form.get("visibility"), enrollmentRule: form.get("enrollmentRule") };
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setPending(false);
    if (!response.ok) { setError(t("errors.notAllowed")); return; }
    const course = await response.json();
    window.location.assign(`/${locale}/org/${slug}/courses/${course.slug}`);
  }

  return <main dir={dir} className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-semibold">{t("newCourse")}</h1><form className="mt-6 space-y-4" onSubmit={submit}><label className="block">{t("title")}<input name="title" required minLength={3} maxLength={160} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("description")}<textarea name="description" maxLength={5000} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("category")}<select name="categoryId" className="mt-1 w-full rounded border px-3 py-2"><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="block">{t("visibility")}<select name="visibility" className="mt-1 w-full rounded border px-3 py-2"><option value="ORG">{t("visibilityOrg")}</option><option value="PRIVATE">{t("visibilityPrivate")}</option><option value="PUBLIC">{t("visibilityPublic")}</option></select></label><label className="block">{t("enrollmentRule")}<select name="enrollmentRule" className="mt-1 w-full rounded border px-3 py-2"><option value="OPEN">{t("enrollmentOpen")}</option><option value="INVITE_ONLY">{t("enrollmentInviteOnly")}</option></select></label>{error && <p className="text-red-600">{error}</p>}<button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{pending ? t("saving") : t("save")}</button></form></main>;
}
