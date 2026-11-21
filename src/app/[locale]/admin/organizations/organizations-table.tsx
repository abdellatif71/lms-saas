"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type AdminOrganization = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  createdAt: Date;
  _count: { memberships: number };
};

export default function OrganizationsTable({ locale, organizations }: { locale: string; organizations: AdminOrganization[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [error, setError] = useState("");

  async function changeStatus(org: AdminOrganization, active: boolean) {
    if (!window.confirm(active ? t("confirmReactivate") : t("confirmSuspend"))) return;
    setError("");
    const action = active ? "reactivate" : "suspend";
    const response = await fetch(`/api/admin/organizations/${org.id}/${action}`, { method: "POST" });
    if (!response.ok) setError(t("empty"));
    else router.refresh();
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="mt-6 overflow-x-auto">
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
      <table className="w-full border-collapse"><thead><tr className="border-b"><th className="p-2 text-start">Name</th><th className="p-2 text-start">Slug</th><th className="p-2 text-start">Status</th><th className="p-2 text-start">Members</th><th className="p-2 text-start">Action</th></tr></thead><tbody>{organizations.map((org) => <tr key={org.id} className="border-b"><td className="p-2">{org.name}</td><td className="p-2">{org.slug}</td><td className="p-2">{org.status}</td><td className="p-2">{org._count.memberships}</td><td className="p-2">{org.status === "SUSPENDED" ? <button onClick={() => changeStatus(org, true)} className="rounded border px-2 py-1">{t("reactivate")}</button> : <button onClick={() => changeStatus(org, false)} className="rounded border px-2 py-1">{t("suspend")}</button>}</td></tr>)}</tbody></table>
    </div>
  );
}
