"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function EditQuestionPage() {
  const t = useTranslations("question");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug), courseSlug = String(params.courseSlug), questionId = String(params.questionId);
  const [question, setQuestion] = useState<{ id: string; type: string; prompt: string; explanation: string | null; points: number; correctBoolean: boolean | null; expectedAnswer: string | null; options: Array<{ id?: string; label: string; isCorrect: boolean; position: number }> } | null>(null);
  const [options, setOptions] = useState<Array<{ id?: string; label: string; isCorrect: boolean; position: number }>>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/questions/${encodeURIComponent(questionId)}`)
      .then((r) => r.ok ? r.json() : null).then((value) => { setQuestion(value); setOptions(value?.options ?? []); });
  }, [slug, courseSlug, questionId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { prompt: form.get("prompt"), explanation: form.get("explanation") || undefined, points: Number(form.get("points") || 1) };
    if (question?.type === "MCQ") body.options = options;
    if (question?.type === "TRUE_FALSE") body.correctBoolean = form.get("correctBoolean") === "true";
    if (question?.type === "SHORT_ANSWER" || question?.type === "LONG_ANSWER") body.expectedAnswer = form.get("expectedAnswer") || undefined;
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/questions/${encodeURIComponent(questionId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setPending(false);
    if (response.ok) window.location.assign(`/${locale}/org/${slug}/courses/${courseSlug}/questions`);
  }

  async function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/questions/${encodeURIComponent(questionId)}`, { method: "DELETE" });
    window.location.assign(`/${locale}/org/${slug}/courses/${courseSlug}/questions`);
  }

  if (!question) return <main dir={locale === "ar" ? "rtl" : "ltr"} className="p-6">{t("saving")}</main>;
  return <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6"><h1 className="text-2xl font-semibold">{t("editQuestion")}</h1><form onSubmit={save} className="mt-6 space-y-4"><label className="block">{t("type")}<input readOnly value={question.type} className="mt-1 w-full rounded border bg-slate-50 px-3 py-2" /></label><label className="block">{t("prompt")}<textarea name="prompt" defaultValue={question.prompt} required minLength={3} maxLength={10000} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("explanation")}<textarea name="explanation" defaultValue={question.explanation ?? ""} maxLength={10000} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block">{t("points")}<input name="points" type="number" min="1" max="100" defaultValue={question.points} className="mt-1 w-full rounded border px-3 py-2" /></label>{question.type === "MCQ" && <div className="space-y-2">{options.map((option, index) => <div key={option.id ?? index} className="flex items-center gap-2"><input type="radio" checked={option.isCorrect} onChange={() => setOptions((items) => items.map((item, i) => ({ ...item, isCorrect: i === index })))} /><input value={option.label} onChange={(e) => setOptions((items) => items.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} className="flex-1 rounded border px-3 py-2" /></div>)}</div>}{question.type === "TRUE_FALSE" && <label className="block">{t("correctAnswer")}<select name="correctBoolean" defaultValue={String(question.correctBoolean)} className="mt-1 w-full rounded border px-3 py-2"><option value="true">{t("trueLabel")}</option><option value="false">{t("falseLabel")}</option></select></label>}{(question.type === "SHORT_ANSWER" || question.type === "LONG_ANSWER") && <label className="block">{t("expectedAnswer")}<textarea name="expectedAnswer" defaultValue={question.expectedAnswer ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label>}<div className="flex gap-2"><button disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white">{pending ? t("saving") : t("save")}</button><button type="button" onClick={remove} className="rounded border border-red-300 px-4 py-2 text-red-700">{t("delete")}</button></div></form></main>;
}
