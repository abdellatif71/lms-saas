"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";

const locales = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
];

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const segments = pathname.split("/");
  const rest = segments.length > 2 ? segments.slice(2).join("/") : "";

  return (
    <nav aria-label="Language" className="fixed end-4 top-4 z-50 flex rounded-full border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      {locales.map((item) => (
        <a
          key={item.code}
          href={`/${item.code}${rest ? `/${rest}` : ""}`}
          lang={item.code}
          aria-current={locale === item.code ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${locale === item.code ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
