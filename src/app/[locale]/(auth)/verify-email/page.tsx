"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [state, setState] = useState<"pending" | "loading" | "success" | "error">(searchParams.get("pending") ? "pending" : "loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    if (searchParams.get("pending") || !token) return;
    let cancelled = false;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      if (cancelled) return;
      if (response.ok) setState("success");
      else {
        const data = await response.json().catch(() => null);
        setError(data?.error === "VALIDATION_ERROR" ? t("errors.tokenExpired") : data?.error === "NOT_FOUND" ? t("errors.tokenInvalid") : data?.error === "RATE_LIMITED" ? t("errors.rateLimited") : t("errors.generic"));
        setState("error");
      }
    }).catch(() => { if (!cancelled) { setError(t("errors.generic")); setState("error"); } });
    return () => { cancelled = true; };
  }, [searchParams, t]);

  return (
    <div dir={dir}>
      <h1 className="text-2xl font-semibold text-slate-900">{t("verifyEmail")}</h1>
      {state === "pending" && <p className="mt-4 text-slate-700">{t("registrationPending")}</p>}
      {state === "loading" && <p className="mt-4 text-slate-700">{t("submitting")}</p>}
      {state === "success" && <p className="mt-4 text-green-700" role="status">{t("success.emailVerified")}</p>}
      {state === "error" && <p className="mt-4 text-red-600" role="alert">{error}</p>}
    </div>
  );
}
