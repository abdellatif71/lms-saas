"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";

export default function LoginPage() {
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
    const result = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
      callbackUrl: `/${locale}`,
    });
    setPending(false);
    if (result?.error) setError(t("errors.invalidCredentials"));
    else if (result?.ok) window.location.assign(`/${locale}`);
  }

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-semibold text-slate-900">{t("login")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">
          {t("email")}
          <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {t("password")}
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={pending} className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60" type="submit">
          {pending ? t("submitting") : t("submit")}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <a className="text-slate-700 underline" href={`/${locale}/register`}>{t("register")}</a>
        <a className="text-slate-700 underline" href={`/${locale}/forgot-password`}>{t("forgotPassword")}</a>
      </div>
    </div>
  );
}
