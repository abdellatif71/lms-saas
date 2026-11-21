"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EnrollButton({ slug, courseSlug, label, enrollingLabel }: { slug: string; courseSlug: string; label: string; enrollingLabel: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function enroll() {
    setPending(true);
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseSlug }),
    });
    if (response.ok) router.refresh();
    setPending(false);
  }
  return <button type="button" onClick={enroll} disabled={pending} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60">{pending ? enrollingLabel : label}</button>;
}
