import { Link } from "react-router-dom";
import { IntlLayout } from "@/i18n/IntlLayout";
import { IntlSeo } from "@/i18n/IntlSeo";
import { LEAGUES_BY_LOCALE, leagueByKey, T } from "@/i18n/locales";
import { useSeasonMatches } from "@/i18n/useIntlData";
import { IntlMatchRow } from "./IntlMatchRow";

function LeagueCard({ locale, leagueKey }: { locale: "en" | "es"; leagueKey: string }) {
  const l = leagueByKey(leagueKey)!;
  const t = T[locale];
  const { data } = useSeasonMatches(l.ligaId);
  const recent = (data ?? []).filter((m) => m.gols_casa != null).slice(-4).reverse();
  return (
    <section className="rounded-lg border border-border p-4">
      <h2 className="text-lg font-semibold mb-1">
        <Link to={`/${locale}/${l.slug[locale]}`} className="hover:text-primary">
          {l.name[locale]}
        </Link>
      </h2>
      <p className="text-xs text-muted-foreground mb-2">{l.country[locale]} · {t.results}</p>
      {recent.length ? (
        <ul>{recent.map((m) => <IntlMatchRow key={m.id} m={m} locale={locale} />)}</ul>
      ) : (
        <p className="text-sm text-muted-foreground">{data ? t.noMatches : t.loading}</p>
      )}
    </section>
  );
}

export default function IntlHome({ locale }: { locale: "en" | "es" }) {
  const t = T[locale];
  return (
    <IntlLayout locale={locale} switchTo={{ pt: "/", en: "/en", es: "/es" }}>
      <IntlSeo
        locale={locale}
        path={`/${locale}`}
        title={t.homeTitle}
        description={t.homeDescription}
        alternates={{ en: "/en", es: "/es", pt: "/" }}
        jsonLd={{ "@context": "https://schema.org", "@type": "WebSite", name: "Aleball", url: `https://www.aleball.com.br/${locale}`, inLanguage: locale }}
      />
      <h1 className="text-3xl font-bold mb-3">{t.homeH1}</h1>
      <p className="text-muted-foreground max-w-2xl mb-8">{t.homeIntro}</p>
      <h2 className="sr-only">{t.competitions}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {LEAGUES_BY_LOCALE[locale].map((k) => (
          <LeagueCard key={k} locale={locale} leagueKey={k} />
        ))}
      </div>
    </IntlLayout>
  );
}
