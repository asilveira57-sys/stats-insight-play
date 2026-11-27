import { useParams } from "react-router-dom";
import { IntlLayout } from "@/i18n/IntlLayout";
import { IntlSeo } from "@/i18n/IntlSeo";
import { leagueBySlug, T, type IntlLeague as League } from "@/i18n/locales";
import { buildTable, seasonWindow, useSeasonMatches, type IntlMatch } from "@/i18n/useIntlData";
import { IntlMatchRow } from "./IntlMatchRow";

/** Parágrafo de abertura gerado a partir dos dados (sem IA) */
function intro(locale: "en" | "es", l: League, season: string, matches: IntlMatch[]) {
  const played = matches.filter((m) => m.status === "finished" && m.gols_casa != null);
  const goals = played.reduce((s, m) => s + (m.gols_casa ?? 0) + (m.gols_fora ?? 0), 0);
  const avg = played.length ? (goals / played.length).toFixed(2) : "0";
  const table = l.table ? buildTable(matches) : [];
  const leader = table[0];
  const last = played[played.length - 1];
  const name = l.name[locale];
  if (locale === "en") {
    const parts = [
      `${name} ${season}: ${played.length} matches played so far, with ${goals} goals (${avg} per match).`,
      leader && leader.p > 0 ? `${leader.team.nome} lead the table with ${leader.pts} points from ${leader.p} games.` : "",
      last ? `Latest result: ${last.casa?.nome} ${last.gols_casa}–${last.gols_fora} ${last.fora?.nome}.` : "",
    ];
    return parts.filter(Boolean).join(" ");
  }
  const parts = [
    `${name} ${season}: ${played.length} partidos jugados hasta ahora, con ${goals} goles (${avg} por partido).`,
    leader && leader.p > 0 ? `${leader.team.nome} lidera la clasificación con ${leader.pts} puntos en ${leader.p} partidos.` : "",
    last ? `Último resultado: ${last.casa?.nome} ${last.gols_casa}-${last.gols_fora} ${last.fora?.nome}.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export default function IntlLeague({ locale }: { locale: "en" | "es" }) {
  const { league: slug } = useParams();
  const l = leagueBySlug(locale, slug);
  const t = T[locale];
  const { data, isLoading } = useSeasonMatches(l?.ligaId);

  if (!l) {
    return (
      <IntlLayout locale={locale}>
        <IntlSeo locale={locale} path={`/${locale}/${slug}`} title="Aleball" description="" noindex />
        <p>{t.notFound}</p>
      </IntlLayout>
    );
  }

  const season = seasonWindow().label;
  const matches = data ?? [];
  const results = matches.filter((m) => m.gols_casa != null).slice(-20).reverse();
  const fixtures = matches.filter((m) => m.gols_casa == null && m.status !== "finished").slice(0, 20);
  const table = l.table ? buildTable(matches) : [];
  const name = l.name[locale];
  const title =
    locale === "en"
      ? `${name} ${season}: results, fixtures and table | Aleball`
      : `${name} ${season}: resultados, calendario y clasificación | Aleball`;
  const description =
    locale === "en"
      ? `${name} ${season} results, upcoming fixtures${l.table ? " and league table" : ""}, with head-to-head records and recent form for every match.`
      : `Resultados de ${name} ${season}, próximos partidos${l.table ? " y clasificación" : ""}, con historial y racha reciente de cada partido.`;
  const other = locale === "en" ? "es" : "en";
  const path = `/${locale}/${l.slug[locale]}`;

  return (
    <IntlLayout locale={locale} switchTo={{ [other]: `/${other}/${l.slug[other]}` }}>
      <IntlSeo
        locale={locale}
        path={path}
        title={title}
        description={description}
        alternates={{ [other]: `/${other}/${l.slug[other]}` }}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name,
          sport: locale === "en" ? "Football" : "Fútbol",
          url: `https://www.aleball.com.br${path}`,
        }}
      />
      <h1 className="text-3xl font-bold mb-2">
        {name} {season}
      </h1>
      <p className="text-muted-foreground max-w-3xl mb-8">
        {isLoading ? t.loading : intro(locale, l, season, matches)}
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        {l.table && (
          <section className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-3">{t.table}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-xs">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 w-8">#</th>
                    <th className="text-left py-2">{t.team}</th>
                    <th className="py-2">{t.played}</th>
                    <th className="py-2">{t.won}</th>
                    <th className="py-2">{t.drawn}</th>
                    <th className="py-2">{t.lost}</th>
                    <th className="py-2">{t.goalDiff}</th>
                    <th className="py-2">{t.points}</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r, i) => (
                    <tr key={r.team.id} className="border-b border-border/50 text-center tabular-nums">
                      <td className="text-left py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="text-left py-1.5">{r.team.nome}</td>
                      <td>{r.p}</td>
                      <td>{r.w}</td>
                      <td>{r.d}</td>
                      <td>{r.l}</td>
                      <td>{r.gf - r.ga > 0 ? `+${r.gf - r.ga}` : r.gf - r.ga}</td>
                      <td className="font-semibold">{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <section>
          <h2 className="text-xl font-semibold mb-3">{t.results}</h2>
          {results.length ? (
            <ul>{results.map((m) => <IntlMatchRow key={m.id} m={m} locale={locale} />)}</ul>
          ) : (
            <p className="text-sm text-muted-foreground">{isLoading ? t.loading : t.noMatches}</p>
          )}
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-3">{t.fixtures}</h2>
          {fixtures.length ? (
            <ul>{fixtures.map((m) => <IntlMatchRow key={m.id} m={m} locale={locale} />)}</ul>
          ) : (
            <p className="text-sm text-muted-foreground">{isLoading ? t.loading : t.noMatches}</p>
          )}
        </section>
      </div>
    </IntlLayout>
  );
}
