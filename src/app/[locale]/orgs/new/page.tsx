"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export default function NewOrganizationPage() {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [slug, setSlug] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name")),
        slug: String(form.get("slug") || "") || undefined,
        description: String(form.get("description") || "") || undefined,
        defaultLocale: locale,
      }),
    });
    setPending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message || t("invalidInvitation"));
      return;
    }

    window.location.assign(`/${locale}/dashboard`);
  }

  return (
    <main dir={dir} className="mx-auto max-w-xl p-6">
      <a className="text-sm text-slate-600 underline" href={`/${locale}/dashboard`}>{t("back")}</a>
      <h1 className="mt-4 text-2xl font-semibold">{t("createOrg")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">
          {t("orgName")}
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            onChange={(event) => setSlug(slugify(event.currentTarget.value))}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          {t("orgSlug")}
          <input
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
            pattern="[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?"
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          {t("orgDescription")}
          <textarea name="description" maxLength={2000} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60" type="submit">
          {pending ? t("creating") : t("create")}
        </button>
      </form>
    </main>
  );
}
