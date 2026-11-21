"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function CourseStatusActions({ slug, courseSlug, status }: { slug: string; courseSlug: string; status: string }) {
  const t = useTranslations("course");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(next: "PUBLISHED" | "ARCHIVED") {
    setPending(true); setError("");
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/status`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }),
    });
    setPending(false);
    if (!response.ok) { setError(t("errors.invalidTransition")); return; }
    router.refresh();
  }

  return <div className="flex gap-2"><button disabled={pending} onClick={() => setStatus("PUBLISHED")} className="rounded border px-2 py-1 disabled:opacity-60">{status === "PUBLISHED" ? t("publish") : t("publish")}</button><button disabled={pending} onClick={() => setStatus("ARCHIVED")} className="rounded border px-2 py-1 disabled:opacity-60">{status === "PUBLISHED" ? t("unpublish") : t("archive")}</button>{error && <p className="text-red-600">{error}</p>}</div>;
}
