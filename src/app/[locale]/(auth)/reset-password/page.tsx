"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword"));
    const confirmPassword = String(form.get("confirmPassword"));
    if (newPassword !== confirmPassword) { setError(t("errors.passwordMismatch")); return; }
    setPending(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: searchParams.get("token") ?? "", newPassword }),
    });
    setPending(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error === "VALIDATION_ERROR" ? t("errors.tokenExpired") : data?.error === "NOT_FOUND" ? t("errors.tokenInvalid") : data?.error === "RATE_LIMITED" ? t("errors.rateLimited") : t("errors.generic"));
      return;
    }
    setMessage(t("success.passwordReset"));
  }

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-semibold text-slate-900">{t("resetPassword")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">{t("newPassword")}<input name="newPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-slate-700">{t("confirmPassword")}<input name="confirmPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {message && <p className="text-sm text-green-700" role="status">{message}</p>}
        <button disabled={pending} className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60" type="submit">{pending ? t("submitting") : t("submit")}</button>
      </form>
    </div>
  );
}
