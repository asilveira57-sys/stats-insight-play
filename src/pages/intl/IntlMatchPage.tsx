import { Link, useParams } from "react-router-dom";
import { IntlLayout } from "@/i18n/IntlLayout";
import { IntlSeo } from "@/i18n/IntlSeo";
import { INTL_LEAGUES, LEAGUES_BY_LOCALE, LOCALE_TAG, MATCH_SEGMENT, T } from "@/i18n/locales";
import { kickOff, useMatchBySlug, useMatchContext, type IntlMatch } from "@/i18n/useIntlData";
import { IntlMatchRow } from "./IntlMatchRow";

function h2hSummary(locale: "en" | "es", m: IntlMatch, h2h: IntlMatch[]) {
  const a = m.casa!.id;
  let wa = 0, wb = 0, d = 0, ga = 0, gb = 0;
  for (const x of h2h) {
    const aHome = x.casa?.id === a;
    const gfa = aHome ? x.gols_casa! : x.gols_fora!;
    const gfb = aHome ? x.gols_fora! : x.gols_casa!;
    ga += gfa; gb += gfb;
    if (gfa > gfb) wa++; else if (gfa < gfb) wb++; else d++;
  }
  const first = h2h[h2h.length - 1];
  const A = m.casa!.nome, B = m.fora!.nome;
  if (locale === "en") {
    return `${A} and ${B} have met ${h2h.length} times on record: ${A} ${wa} wins, ${B} ${wb} wins and ${d} draws (goals ${ga}–${gb}).` +
      (first ? ` First meeting on record: ${first.data.slice(0, 4)}.` : "");
  }
  return `${A} y ${B} se enfrentaron ${h2h.length} veces según nuestros registros: ${wa} victorias de ${A}, ${wb} de ${B} y ${d} empates (goles ${ga}-${gb}).` +
    (first ? ` Primer enfrentamiento registrado: ${first.data.slice(0, 4)}.` : "");
}

export default function IntlMatchPage({ locale }: { locale: "en" | "es" }) {
  const { slug } = useParams();
  const t = T[locale];
  const { data: m, isLoading } = useMatchBySlug(slug);
  const { data: ctx } = useMatchContext(m);
  const path = `/${locale}/${MATCH_SEGMENT[locale]}/${slug}`;

  if (isLoading) {
    return (
      <IntlLayout locale={locale}>
        <p className="text-muted-foreground">{t.loading}</p>
      </IntlLayout>
    );
  }
  if (!m || !m.casa || !m.fora) {
    return (
      <IntlLayout locale={locale}>
        <IntlSeo locale={locale} path={path} title="Aleball" description="" noindex />
        <p>{t.notFound}</p>
      </IntlLayout>
    );
  }

  const league = INTL_LEAGUES.find((l) => l.ligaId === m.liga_id && LEAGUES_BY_LOCALE[locale].includes(l.key));
  const leagueName = league?.name[locale] ?? "";
  const k = kickOff(m, LOCALE_TAG[locale]);
  const hasScore = m.gols_casa != null && m.gols_fora != null;
  const A = m.casa.nome, B = m.fora.nome;
  const vs = locale === "en" ? "vs" : "vs";
  const title = hasScore
    ? `${A} ${m.gols_casa}-${m.gols_fora} ${B}${leagueName ? ` · ${leagueName}` : ""} | Aleball`
    : `${A} ${vs} ${B}${leagueName ? ` · ${leagueName}` : ""} | Aleball`;
  const description =
    locale === "en"
      ? hasScore
        ? `${A} ${m.gols_casa}-${m.gols_fora} ${B}${leagueName ? ` in the ${leagueName}` : ""}. Head-to-head record and recent form of both teams.`
        : `${A} vs ${B}${leagueName ? ` in the ${leagueName}` : ""}: kick-off time, head-to-head record and recent form of both teams.`
      : hasScore
        ? `${A} ${m.gols_casa}-${m.gols_fora} ${B}${leagueName ? ` en ${leagueName}` : ""}. Historial entre los dos equipos y racha reciente.`
        : `${A} vs ${B}${leagueName ? ` en ${leagueName}` : ""}: horario, historial entre los dos equipos y racha reciente.`;
  const other = locale === "en" ? "es" : "en";
  // Só há versão equivalente no outro idioma se o campeonato também existe lá
  const otherHas = league && LEAGUES_BY_LOCALE[other].includes(league.key);
  const status =
    m.status === "live" ? t.live : m.status === "postponed" ? t.postponed : hasScore ? t.finalScore : t.scheduled;

  return (
    <IntlLayout
      locale={locale}
      switchTo={{ pt: `/partida/${m.slug}`, ...(otherHas ? { [other]: `/${other}/${MATCH_SEGMENT[other]}/${m.slug}` } : {}) }}
    >
      <IntlSeo
        locale={locale}
        path={path}
        title={title}
        description={description}
        noindex={!league}
        alternates={otherHas ? { [other]: `/${other}/${MATCH_SEGMENT[other]}/${m.slug}` } : undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${A} vs ${B}`,
          startDate: `${m.data}T${(m.hora ?? "12:00:00").slice(0, 8)}-03:00`,
          sport: locale === "en" ? "Football" : "Fútbol",
          homeTeam: { "@type": "SportsTeam", name: A },
          awayTeam: { "@type": "SportsTeam", name: B },
          ...(leagueName ? { superEvent: { "@type": "SportsEvent", name: leagueName } } : {}),
        }}
      />
      {league && (
        <p className="text-sm mb-2">
          <Link to={`/${locale}/${league.slug[locale]}`} className="text-primary hover:underline">
            {t.backToLeague} {leagueName}
          </Link>
        </p>
      )}
      <h1 className="text-3xl font-bold mb-1">
        {A} {hasScore ? `${m.gols_casa}–${m.gols_fora}` : vs} {B}
      </h1>
      <p className="text-muted-foreground mb-8">
        {status} · {k.date}
        {k.time ? ` · ${k.time}` : ""} {!hasScore && k.time ? <span className="text-xs">({t.kickOffLocal})</span> : null}
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{t.headToHead}</h2>
        {ctx ? (
          ctx.h2h.length ? (
            <>
              <p className="text-muted-foreground mb-3 max-w-3xl">{h2hSummary(locale, m, ctx.h2h)}</p>
              <ul>{ctx.h2h.slice(0, 10).map((x) => <IntlMatchRow key={x.id} m={x} locale={locale} />)}</ul>
            </>
          ) : (
            <p className="text-muted-foreground">{t.noHeadToHead}</p>
          )
        ) : (
          <p className="text-muted-foreground">{t.loading}</p>
        )}
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        {[
          { team: A, list: ctx?.formA },
          { team: B, list: ctx?.formB },
        ].map(({ team, list }) => (
          <div key={team}>
            <h2 className="text-lg font-semibold mb-2">
              {t.recentForm}: {team}
            </h2>
            {list ? (
              list.length ? (
                <ul>{list.map((x) => <IntlMatchRow key={x.id} m={x} locale={locale} />)}</ul>
              ) : (
                <p className="text-muted-foreground text-sm">{t.noMatches}</p>
              )
            ) : (
              <p className="text-muted-foreground text-sm">{t.loading}</p>
            )}
          </div>
        ))}
      </section>
    </IntlLayout>
  );
}
