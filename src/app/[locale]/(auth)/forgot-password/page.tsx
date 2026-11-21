"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    setPending(false);
    setMessage(t("success.resetEmailSent"));
  }

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-semibold text-slate-900">{t("forgotPassword")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">{t("email")}<input name="email" type="email" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        {message && <p className="text-sm text-green-700" role="status">{message}</p>}
        <button disabled={pending} className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60" type="submit">{pending ? t("submitting") : t("submit")}</button>
      </form>
    </div>
  );
}
