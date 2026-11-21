import { getTranslations } from "next-intl/server";
import { requireSuperAdminOrRedirect } from "@/lib/auth/require-super-admin-server";
import { prisma } from "@/lib/db/client";

export default async function AuditViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ organizationId?: string; action?: string; since?: string; until?: string; cursor?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  await requireSuperAdminOrRedirect(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  const cursor = filters.cursor ? await prisma.auditLog.findUnique({ where: { id: filters.cursor }, select: { createdAt: true } }) : null;
  const since = filters.since ? new Date(filters.since) : undefined;
  const until = filters.until ? new Date(filters.until) : undefined;
  const items = await prisma.auditLog.findMany({
    take: 51,
    where: {
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters.action ? { action: { contains: filters.action } } : {}),
      ...(since || until ? { createdAt: { ...(since ? { gte: since } : {}), ...(until ? { lte: until } : {}) } } : {}),
      ...(cursor ? { createdAt: { lt: cursor.createdAt } } : {}),
    },
    include: { actor: { select: { id: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  const hasNext = items.length > 50;
  const page = hasNext ? items.slice(0, 50) : items;
  const nextCursor = hasNext ? page[page.length - 1]?.id : null;

  const query = new URLSearchParams();
  if (filters.organizationId) query.set("organizationId", filters.organizationId);
  if (filters.action) query.set("action", filters.action);
  if (filters.since) query.set("since", filters.since);
  if (filters.until) query.set("until", filters.until);
  if (nextCursor) query.set("cursor", nextCursor);

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">{t("auditLog")}</h1>
      <form className="mt-6 grid gap-3 sm:grid-cols-4" method="get">
        <label>{t("filters.organization")}<input name="organizationId" defaultValue={filters.organizationId ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label>{t("filters.action")}<input name="action" defaultValue={filters.action ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label>{t("filters.since")}<input name="since" type="date" defaultValue={filters.since ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <label>{t("filters.until")}<input name="until" type="date" defaultValue={filters.until ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></label>
        <button className="rounded bg-slate-900 px-3 py-2 text-white sm:col-span-4" type="submit">{t("filters.action")}</button>
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="border-b"><th className="p-2 text-start">{t("columns.when")}</th><th className="p-2 text-start">{t("columns.who")}</th><th className="p-2 text-start">{t("columns.action")}</th><th className="p-2 text-start">{t("columns.org")}</th><th className="p-2 text-start">{t("columns.target")}</th></tr></thead>
          <tbody>{page.length ? page.map((entry) => <tr key={entry.id} className="border-b"><td className="p-2">{entry.createdAt.toISOString()}</td><td className="p-2">{entry.actor?.email ?? entry.actorId ?? "—"}</td><td className="p-2">{entry.action}</td><td className="p-2">{entry.organizationId ?? "—"}</td><td className="p-2">{entry.targetType ?? "—"}: {entry.targetId ?? "—"}</td></tr>) : <tr><td className="p-4" colSpan={5}>{t("empty")}</td></tr>}</tbody>
        </table>
      </div>
      {nextCursor && <a className="mt-4 inline-block rounded border px-3 py-2" href={`/${locale}/admin/audit?${query.toString()}`}>Next</a>}
    </main>
  );
}
