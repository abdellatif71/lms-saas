"use client";

import { useEffect, useState } from "react";
import { useLessonHeartbeat } from "@/components/learning/use-lesson-heartbeat";

type Lesson = {
  id: string;
  title: string;
  contentType: "TEXT" | "VIDEO" | "PDF" | "EXTERNAL";
  bodyText: string | null;
  externalUrl: string | null;
  fileId: string | null;
};

function formatTime(totalMs: number) {
  const seconds = Math.floor(totalMs / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function LessonViewer({
  slug,
  courseSlug,
  lessons,
  markCompleteLabel,
  timeSpentLabel,
  completedLabel,
  locale,
  prev,
  next,
  onLastCompleteHref,
}: {
  slug: string;
  courseSlug: string;
  lessons: Lesson[];
  markCompleteLabel: string;
  timeSpentLabel: string;
  completedLabel: string;
  locale: string;
  prev: { id: string; label: string } | null;
  next: { id: string; label: string } | null;
  onLastCompleteHref?: string | undefined;
}) {
  const [selectedId, setSelectedId] = useState(lessons[0]?.id ?? "");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ status: string; totalTimeMs: number } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState("");
  const selected = lessons.find((lesson) => lesson.id === selectedId) ?? lessons[0];
  useLessonHeartbeat(slug, selected?.id ?? "");

  useEffect(() => {
    setFileUrl(null);
    if (!selected?.fileId) return;
    fetch(`/api/organizations/${encodeURIComponent(slug)}/files/${encodeURIComponent(selected.fileId)}/url`)
      .then((response) => response.json())
      .then((data: { url?: string }) => setFileUrl(data.url ?? null));
  }, [slug, selected]);

  useEffect(() => {
    if (!selected) return;
    void fetch(`/api/organizations/${encodeURIComponent(slug)}/learning/lessons/${encodeURIComponent(selected.id)}/progress`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setProgress(data))
      .catch(() => setProgress(null));
  }, [slug, selected]);

  async function markComplete() {
    if (!selected) return;
    setCompleting(true);
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/learning/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: selected.id }),
    });
    setCompleting(false);
    if (response.ok) {
      setProgress((current) => current ? { ...current, status: "COMPLETED" } : { status: "COMPLETED", totalTimeMs: 0 });
      setToast(completedLabel);
      if (next) {
        window.setTimeout(() => window.location.assign(`/${locale}/org/${slug}/courses/${courseSlug}/learn/${next.id}`), 600);
      } else if (onLastCompleteHref) {
        window.setTimeout(() => window.location.assign(onLastCompleteHref), 600);
      }
    }
  }

  if (!selected) return null;
  return (
    <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
      <nav className="flex flex-col gap-1" aria-label="Lessons">
        {lessons.map((lesson) => (
          <button key={lesson.id} type="button" onClick={() => setSelectedId(lesson.id)} className={`rounded px-3 py-2 text-start ${selectedId === lesson.id ? "bg-slate-100 font-medium" : "hover:bg-slate-50"}`}>
            {lesson.title}
          </button>
        ))}
      </nav>
      <article className="rounded border p-5">
        <h2 className="text-xl font-semibold">{selected.title}</h2>
        {selected.contentType === "TEXT" && <p className="mt-4 whitespace-pre-wrap">{selected.bodyText}</p>}
        {selected.contentType === "EXTERNAL" && selected.externalUrl && <a className="mt-4 inline-block text-blue-700 underline" href={selected.externalUrl} target="_blank" rel="noreferrer">{selected.externalUrl}</a>}
        {selected.contentType === "VIDEO" && (fileUrl ? <video className="mt-4 max-w-full" src={fileUrl} controls /> : selected.externalUrl ? <a className="mt-4 text-blue-700 underline" href={selected.externalUrl}>Video</a> : null)}
        {selected.contentType === "PDF" && fileUrl && <iframe className="mt-4 h-[34rem] w-full" src={fileUrl} title={selected.title} />}
        <div className="mt-6">
          <div className="mb-2 flex justify-between gap-3 text-sm text-slate-600">
            <span>{timeSpentLabel}: {formatTime(progress?.totalTimeMs ?? 0)}</span>
            <span>{progress?.status === "COMPLETED" ? completedLabel : ""}</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-slate-200">
            <div className="h-full bg-blue-600 transition-all" style={{ width: progress?.status === "COMPLETED" ? "100%" : "4%" }} />
          </div>
          <button type="button" onClick={markComplete} disabled={completing || progress?.status === "COMPLETED"} className="mt-4 rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
            {progress?.status === "COMPLETED" ? completedLabel : markCompleteLabel}
          </button>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          {prev ? <a className="rounded border px-3 py-2 text-sm" href={`/${locale}/org/${slug}/courses/${courseSlug}/learn/${prev.id}`}>← {prev.label}</a> : <button disabled className="rounded border px-3 py-2 text-sm opacity-50">←</button>}
          {next ? <a className="rounded bg-slate-900 px-3 py-2 text-sm text-white" href={`/${locale}/org/${slug}/courses/${courseSlug}/learn/${next.id}`}>{next.label} →</a> : <button disabled className="rounded border px-3 py-2 text-sm opacity-50">→</button>}
        </div>
        {toast && <div role="status" className="fixed bottom-4 start-4 z-50 rounded bg-emerald-700 px-4 py-3 text-sm text-white shadow">{toast}{next ? ` — ${next.label}` : ""}</div>}
      </article>
    </div>
  );
}
