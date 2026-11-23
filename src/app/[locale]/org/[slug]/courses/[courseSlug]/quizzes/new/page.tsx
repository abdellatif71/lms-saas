"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function NewQuizPage() {
  const t = useTranslations("quiz");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug), courseSlug = String(params.courseSlug);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = { title: form.get("title"), description: form.get("description") || undefined, timeLimitMin: form.get("timeLimitMin") ? Number(form.get("timeLimitMin")) : undefined, passingScore: Number(form.get("passingScore") || 60), maxAttempts: Number(form.get("maxAttempts") || 1), shuffleQuestions: form.get("shuffleQuestions") === "on", shuffleOptions: form.get("shuffleOptions") === "on" };
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/quizzes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setPending(false);
    if (!response.ok) { setError(t("errors.invalidType")); return; }
    const quiz = await response.json();
    window.location.assign(`/${locale}/org/${slug}/courses/${courseSlug}/quizzes/${quiz.id}/assemble`);
  }

  return <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6"><h1 className="text-2xl font-semibold">{t("newQuiz")}</h1><form onSubmit={submit} className="mt-6 space-y-4"><label className="block">{t("title")}<input name="title" required minLength={3} maxLength={160} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("description")}<textarea name="description" maxLength={5000} className="mt-1 w-full rounded border px-3 py-2" /></label><div className="grid gap-3 sm:grid-cols-3"><label>{t("timeLimit")}<input name="timeLimitMin" type="number" min="1" max="600" className="mt-1 w-full rounded border px-3 py-2" /></label><label>{t("passingScore")}<input name="passingScore" type="number" min="0" max="100" defaultValue="60" className="mt-1 w-full rounded border px-3 py-2" /></label><label>{t("maxAttempts")}<input name="maxAttempts" type="number" min="1" max="10" defaultValue="1" className="mt-1 w-full rounded border px-3 py-2" /></label></div><label className="flex items-center gap-2"><input name="shuffleQuestions" type="checkbox" />{t("shuffleQuestions")}</label><label className="flex items-center gap-2"><input name="shuffleOptions" type="checkbox" />{t("shuffleOptions")}</label>{error && <p className="text-red-700">{error}</p>}<div className="flex gap-2"><button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white">{pending ? t("saving") : t("save")}</button><a className="rounded border px-4 py-2" href={`/${locale}/org/${slug}/courses/${courseSlug}/quizzes`}>{t("cancel")}</a></div></form></main>;
}
