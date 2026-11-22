"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ReorderControls({ slug, courseSlug, moduleId, lessonId, position, total, kind = "lesson" }: {
  slug: string;
  courseSlug: string;
  moduleId: string;
  lessonId?: string;
  position: number;
  total: number;
  kind?: "module" | "lesson";
}) {
  const t = useTranslations("lesson");
  const [pending, setPending] = useState(false);

  async function move(nextPosition: number) {
    setPending(true);
    const base = `/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/modules`;
    const url = kind === "module"
      ? `${base}/${encodeURIComponent(moduleId)}/reorder`
      : `${base}/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId!)}/reorder`;
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position: nextPosition }) });
    setPending(false);
    window.location.reload();
  }

  async function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    setPending(true);
    const base = `/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/modules`;
    const url = kind === "module"
      ? `${base}/${encodeURIComponent(moduleId)}`
      : `${base}/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId!)}`;
    await fetch(url, { method: "DELETE" });
    setPending(false);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={t("moveUp")} disabled={pending || position === 0} onClick={() => move(position - 1)} className="rounded border px-2 py-1 disabled:opacity-40">↑</button>
      <button type="button" aria-label={t("moveDown")} disabled={pending || position >= total - 1} onClick={() => move(position + 1)} className="rounded border px-2 py-1 disabled:opacity-40">↓</button>
      <button type="button" aria-label={t("delete")} disabled={pending} onClick={remove} className="rounded border px-2 py-1 text-red-700">{t("delete")}</button>
    </div>
  );
}
