"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function InviteMemberPage() {
  const t = useTranslations("org");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), role: form.get("role") }),
    });
    setPending(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.code === "CONFLICT" ? t("errors.alreadyMember") : t("errors.generic"));
      return;
    }
    setMessage(t("invitationSent"));
  }

  return (
    <main dir={dir} className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">{t("inviteMember")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">{t("memberEmail")}<input name="email" type="email" required className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="block">{t("memberRole")}<select name="role" className="mt-1 w-full rounded border px-3 py-2"><option value="ORG_ADMIN">{t("roleAdmin")}</option><option value="TEACHER">{t("roleTeacher")}</option><option value="STUDENT">{t("roleStudent")}</option><option value="PARENT">{t("roleParent")}</option></select></label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        {message && <p className="text-sm text-green-700" role="status">{message}</p>}
        <button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60" type="submit">{pending ? t("saving") : t("save")}</button>
      </form>
    </main>
  );
}
