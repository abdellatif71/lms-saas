"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }),
    });
    setPending(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error === "CONFLICT" ? t("errors.emailTaken") : data?.error === "RATE_LIMITED" ? t("errors.rateLimited") : t("errors.generic"));
      return;
    }
    window.location.assign(`/${locale}/login`);
  }

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-semibold text-slate-900">{t("register")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">{t("name")}<input name="name" required minLength={1} maxLength={120} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-slate-700">{t("email")}<input name="email" type="email" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-slate-700">{t("password")}<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={pending} className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60" type="submit">{pending ? t("submitting") : t("submit")}</button>
      </form>
      <a className="mt-4 block text-sm text-slate-700 underline" href={`/${locale}/login`}>{t("login")}</a>
    </div>
  );
}
