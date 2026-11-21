"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LeaveButton({ slug, courseSlug, label, leavingLabel, blocked }: { slug: string; courseSlug: string; label: string; leavingLabel: string; blocked?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function leave() {
    setPending(true);
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/enrollments/${encodeURIComponent(courseSlug)}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    setPending(false);
  }
  return <button type="button" onClick={leave} disabled={pending || blocked} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-60">{pending ? leavingLabel : label}</button>;
}
