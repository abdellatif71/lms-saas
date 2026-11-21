import { getTranslations } from "next-intl/server";
import { requireSessionOrRedirect } from "@/lib/auth/session";
import { requireOrgContext } from "@/lib/auth/context";
import { listMembers } from "@/modules/organizations/membership";
import MembersTable, { type MemberRow } from "./members-table";

export default async function MembersPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const session = await requireSessionOrRedirect(locale);
  const ctx = await requireOrgContext(slug);
  const members = await listMembers(ctx);
  const t = await getTranslations({ locale, namespace: "org" });

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">{t("members")}</h1><a className="rounded border px-3 py-2" href={`/${locale}/org/${slug}/members/invite`}>{t("inviteMember")}</a></div>
      <div className="mt-6"><MembersTable locale={locale} slug={slug} members={members as MemberRow[]} currentUserId={session.user.id} owner={ctx.role === "ORG_OWNER"} /></div>
    </main>
  );
}
