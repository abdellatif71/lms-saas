"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

export default function SettingsForm({ locale, slug, org }: {
  locale: string;
  slug: string;
  org: { name: string; description: string | null; defaultLocale: string };
}) {
  const t = useTranslations("org");
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name")),
        description: String(form.get("description") ?? ""),
        defaultLocale: String(form.get("defaultLocale")),
      }),
    });
    setPending(false);
    if (!response.ok) setError(t("errors.generic"));
  }

  return (
    <form dir={dir} className="mt-6 space-y-4" onSubmit={submit}>
      <label className="block">{t("name")}<input name="name" defaultValue={org.name} required minLength={2} maxLength={120} className="mt-1 w-full rounded border px-3 py-2" /></label>
      <label className="block">{t("description")}<textarea name="description" defaultValue={org.description ?? ""} maxLength={2000} className="mt-1 w-full rounded border px-3 py-2" /></label>
      <label className="block">{t("defaultLocale")}<select name="defaultLocale" defaultValue={org.defaultLocale} className="mt-1 w-full rounded border px-3 py-2"><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select></label>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60" type="submit">{pending ? t("saving") : t("save")}</button>
    </form>
  );
}
