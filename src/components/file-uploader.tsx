"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function FileUploader({ orgSlug, purpose, onUploaded, accept }: {
  orgSlug: string;
  purpose: string;
  onUploaded: (fileId: string) => void;
  accept?: string;
}) {
  const t = useTranslations("file");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true); setError(""); setProgress(10);
    try {
      const request = await fetch(`/api/organizations/${encodeURIComponent(orgSlug)}/files/upload-url`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, filename: file.name, declaredMime: file.type || "application/octet-stream", sizeBytes: file.size }),
      });
      if (!request.ok) throw new Error(t("uploadFailed"));
      const signed = await request.json();
      setProgress(40);
      const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!put.ok) throw new Error(t("uploadFailed"));
      setProgress(80);
      const confirm = await fetch(`/api/organizations/${encodeURIComponent(orgSlug)}/files/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey: signed.storageKey, purpose, originalName: file.name, declaredMime: file.type || "application/octet-stream", declaredSize: file.size }),
      });
      if (!confirm.ok) throw new Error(t("uploadFailed"));
      const result = await confirm.json();
      setProgress(100); onUploaded(result.fileId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm">{t("selectFile")}<input type="file" accept={accept} disabled={busy} className="mt-1 block w-full" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void upload(file); }} /></label>
      {busy && <progress className="w-full" max={100} value={progress}>{progress}%</progress>}
      {progress === 100 && !busy && <p className="text-sm text-green-700">{t("uploadSuccess")}</p>}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
