"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

type LessonOption = { id: string; title: string };
type ModuleOption = { id: string; title: string; lessons: LessonOption[] };

export default function NewQuestionPage() {
  const t = useTranslations("question");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug), courseSlug = String(params.courseSlug);
  const [type, setType] = useState("MCQ");
  const [scope, setScope] = useState("COURSE");
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [options, setOptions] = useState([{ label: "", isCorrect: true, position: 0 }, { label: "", isCorrect: false, position: 1 }]);
  const [accepted, setAccepted] = useState([""]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}`)
      .then((r) => r.ok ? r.json() : null).then((course) => setCourseId(course?.id ?? ""));
    fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/modules`)
      .then((r) => r.ok ? r.json() : []).then((items) => setModules(Array.isArray(items) ? items : []));
  }, [slug, courseSlug]);

  const lessons = moduleId
    ? (modules.find((item) => item.id === moduleId)?.lessons ?? [])
    : modules.flatMap((item) => item.lessons);

  function selectLesson(value: string) {
    setLessonId(value);
    const owner = modules.find((item) => item.lessons.some((lesson) => lesson.id === value));
    setModuleId(owner?.id ?? "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (scope === "MODULE" && !moduleId) {
      setError("Please select a module");
      return;
    }
    if (scope === "LESSON" && !lessonId) {
      setError("Please select a lesson");
      return;
    }

    setPending(true);
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { type, courseId, scope, prompt: form.get("prompt"), explanation: form.get("explanation") || undefined, points: Number(form.get("points") || 1) };
    if (scope === "MODULE" && moduleId) body.moduleId = moduleId;
    if (scope === "LESSON") {
      body.lessonId = lessonId;
      if (moduleId) body.moduleId = moduleId;
    }
    if (type === "MCQ") body.options = options;
    if (type === "TRUE_FALSE") body.correctBoolean = form.get("correctBoolean") === "true";
    if (type === "SHORT_ANSWER") { body.expectedAnswer = form.get("expectedAnswer"); body.acceptedAnswers = accepted.filter((value) => value.trim()); }
    if (type === "LONG_ANSWER") body.expectedAnswer = form.get("expectedAnswer") || undefined;

    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setPending(false);
    if (!response.ok) { setError(t("errors.invalidType")); return; }
    window.location.assign(`/${locale}/org/${slug}/courses/${courseSlug}/questions`);
  }

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">{t("newQuestion")}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">{t("type")}<select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded border px-3 py-2"><option value="MCQ">{t("typeMcq")}</option><option value="TRUE_FALSE">{t("typeTrueFalse")}</option><option value="SHORT_ANSWER">{t("typeShortAnswer")}</option><option value="LONG_ANSWER">{t("typeLongAnswer")}</option></select></label>
        <label className="block">Scope<select name="scope" value={scope} onChange={(e) => { setScope(e.target.value); setError(""); }} className="mt-1 w-full rounded border px-3 py-2"><option value="COURSE">Course</option><option value="MODULE">Module</option><option value="LESSON">Lesson</option></select></label>
        {scope === "MODULE" && (
          <label className="block">Module<select required value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2"><option value="">Select a module</option>{modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        )}
        {scope === "LESSON" && (
          <>
            <label className="block">Module (optional)<select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setLessonId(""); }} className="mt-1 w-full rounded border px-3 py-2"><option value="">All modules</option>{modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label className="block">Lesson<select required value={lessonId} onChange={(e) => selectLesson(e.target.value)} className="mt-1 w-full rounded border px-3 py-2"><option value="">Select a lesson</option>{lessons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          </>
        )}
        <label className="block">{t("prompt")}<textarea name="prompt" required minLength={3} maxLength={10000} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="block">{t("explanation")}<textarea name="explanation" maxLength={10000} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label className="block">{t("points")}<input name="points" type="number" min="1" max="100" defaultValue="1" className="mt-1 w-full rounded border px-3 py-2" /></label>
        {type === "MCQ" && <div className="space-y-2"><div className="font-medium">{t("options")}</div>{options.map((option, index) => <div key={index} className="flex items-center gap-2"><input aria-label={t("correctOption")} type="radio" checked={option.isCorrect} onChange={() => setOptions((items) => items.map((item, i) => ({ ...item, isCorrect: i === index })))} /><input value={option.label} onChange={(e) => setOptions((items) => items.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} className="flex-1 rounded border px-3 py-2" /><button type="button" disabled={options.length <= 2} onClick={() => setOptions((items) => items.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i })))} className="rounded border px-2 py-1">×</button></div>)}<button type="button" disabled={options.length >= 10} onClick={() => setOptions((items) => [...items, { label: "", isCorrect: false, position: items.length }])} className="rounded border px-3 py-2 text-sm">{t("addOption")}</button></div>}
        {type === "TRUE_FALSE" && <label className="block">{t("correctAnswer")}<select name="correctBoolean" className="mt-1 w-full rounded border px-3 py-2"><option value="true">{t("trueLabel")}</option><option value="false">{t("falseLabel")}</option></select></label>}
        {(type === "SHORT_ANSWER" || type === "LONG_ANSWER") && <label className="block">{t("expectedAnswer")}<textarea name="expectedAnswer" required={type === "SHORT_ANSWER"} maxLength={10000} className="mt-1 w-full rounded border px-3 py-2" /></label>}
        {type === "SHORT_ANSWER" && <div className="space-y-2"><div>{t("acceptedAnswers")}</div>{accepted.map((value, index) => <input key={index} value={value} onChange={(e) => setAccepted((items) => items.map((item, i) => i === index ? e.target.value : item))} className="block w-full rounded border px-3 py-2" />)}<button type="button" onClick={() => setAccepted((items) => [...items, ""])} className="rounded border px-3 py-2 text-sm">{t("addAcceptedAnswer")}</button></div>}
        {error && <p className="text-red-700">{error}</p>}
        <div className="flex gap-2"><button disabled={pending || !courseId} className="rounded bg-slate-900 px-4 py-2 text-white">{pending ? t("saving") : t("save")}</button><a className="rounded border px-4 py-2" href={`/${locale}/org/${slug}/courses/${courseSlug}/questions`}>{t("cancel")}</a></div>
      </form>
    </main>
  );
}
