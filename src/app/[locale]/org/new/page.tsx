"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export default function NewOrganizationPage() {
  const t = useTranslations("org");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = {
      name: String(form.get("name")),
      slug: String(form.get("slug") || "") || undefined,
      description: String(form.get("description") || "") || undefined,
      defaultLocale: locale,
    };
    const response = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.code === "CONFLICT" ? t("errors.invalidSlug") : t("errors.generic"));
      return;
    }
    const data = await response.json();
    window.location.assign(`/${locale}/org/${data.slug}/settings`);
  }

  return (
    <main dir={dir} className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">{t("newOrg")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">{t("name")}<input name="name" required minLength={2} maxLength={120} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="block">{t("slug")}<input name="slug" pattern="[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?" className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="block">{t("description")}<textarea name="description" maxLength={2000} className="mt-1 w-full rounded border px-3 py-2" /></label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60" type="submit">{pending ? t("saving") : t("save")}</button>
      </form>
    </main>
  );
}
