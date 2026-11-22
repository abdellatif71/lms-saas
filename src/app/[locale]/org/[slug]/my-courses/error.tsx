"use client";

import { useTranslations } from "next-intl";

export default function MyCoursesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("learn");
  return (
    <main className="mx-auto max-w-3xl p-6 text-center">
      <p className="text-red-700">{t("errors.progressFetchFailed")}</p>
      <button type="button" onClick={reset} className="mt-4 rounded bg-slate-900 px-4 py-2 text-sm text-white">
        {t("retry")}
      </button>
    </main>
  );
}
