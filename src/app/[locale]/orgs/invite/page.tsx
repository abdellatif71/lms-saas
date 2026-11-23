"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export default function AcceptInvitationPage() {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: String(form.get("token")) }),
    });
    setPending(false);

    if (!response.ok) {
      setError(t("invalidInvitation"));
      return;
    }

    window.location.assign(`/${locale}/dashboard`);
  }

  return (
    <main dir={dir} className="mx-auto max-w-xl p-6">
      <a className="text-sm text-slate-600 underline" href={`/${locale}/dashboard`}>{t("back")}</a>
      <h1 className="mt-4 text-2xl font-semibold">{t("acceptInvitation")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">
          Token
          <input name="token" required minLength={10} maxLength={200} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60" type="submit">
          {pending ? t("accepting") : t("accept")}
        </button>
      </form>
    </main>
  );
}
