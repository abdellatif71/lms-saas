import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect(`/${locale}`);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      isSuperAdmin: true,
      memberships: {
        where: { status: "ACTIVE" },
        select: {
          role: true,
          organization: { select: { slug: true, name: true } },
        },
      },
    },
  });

  if (!user) redirect(`/${locale}`);

  const t = await getTranslations({ locale, namespace: "dashboard" });
  const dashboardUser = session.user as typeof session.user & {
    role?: string | null;
    isSuperAdmin?: boolean;
  };
  const isSuperAdmin = dashboardUser.isSuperAdmin ?? false;
  const role = isSuperAdmin
    ? "SUPER_ADMIN"
    : (dashboardUser.role ?? user.memberships[0]?.role ?? "NONE");
  const dir = locale === "ar" ? "rtl" : "ltr";
  const organizations = user.memberships.map((membership) => ({
    role: membership.role,
    slug: membership.organization.slug,
    name: membership.organization.name,
  }));

  return (
    <main dir={dir} className="mx-auto max-w-5xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("welcome", { name: user.name })}</h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">{role}</span>
      </div>

      {organizations.length === 0 && (
        <div className="mt-6 rounded border border-dashed p-5">
          <p className="text-slate-700">{t("noOrg")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a className="rounded bg-slate-900 px-4 py-2 text-white" href={`/${locale}/orgs/new`}>
              {t("createOrg")}
            </a>
            <a className="rounded border px-4 py-2" href={`/${locale}/orgs/invite`}>
              {t("acceptInvitation")}
            </a>
          </div>
        </div>
      )}

      {organizations.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">{t("yourOrgs")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {organizations.map((organization) => {
              const href = organization.role === "STUDENT"
                ? `/${locale}/org/${organization.slug}/my-courses`
                : `/${locale}/org/${organization.slug}/courses`;

              return (
                <a key={organization.slug} href={href} className="rounded border p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{organization.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                      {t("role")}: {organization.role}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
          <a className="mt-4 inline-block rounded border px-4 py-2" href={`/${locale}/orgs/new`}>
            {t("createAnotherOrg")}
          </a>
        </section>
      )}

      {isSuperAdmin && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a className="rounded border p-4 font-medium hover:bg-slate-50" href={`/${locale}/admin/audit`}>
            {t("auditViewer")}
          </a>
          <a className="rounded border p-4 font-medium hover:bg-slate-50" href={`/${locale}/admin/organizations`}>
            {t("organizations")}
          </a>
        </div>
      )}
    </main>
  );
}
