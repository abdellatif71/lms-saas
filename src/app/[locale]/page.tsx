import { getTranslations } from "next-intl/server";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const common = await getTranslations({ locale, namespace: "common" });
  const auth = await getTranslations({ locale, namespace: "auth" });

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-xl font-bold text-slate-950">{common("appName")}</div>
          <nav className="flex items-center gap-3">
            <a className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href={`/${locale}/login`}>
              {auth("login")}
            </a>
            <a className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" href={`/${locale}/register`}>
              {auth("register")}
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center px-6 py-16 md:grid-cols-2">
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-700">{common("learningManagementSystem")}</p>
          <h1 className="text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
            {common("appName")}
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            {common("heroDescription")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="rounded-md bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800" href={`/${locale}/register`}>
              {auth("register")}
            </a>
            <a className="rounded-md border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 hover:bg-slate-50" href={`/${locale}/login`}>
              {auth("login")}
            </a>
          </div>
        </div>

        <div className="mt-12 md:mt-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="mb-6 flex items-center justify-between">
              <a className="font-semibold text-slate-900 hover:text-blue-700 hover:underline" href={`/${locale}/login`}>{common("lmsOverview")}</a>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <a className="rounded-xl bg-blue-50 p-4 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-blue-200" href={`/${locale}/login`}>
                <div className="text-2xl font-bold text-blue-700">{common("courses")}</div>
                <div className="mt-1 text-sm text-slate-600">{common("learnAndTeach")}</div>
              </a>
              <a className="rounded-xl bg-violet-50 p-4 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-violet-200" href={`/${locale}/login`}>
                <div className="text-2xl font-bold text-violet-700">{common("teams")}</div>
                <div className="mt-1 text-sm text-slate-600">{common("organizations")}</div>
              </a>
              <a className="rounded-xl bg-emerald-50 p-4 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-emerald-200" href={`/${locale}/login`}>
                <div className="text-2xl font-bold text-emerald-700">{common("progress")}</div>
                <div className="mt-1 text-sm text-slate-600">{common("trackLearning")}</div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
