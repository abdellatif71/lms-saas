"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function QuizStatusActions({ slug, courseSlug, quizId, status }: { slug: string; courseSlug: string; quizId: string; status: string }) {
  const t = useTranslations("quiz");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const base = `/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/quizzes/${encodeURIComponent(quizId)}`;

  async function setStatus(next: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    setPending(true); setError("");
    const response = await fetch(`${base}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    setPending(false);
    if (!response.ok) { setError(t("errors.invalidTransition")); return; }
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    setPending(true); setError("");
    const response = await fetch(base, { method: "DELETE" });
    setPending(false);
    if (!response.ok) { setError(t("errors.notAllowed")); return; }
    router.push(`/${window.location.pathname.split("/")[1]}/org/${slug}/courses/${courseSlug}/quizzes`);
  }

  return <div className="flex flex-wrap gap-2">{status !== "PUBLISHED" && <button disabled={pending} onClick={() => setStatus("PUBLISHED")} className="rounded border px-3 py-2">{t("publish")}</button>} {status === "PUBLISHED" && <button disabled={pending} onClick={() => setStatus("ARCHIVED")} className="rounded border px-3 py-2">{t("archive")}</button>}<button disabled={pending} onClick={remove} className="rounded border px-3 py-2 text-red-700">{t("delete")}</button>{error && <p className="text-red-700">{error}</p>}</div>;
}
