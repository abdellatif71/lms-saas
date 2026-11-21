"use client";

import { useEffect, useState } from "react";

type Lesson = {
  id: string;
  title: string;
  contentType: "TEXT" | "VIDEO" | "PDF" | "EXTERNAL";
  bodyText: string | null;
  externalUrl: string | null;
  fileId: string | null;
};

export function LessonViewer({ slug, lessons, markCompleteLabel }: { slug: string; lessons: Lesson[]; markCompleteLabel: string }) {
  const [selectedId, setSelectedId] = useState(lessons[0]?.id ?? "");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const selected = lessons.find((lesson) => lesson.id === selectedId) ?? lessons[0];

  useEffect(() => {
    setFileUrl(null);
    if (!selected?.fileId) return;
    fetch(`/api/organizations/${encodeURIComponent(slug)}/files/${encodeURIComponent(selected.fileId)}/url`)
      .then((response) => response.json())
      .then((data: { url?: string }) => setFileUrl(data.url ?? null));
  }, [slug, selected?.fileId]);

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
        <button type="button" disabled className="mt-6 rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">{markCompleteLabel}</button>
      </article>
    </div>
  );
}
