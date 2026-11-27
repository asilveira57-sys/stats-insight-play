import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LEAGUES_BY_LOCALE, leagueByKey, T } from "./locales";

type Props = {
  locale: "en" | "es";
  children: ReactNode;
  /** Caminhos equivalentes nos outros idiomas, para o seletor de idioma */
  switchTo?: { pt?: string; en?: string; es?: string };
};

export function IntlLayout({ locale, children, switchTo }: Props) {
  const t = T[locale];
  const other = locale === "en" ? "es" : "en";
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to={`/${locale}`} className="text-foreground" aria-label="Aleball">
            <BrandLogo variant="full" className="h-6 w-auto" />
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            {LEAGUES_BY_LOCALE[locale].map((k) => {
              const l = leagueByKey(k)!;
              return (
                <Link key={k} to={`/${locale}/${l.slug[locale]}`} className="text-muted-foreground hover:text-primary">
                  {l.name[locale]}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs" aria-label={t.language}>
            <Link to={switchTo?.[other] ?? `/${other}`} className="px-2 py-1 rounded border border-border hover:border-primary">
              {other.toUpperCase()}
            </Link>
            <Link to={switchTo?.pt ?? "/"} className="px-2 py-1 rounded border border-border hover:border-primary">
              PT
            </Link>
          </div>
        </div>
        <nav className="sm:hidden max-w-5xl mx-auto px-4 pb-2 flex gap-4 text-sm overflow-x-auto">
          {LEAGUES_BY_LOCALE[locale].map((k) => {
            const l = leagueByKey(k)!;
            return (
              <Link key={k} to={`/${locale}/${l.slug[locale]}`} className="whitespace-nowrap text-muted-foreground">
                {l.name[locale]}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">{children}</main>
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-muted-foreground space-y-2">
          <p>{t.disclaimer}</p>
          <p>
            <Link to="/sobre" className="hover:text-primary">Aleball</Link> · <Link to="/privacidade" className="hover:text-primary">Privacy</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
