"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function CategoriesPage() {
  const t = useTranslations("course");
  const locale = useLocale();
  const params = useParams();
  const slug = String(params.slug);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/categories`);
    setCategories(response.ok ? await response.json() : []);
  }, [slug]);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name") }) });
    setPending(false); if (!response.ok) { setError(t("errors.slugExists")); return; }
    event.currentTarget.reset(); await load();
  }

  return <main dir={dir} className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-semibold">{t("categories")}</h1><form className="mt-6 flex gap-2" onSubmit={submit}><label className="flex-1">{t("categoryName")}<input name="name" required minLength={2} maxLength={80} className="mt-1 w-full rounded border px-3 py-2" /></label><button disabled={pending} className="mt-auto rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60">{pending ? t("saving") : t("newCategory")}</button></form>{error && <p className="mt-3 text-red-600">{error}</p>}<ul className="mt-6 space-y-2">{categories.length ? categories.map((category) => <li key={category.id} className="rounded border p-3">{category.name}</li>) : <li className="text-slate-600">{t("noCategories")}</li>}</ul></main>;
}
