// Estrutura de idiomas do Aleball.
// PT fica na raiz (/), EN em /en e ES em /es. Cada idioma tem os campeonatos
// do seu público, com textos próprios (não é tradução das páginas em PT).
//
// Enquanto I18N_PUBLIC = false, as páginas /en e /es existem mas recebem
// noindex e ficam fora do sitemap. Ligar só depois da aprovação do AdSense.

export const I18N_PUBLIC = false;

export type Locale = "pt" | "en" | "es";

export const LOCALE_TAG: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
};

export type IntlLeague = {
  key: string; // identificador interno, igual em todos os idiomas
  ligaId: string; // public.ligas.id
  slug: Record<"en" | "es", string>; // segmento da URL em cada idioma
  name: Record<"en" | "es", string>;
  country: Record<"en" | "es", string>;
  /** Liga de pontos corridos (tem tabela) ou copa */
  table: boolean;
};

// Temporada europeia corrente: julho a junho
export function currentSeasonStart(today = new Date()): number {
  return today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
}

export const INTL_LEAGUES: IntlLeague[] = [
  {
    key: "premier-league",
    ligaId: "a24cb871-c117-4e33-b65a-70bfee62acb5",
    slug: { en: "premier-league", es: "premier-league" },
    name: { en: "Premier League", es: "Premier League" },
    country: { en: "England", es: "Inglaterra" },
    table: true,
  },
  {
    key: "champions-league",
    ligaId: "2a51f48b-0a9c-486e-a0e9-c2c9068e2159",
    slug: { en: "champions-league", es: "champions-league" },
    name: { en: "UEFA Champions League", es: "UEFA Champions League" },
    country: { en: "Europe", es: "Europa" },
    table: false,
  },
  {
    key: "laliga",
    ligaId: "331d66fd-6c1c-4f58-b5b1-3bb4658b7383",
    slug: { en: "laliga", es: "laliga" },
    name: { en: "LaLiga", es: "LaLiga" },
    country: { en: "Spain", es: "España" },
    table: true,
  },
];

/** Campeonatos de cada idioma, na ordem do menu */
export const LEAGUES_BY_LOCALE: Record<"en" | "es", string[]> = {
  en: ["premier-league", "champions-league", "laliga"],
  es: ["laliga", "champions-league", "premier-league"],
};

export function leagueBySlug(locale: "en" | "es", slug?: string) {
  return INTL_LEAGUES.find((l) => l.slug[locale] === slug && LEAGUES_BY_LOCALE[locale].includes(l.key));
}

export function leagueByKey(key: string) {
  return INTL_LEAGUES.find((l) => l.key === key);
}

/** Segmento de URL da página de jogo em cada idioma */
export const MATCH_SEGMENT: Record<"en" | "es", string> = { en: "match", es: "partido" };

/** Textos fixos da interface */
const STRINGS_EN = {
    siteTagline: "Football results, fixtures and statistics",
    homeTitle: "Football results, fixtures and tables | Aleball",
    homeDescription:
      "Premier League, Champions League and LaLiga results, fixtures and league tables, with head-to-head records and recent form for every match.",
    homeH1: "Football results, fixtures and tables",
    homeIntro:
      "Aleball is a football data library. Every match page brings the final score, the head-to-head record and each team's recent form, built from official results.",
    competitions: "Competitions",
    results: "Results",
    fixtures: "Fixtures",
    table: "Table",
    noMatches: "No matches yet.",
    loading: "Loading…",
    team: "Team",
    played: "P",
    won: "W",
    drawn: "D",
    lost: "L",
    goalDiff: "GD",
    points: "Pts",
    matchday: "Matchday",
    headToHead: "Head-to-head",
    recentForm: "Recent form",
    firstMeeting: "First meeting on record",
    wins: "wins",
    draws: "draws",
    noHeadToHead: "No previous meetings on record.",
    kickOffLocal: "Kick-off in your local time",
    finalScore: "Final score",
    scheduled: "Scheduled",
    live: "Live",
    postponed: "Postponed",
    backToLeague: "Back to",
    notFound: "Page not found.",
    language: "Language",
    disclaimer: "Aleball is not a betting site. All figures come from official match results.",
    season: "Season",
};

const STRINGS_ES: Record<keyof typeof STRINGS_EN, string> = {
    siteTagline: "Resultados, calendario y estadísticas de fútbol",
    homeTitle: "Resultados, calendario y clasificación de fútbol | Aleball",
    homeDescription:
      "Resultados, calendario y clasificación de LaLiga, la Champions League y la Premier League, con historial de enfrentamientos y racha reciente de cada partido.",
    homeH1: "Resultados, calendario y clasificación de fútbol",
    homeIntro:
      "Aleball es una biblioteca de datos de fútbol. Cada partido muestra el resultado final, el historial entre los dos equipos y su racha reciente, a partir de los resultados oficiales.",
    competitions: "Competiciones",
    results: "Resultados",
    fixtures: "Próximos partidos",
    table: "Clasificación",
    noMatches: "Todavía no hay partidos.",
    loading: "Cargando…",
    team: "Equipo",
    played: "PJ",
    won: "G",
    drawn: "E",
    lost: "P",
    goalDiff: "DG",
    points: "Pts",
    matchday: "Jornada",
    headToHead: "Historial",
    recentForm: "Racha reciente",
    firstMeeting: "Primer enfrentamiento registrado",
    wins: "victorias",
    draws: "empates",
    noHeadToHead: "No hay enfrentamientos anteriores registrados.",
    kickOffLocal: "Hora del partido en tu zona horaria",
    finalScore: "Resultado final",
    scheduled: "Programado",
    live: "En vivo",
    postponed: "Aplazado",
    backToLeague: "Volver a",
    notFound: "Página no encontrada.",
    language: "Idioma",
    disclaimer: "Aleball no es un sitio de apuestas. Todas las cifras provienen de resultados oficiales.",
    season: "Temporada",
};

export type Strings = Record<keyof typeof STRINGS_EN, string>;
export const T: Record<"en" | "es", Strings> = { en: STRINGS_EN, es: STRINGS_ES };
