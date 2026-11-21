"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export type MemberRow = {
  id: string;
  userId: string;
  role: "ORG_OWNER" | "ORG_ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  user: { id: string; email: string; name: string };
};

export default function MembersTable({ locale, slug, members, currentUserId, owner }: {
  locale: string;
  slug: string;
  members: MemberRow[];
  currentUserId: string;
  owner: boolean;
}) {
  const t = useTranslations("org");
  const router = useRouter();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [error, setError] = useState("");

  async function changeRole(id: string, role: string) {
    setError("");
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) setError(t("errors.generic"));
    else router.refresh();
  }

  async function suspend(id: string) {
    setError("");
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    if (!response.ok) setError(t("errors.generic"));
    else router.refresh();
  }

  async function remove(id: string) {
    setError("");
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/members/${id}`, { method: "DELETE" });
    if (!response.ok) setError(t("errors.generic"));
    else router.refresh();
  }

  function roleLabel(role: MemberRow["role"]) {
    if (role === "ORG_OWNER") return t("roleOwner");
    if (role === "ORG_ADMIN") return t("roleAdmin");
    if (role === "TEACHER") return t("roleTeacher");
    if (role === "STUDENT") return t("roleStudent");
    return t("roleParent");
  }

  return (
    <div dir={dir}>
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-start">
          <thead><tr className="border-b"><th className="p-2 text-start">{t("memberEmail")}</th><th className="p-2 text-start">{t("memberRole")}</th><th className="p-2 text-start">Status</th><th className="p-2 text-start">Actions</th></tr></thead>
          <tbody>{members.map((member) => {
            const protectedRow = member.role === "ORG_OWNER" || member.userId === currentUserId;
            return (
              <tr key={member.id} className="border-b">
                <td className="p-2">{member.user.email}<div className="text-sm text-slate-500">{member.user.name}</div></td>
                <td className="p-2">{owner ? <select aria-label={t("changeRole")} disabled={protectedRow} value={member.role} onChange={(event) => changeRole(member.id, event.target.value)} className="rounded border px-2 py-1"><option value="ORG_ADMIN">{t("roleAdmin")}</option><option value="TEACHER">{t("roleTeacher")}</option><option value="STUDENT">{t("roleStudent")}</option><option value="PARENT">{t("roleParent")}</option><option value="ORG_OWNER" disabled>{t("roleOwner")}</option></select> : roleLabel(member.role)}</td>
                <td className="p-2">{member.status === "ACTIVE" ? t("statusActive") : member.status === "SUSPENDED" ? t("statusSuspended") : member.status}</td>
                <td className="p-2"><div className="flex gap-2"><button disabled={protectedRow} onClick={() => suspend(member.id)} className="rounded border px-2 py-1 disabled:opacity-40">{t("suspendMember")}</button><button disabled={protectedRow} onClick={() => remove(member.id)} className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:opacity-40">{t("removeMember")}</button></div></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
