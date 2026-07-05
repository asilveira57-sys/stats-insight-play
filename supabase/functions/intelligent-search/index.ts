// Pesquisa Inteligente Statball — v2
// Intenções nomeadas + desambiguação de liga + resolvers factuais (artilheiros, time, jogador)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";
const OPENAI_MODEL = "gpt-4o-mini";

// ---------- helpers ----------
function normalize(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const SUBTEAM_RE = /(\s|^)(U-?17|U-?20|U-?23|Sub-?\d+|Women|Feminin|W)(\s|$|-)/i;
const LEAGUE_NOISE_RE = /(U-?\d+|Sub-?\d+|Feminin|Women|Amador|Júnior|Junior)/i;

type Intent =
  | "top_scorer"
  | "player_stats"
  | "team_stats"
  | "match_lookup"
  | "entity_lookup"
  | "standings"
  | "champion"
  | "open_question";

function detectIntent(q: string): Intent {
  const n = normalize(q);
  if (/artilheir|maior goleador|mais gols na|mais gols no|mais gols da|mais gols do|quem fez mais gols|top.?scorer|chuteira de ouro/.test(n))
    return "top_scorer";
  // Campeão / vencedor de competição (ex: "quem ganhou a copa de 2022")
  if (/\b(quem (ganhou|venceu|foi campe[aã]o|levou|conquistou|faturou)|campe[aã]o\b|campea\b|vencedor (da|do|de))\b/.test(n))
    return "champion";
  if (/\b(tabela|classificacao|classificacao da|classificacao do|classifica[cç][aã]o|posição|posicao)\b/.test(n))
    return "standings";
  // Resultado/placar e confronto precisam vir antes do bloco genérico de perguntas.
  if (/\b(quanto ficou|quanto foi|qual foi o placar|placar|resultado|jogo de hoje|partida de hoje)\b|\s+x\s+|\bvs\b|\bcontra\b/.test(n))
    return "match_lookup";
  // Listas/estatísticas de time: "jogos do Palmeiras", "últimos 5 jogos do Flamengo".
  if (/\b(ultimos|ultimas|ultimo|ultima|recentes|mais recentes)\b.*\b(jogos|partidas)\b|\b(jogos|partidas)\s+(do|da|de)\b|\bem casa\b|\bcomo mandante\b|\bcomo visitante\b/.test(n))
    return "team_stats";
  if (/quantos gols .* (fez|marcou)|estatistica do |estatisticas do |numeros do /.test(n))
    return "player_stats";
  if (/^(quem|qual|quais|quanto|quantos|quantas|como|quando|onde|por que|porque)\b|\?/.test(n)) {
    if (/aproveitamento|saldo|vitorias|derrotas|empates|jogos do |partidas do |campanha|quantos jogos|quantas partidas|jogou|disputou/.test(n))
      return "team_stats";
    return "open_question";
  }
  if (/\bx\b|\bvs\b|\bcontra\b|placar|jogo de|partida de/.test(n))
    return "match_lookup";
  return "entity_lookup";
}

function extractYear(q: string): number | null {
  const m = q.match(/\b(19|20)\d{2}\b/);
  if (m) return parseInt(m[0], 10);
  const n = normalize(q);
  const now = new Date();
  if (/\bano passado\b|\btemporada passada\b/.test(n)) return now.getUTCFullYear() - 1;
  if (/\beste ano\b|\bano atual\b|\btemporada atual\b|ate agora|até agora/.test(n)) return now.getUTCFullYear();
  return null;
}

function extractScope(q: string): "home" | "away" | null {
  const n = normalize(q);
  if (/\bem casa\b|\bcomo mandante\b|\bmandante\b/.test(n)) return "home";
  if (/\bfora de casa\b|\bcomo visitante\b|\bvisitante\b/.test(n)) return "away";
  return null;
}

function extractLimit(q: string): number | null {
  const n = normalize(q);
  const m = n.match(/\b(?:ultimos|ultimas|recentes|mais recentes)\s+(\d{1,2})\b|\b(\d{1,2})\s+(?:ultimos|ultimas|jogos|partidas)\b/);
  const raw = m?.[1] ?? m?.[2];
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.max(1, Math.min(value, 50));
}

function isLastMatchesQuestion(normQuery: string): boolean {
  return /\b(ultimos|ultimas|recentes|mais recentes|ultimo|ultima)\b/.test(normQuery);
}

// ---------- league aliases ----------
// Quando o usuário escreve um termo genérico, lista de "ligas canônicas" candidatas (por nome exato)
const LEAGUE_ALIAS_GROUPS: Record<string, string[]> = {
  copa: ["FIFA World Cup", "Copa do Brasil", "Copa Libertadores", "Copa Sul-Americana", "Copa do Mundo"],
  "copa do brasil": ["Copa do Brasil"],
  "copa libertadores": ["Copa Libertadores"],
  mundial: ["FIFA World Cup", "Copa do Mundo"],
  "copa do mundo": ["FIFA World Cup", "Copa do Mundo"],
  "world cup": ["FIFA World Cup", "Copa do Mundo"],
  brasileirao: ["Campeonato Brasileiro Série A"],
  "brasileirão": ["Campeonato Brasileiro Série A"],
  libertadores: ["Copa Libertadores"],
  champions: ["UEFA Champions League"],
  premier: ["Premier League"],
};

function aliasGroupFor(normQuery: string): string[] | null {
  // procura uma chave que apareça como palavra inteira na pergunta
  for (const key of Object.keys(LEAGUE_ALIAS_GROUPS).sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${key}\\b`);
    if (re.test(normQuery)) return LEAGUE_ALIAS_GROUPS[key];
  }
  return null;
}

function effectiveTopScorerYear(normQuery: string, leagueName: string, explicitYear: number | null): number | null {
  if (explicitYear) return explicitYear;
  const currentYear = new Date().getUTCFullYear();
  const nLeague = normalize(leagueName);
  if (
    currentYear === 2026 &&
    (nLeague.includes("fifa world cup") || nLeague.includes("copa do mundo")) &&
    /\b(copa|mundial|world cup)\b/.test(normQuery)
  ) {
    return 2026;
  }
  return null;
}

async function resolveLeagueCandidates(
  supabase: any,
  query: string,
  normQuery: string,
): Promise<{ id: string; name: string; score: number }[]> {
  const aliases = aliasGroupFor(normQuery);
  const out: { id: string; name: string; score: number }[] = [];

  // Resolvedor universal orientado por aliases do banco. É o caminho principal para
  // consultas naturais como "campeonato brasileiro 2025", "brasileiro", "inglês" etc.
  const { data: resolvedByDb, error: resolveError } = await supabase.rpc("resolve_competition", { p_query: query });
  if (!resolveError) {
    for (const r of resolvedByDb || []) {
      if (!r?.out_league_id) continue;
      if (out.find((o) => o.id === r.out_league_id)) continue;
      out.push({ id: r.out_league_id, name: r.out_nome, score: 1200 + (Number(r.out_score) || 0) });
    }
  } else {
    console.error("resolve_competition", resolveError);
  }

  if (aliases) {
    const { data } = await supabase
      .from("ligas")
      .select("id, nome, ativa, tipo_principal, priority_score")
      .in("nome", aliases);
    for (const l of data || []) {
      if (out.find((o) => o.id === l.id)) continue;
      const aliasIndex = aliases.indexOf(l.nome);
      out.push({ id: l.id, name: l.nome, score: 1000 - aliasIndex * 25 + (Number(l.priority_score) || 0) / 100 });
    }
  }

  // sempre completa com o search_global para termos não-alias
  const { data: glob } = await supabase.rpc("search_global", { p_query: query, p_limit: 15 });
  for (const r of glob || []) {
    if (r.entity_type !== "league") continue;
    if (LEAGUE_NOISE_RE.test(r.name)) continue;
    if (out.find((o) => o.id === r.entity_id)) continue;
    out.push({ id: r.entity_id, name: r.name, score: Number(r.score) || 0 });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

async function leagueFromId(supabase: any, leagueId: string | null | undefined): Promise<{ id: string; name: string; slug?: string | null } | null> {
  if (!leagueId) return null;
  const { data: l, error } = await supabase
    .from("ligas")
    .select("id, nome, slug")
    .eq("id", leagueId)
    .maybeSingle();
  if (error || !l) return null;
  return { id: l.id, name: l.nome, slug: l.slug ?? null };
}

async function fetchCompetitionMatches(
  supabase: any,
  leagueId: string,
  year: number | null,
  limit = 12,
  finishedOnly = false,
): Promise<{ rows: any[]; total: number; source: string }> {
  const all: any[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = supabase
      .from("partidas")
      .select("id, slug, data, hora, gols_casa, gols_fora, time_casa_id, time_fora_id, liga_id, status, rodada")
      .eq("liga_id", leagueId)
      .order("data", { ascending: false })
      .order("hora", { ascending: false });
    if (finishedOnly) q = q.eq("status", "finished").not("gols_casa", "is", null).not("gols_fora", "is", null);
    if (year) q = q.gte("data", `${year}-01-01`).lte("data", `${year}-12-31`);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) {
      console.error("fetchCompetitionMatches", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const picked = all.slice(0, limit);
  const teamIds = [...new Set(picked.flatMap((m: any) => [m.time_casa_id, m.time_fora_id]).filter(Boolean))];
  const { data: teams } = teamIds.length
    ? await supabase.from("times").select("id, nome, slug").in("id", teamIds)
    : { data: [] };
  const tmap = new Map((teams || []).map((t: any) => [t.id, t]));
  const rows = picked.map((m: any) => {
    const home: any = m.time_casa_id ? tmap.get(m.time_casa_id) : null;
    const away: any = m.time_fora_id ? tmap.get(m.time_fora_id) : null;
    return {
      id: m.id,
      slug: m.slug ?? null,
      detail_path: m.slug ? `/partida/${m.slug}` : null,
      data: m.data,
      is_home: true,
      home_team: home?.nome ?? "—",
      away_team: away?.nome ?? "—",
      home_team_slug: home?.slug ?? null,
      away_team_slug: away?.slug ?? null,
      gols_casa: m.gols_casa,
      gols_fora: m.gols_fora,
      liga_id: m.liga_id ?? null,
      liga_nome: null,
      liga_slug: null,
      rodada: m.rodada ?? null,
      status: m.status ?? null,
    };
  });
  return { rows, total: all.length, source: "partidas" };
}

async function resolveStandingsRows(
  supabase: any,
  leagueId: string,
  year: number | null,
): Promise<{ rows: any[]; source: string }> {
  const { data, error } = await supabase.rpc("search_standings_universal", {
    p_league_id: leagueId,
    p_year: year,
  });
  if (error) {
    console.error("search_standings_universal", error);
  }
  if (data && data.length > 0) return { rows: data, source: "standings" };

  // Fallback universal: calcula a tabela diretamente pelas partidas finalizadas.
  // Isso evita "não encontrado" quando a tabela standings ainda não foi importada,
  // mas os jogos/resultados oficiais já estão no banco.
  const matches: any[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = supabase
      .from("partidas")
      .select("time_casa_id, time_fora_id, gols_casa, gols_fora")
      .eq("liga_id", leagueId)
      .eq("status", "finished")
      .not("gols_casa", "is", null)
      .not("gols_fora", "is", null);
    if (year) q = q.gte("data", `${year}-01-01`).lte("data", `${year}-12-31`);
    const { data: batch, error: matchError } = await q.range(from, from + PAGE - 1);
    if (matchError) {
      console.error("resolveStandingsRows partidas", matchError);
      break;
    }
    if (!batch || batch.length === 0) break;
    matches.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  if (matches.length === 0) return { rows: [], source: "none" };

  const table = new Map<string, { team_id: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }>();
  const ensure = (id: string) => {
    const cur = table.get(id) || { team_id: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
    table.set(id, cur);
    return cur;
  };
  for (const m of matches) {
    if (!m.time_casa_id || !m.time_fora_id) continue;
    const h = ensure(m.time_casa_id);
    const a = ensure(m.time_fora_id);
    const hg = Number(m.gols_casa || 0);
    const ag = Number(m.gols_fora || 0);
    h.played += 1; a.played += 1;
    h.gf += hg; h.ga += ag;
    a.gf += ag; a.ga += hg;
    if (hg > ag) { h.won += 1; a.lost += 1; h.points += 3; }
    else if (hg < ag) { a.won += 1; h.lost += 1; a.points += 3; }
    else { h.drawn += 1; a.drawn += 1; h.points += 1; a.points += 1; }
  }
  const teamIds = [...table.keys()];
  const { data: teams } = teamIds.length
    ? await supabase.from("times").select("id, nome, slug").in("id", teamIds)
    : { data: [] };
  const tmap = new Map((teams || []).map((t: any) => [t.id, t]));
  const rows = [...table.values()]
    .sort((a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      (b.gf - b.ga) - (a.gf - a.ga) ||
      b.gf - a.gf
    )
    .map((r, i) => {
      const t: any = tmap.get(r.team_id);
      return {
        out_pos: i + 1,
        out_team_id: r.team_id,
        out_team_nome: t?.nome ?? "—",
        out_team_slug: t?.slug ?? null,
        out_points: r.points,
        out_played: r.played,
        out_won: r.won,
        out_drawn: r.drawn,
        out_lost: r.lost,
        out_gf: r.gf,
        out_ga: r.ga,
        out_gd: r.gf - r.ga,
        out_year: year,
      };
    });
  return { rows, source: "partidas_aggregated" };
}

async function resolveCompetitionOverview(
  supabase: any,
  league: { id: string; name: string; slug?: string | null },
  year: number | null,
  wantsStandings = false,
  wantsFinishedMatches = false,
): Promise<{ structured: any | null; ai: any; source: string }> {
  const { rows: standings, source: standingsSource } = await resolveStandingsRows(supabase, league.id, year);
  if (wantsStandings && standings.length > 0) {
    const leader = standings[0];
    return {
      source: standingsSource,
      ai: {
        answer: `A tabela da **${league.name}**${year ? ` em **${year}**` : ""} tem **${leader.out_team_nome}** na liderança com **${leader.out_points} pontos**.`,
        explanation: "Fonte: classificação oficial armazenada no StatBall.",
        has_enough_data: true,
        confidence: 95,
      },
      structured: {
        kind: "standings",
        summary: `Classificação da ${league.name}${year ? ` ${year}` : ""}. Líder: ${leader.out_team_nome} (${leader.out_points} pontos).`,
        league: { id: league.id, name: league.name, slug: league.slug ?? null },
        year,
        source: standingsSource,
        standings,
      },
    };
  }

  const { rows: matches, total, source: matchesSource } = await fetchCompetitionMatches(supabase, league.id, year, 12, wantsFinishedMatches);
  if (matches.length > 0) {
    const displayMatches = matches.map((m: any) => ({
      ...m,
      liga_nome: m.liga_nome ?? league.name,
      liga_slug: m.liga_slug ?? league.slug ?? null,
      detail_path: m.detail_path ?? (m.slug ? `/partida/${m.slug}` : null),
    }));
    const last = displayMatches[0];
    const placar = last.gols_casa != null && last.gols_fora != null ? `${last.gols_casa} x ${last.gols_fora}` : "placar indisponível";
    return {
      source: matchesSource,
      ai: {
        answer: `Encontrei **${total} jogos** da **${league.name}**${year ? ` em **${year}**` : ""} no banco do StatBall. Último registro: **${last.home_team} ${placar} ${last.away_team}**${last.data ? ` em ${String(last.data).slice(0, 10)}` : ""}.`,
        explanation: "Fonte: tabela de partidas do StatBall.",
        has_enough_data: true,
        confidence: 92,
      },
      structured: {
        kind: "competition_matches",
        summary: `${league.name}${year ? ` ${year}` : ""}: ${total} jogos encontrados no banco do StatBall.`,
        league: { id: league.id, name: league.name, slug: league.slug ?? null },
        year,
        source: matchesSource,
        matches: displayMatches,
        total_matches: total,
      },
    };
  }

  return {
    source: "none",
    structured: null,
    ai: notFoundAnswer(`A competição ${league.name} foi identificada, mas não há jogos${year ? ` em ${year}` : ""} cadastrados no banco do StatBall.`),
  };
}

// ---------- top scorer resolver ----------
function isWorldCup2026League(leagueName: string, year: number | null): boolean {
  const n = normalize(leagueName);
  return year === 2026 && (n.includes("fifa world cup") || n.includes("copa do mundo"));
}

function parseGoalScorer(description: string | null): string | null {
  if (!description) return null;
  if (/own goal/i.test(description)) return null;
  const afterDash = description.includes("—") ? description.split("—").slice(1).join("—") : description;
  const name = afterDash.replace(/\(assist:.*?\)/i, "").trim();
  return name || null;
}

async function resolveWorldCup2026TopScorers(
  supabase: any,
  limit = 10,
): Promise<{ rows: any[]; source: string }> {
  const events: any[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("world_cup_2026_match_events")
      .select("player_id, team_id, description, event_type")
      .eq("event_type", "goal")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("world_cup_2026_match_events", error);
      break;
    }
    if (!data || data.length === 0) break;
    events.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (events.length === 0) return { rows: [], source: "none" };

  const playerIds = [...new Set(events.map((e) => e.player_id).filter(Boolean))];
  const teamIds = [...new Set(events.map((e) => e.team_id).filter(Boolean))];
  const [{ data: players }, { data: teams }] = await Promise.all([
    playerIds.length > 0
      ? supabase.from("world_cup_2026_players").select("id, name, slug").in("id", playerIds)
      : Promise.resolve({ data: [] }),
    teamIds.length > 0
      ? supabase.from("world_cup_2026_teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [] }),
  ]);
  const pmap = new Map((players || []).map((p: any) => [p.id, p]));
  const tmap = new Map((teams || []).map((t: any) => [t.id, t.name]));

  const counts = new Map<string, { jogador: string; slug: string | null; time_id: string | null; gols: number }>();
  for (const e of events) {
    const player = e.player_id ? pmap.get(e.player_id) : null;
    const scorer = player?.name || parseGoalScorer(e.description);
    if (!scorer) continue;
    const key = `${normalize(scorer)}|${e.team_id ?? ""}`;
    const cur = counts.get(key) || { jogador: scorer, slug: player?.slug || null, time_id: e.team_id ?? null, gols: 0 };
    cur.gols += 1;
    counts.set(key, cur);
  }

  const rows = [...counts.values()]
    .map((r) => ({
      jogador: r.jogador,
      slug: r.slug,
      time: r.time_id ? tmap.get(r.time_id) || null : null,
      gols: r.gols,
      temporada: "2026",
    }))
    .sort((a, b) => b.gols - a.gols || a.jogador.localeCompare(b.jogador))
    .slice(0, limit);

  return { rows, source: "world_cup_2026_match_events" };
}

async function resolveTopScorers(
  supabase: any,
  leagueId: string,
  leagueName: string,
  year: number | null,
  limit = 10,
): Promise<{ rows: any[]; source: string }> {
  if (isWorldCup2026League(leagueName, year)) {
    return resolveWorldCup2026TopScorers(supabase, limit);
  }

  // 1) artilharia_agregada (preferida)
  let q = supabase
    .from("artilharia_agregada")
    .select("jogador_nome, jogador_slug, gols, partidas_com_gol, time_id, temporada")
    .eq("competicao_id", leagueId)
    .order("gols", { ascending: false });
  if (year) q = q.eq("temporada", String(year));
  const { data: agg } = await q.range(0, limit - 1);

  if (agg && agg.length > 0) {
    // resolve nome dos times
    const teamIds = [...new Set(agg.map((r: any) => r.time_id).filter(Boolean))];
    const { data: teams } = await supabase.from("times").select("id, nome").in("id", teamIds);
    const tmap = new Map((teams || []).map((t: any) => [t.id, t.nome]));
    return {
      rows: agg.map((r: any) => ({
        jogador: r.jogador_nome,
        slug: r.jogador_slug,
        time: tmap.get(r.time_id) || null,
        gols: r.gols,
        temporada: r.temporada,
      })),
      source: "artilharia_agregada",
    };
  }

  // 2) Fallback: agregar gols_partida via partidas da liga
  // pega ids das partidas da liga (no ano se houver), depois conta gols
  let pq = supabase
    .from("partidas")
    .select("id")
    .eq("liga_id", leagueId)
    .eq("status", "finished");
  if (year) pq = pq.gte("data", `${year}-01-01`).lte("data", `${year}-12-31`);
  const partidaIds: string[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await pq.range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    partidaIds.push(...data.map((p: any) => p.id));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  if (partidaIds.length === 0) return { rows: [], source: "none" };

  // agrupa gols em batches (cláusula IN tem limite prático)
  const counts = new Map<string, { gols: number; time_id: string | null }>();
  for (let i = 0; i < partidaIds.length; i += 500) {
    const slice = partidaIds.slice(i, i + 500);
    let gfrom = 0;
    while (true) {
      const { data, error } = await supabase
        .from("gols_partida")
        .select("jogador_nome, time_id, tipo")
        .in("partida_id", slice)
        .range(gfrom, gfrom + PAGE - 1);
      if (error || !data || data.length === 0) break;
      for (const g of data) {
        if (!g.jogador_nome || g.tipo === "own_goal") continue;
        const key = `${normalize(g.jogador_nome)}|${g.time_id ?? ""}`;
        const cur = counts.get(key) || { gols: 0, time_id: g.time_id };
        cur.gols += 1;
        counts.set(key, cur);
      }
      if (data.length < PAGE) break;
      gfrom += PAGE;
    }
  }
  if (counts.size === 0) return { rows: [], source: "none" };

  const teamIds = [...new Set([...counts.values()].map((v) => v.time_id).filter(Boolean))] as string[];
  const { data: teams } = await supabase.from("times").select("id, nome").in("id", teamIds);
  const tmap = new Map((teams || []).map((t: any) => [t.id, t.nome]));

  const rows = [...counts.entries()]
    .map(([key, v]) => {
      const jogador_nome = key.split("|")[0];
      return {
        jogador: jogador_nome.replace(/\b\w/g, (c) => c.toUpperCase()),
        slug: null,
        time: v.time_id ? tmap.get(v.time_id) : null,
        gols: v.gols,
        temporada: year ? String(year) : null,
      };
    })
    .sort((a, b) => b.gols - a.gols)
    .slice(0, limit);

  return { rows, source: "gols_partida" };
}

// ---------- team stats (mantém comportamento anterior) ----------
async function fetchSide(supabase: any, side: "home" | "away", teamId: string, year: number | null) {
  const col = side === "home" ? "time_casa_id" : "time_fora_id";
  const all: any[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = supabase
      .from("partidas")
      .select("id, data, hora, gols_casa, gols_fora, time_casa_id, time_fora_id, status, liga_id, slug")
      .eq("status", "finished")
      .not("gols_casa", "is", null)
      .not("gols_fora", "is", null)
      .eq(col, teamId);
    if (year) q = q.gte("data", `${year}-01-01`).lte("data", `${year}-12-31`);
    const { data, error } = await q.order("data", { ascending: false }).range(from, from + PAGE - 1);
    if (error) { console.error("fetchSide", side, error); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function fetchAllPartidas(supabase: any, teamId: string, year: number | null, scope: "home" | "away" | null) {
  if (scope === "home") return fetchSide(supabase, "home", teamId, year);
  if (scope === "away") return fetchSide(supabase, "away", teamId, year);
  const [h, a] = await Promise.all([
    fetchSide(supabase, "home", teamId, year),
    fetchSide(supabase, "away", teamId, year),
  ]);
  return [...h, ...a].sort((x, y) => (y.data || "").localeCompare(x.data || ""));
}

async function buildMatchRows(supabase: any, matches: any[], focusTeamId?: string | null) {
  const ligaIds = [...new Set(matches.map((m: any) => m.liga_id).filter(Boolean))];
  const teamIds = [...new Set(matches.flatMap((m: any) => [m.time_casa_id, m.time_fora_id]).filter(Boolean))];
  const [{ data: ligas }, { data: teams }] = await Promise.all([
    ligaIds.length ? supabase.from("ligas").select("id, nome, slug").in("id", ligaIds) : Promise.resolve({ data: [] }),
    teamIds.length ? supabase.from("times").select("id, nome, slug").in("id", teamIds) : Promise.resolve({ data: [] }),
  ]);
  const ligaMap = new Map((ligas || []).map((l: any) => [l.id, l]));
  const teamMap = new Map((teams || []).map((t: any) => [t.id, t]));
  return matches.map((m: any) => {
    const home: any = m.time_casa_id ? teamMap.get(m.time_casa_id) : null;
    const away: any = m.time_fora_id ? teamMap.get(m.time_fora_id) : null;
    const liga: any = m.liga_id ? ligaMap.get(m.liga_id) : null;
    return {
      id: m.id,
      data: m.data,
      slug: m.slug ?? null,
      detail_path: m.slug ? `/partida/${m.slug}` : null,
      is_home: focusTeamId ? m.time_casa_id === focusTeamId : true,
      home_team: home?.nome ?? "—",
      away_team: away?.nome ?? "—",
      home_team_slug: home?.slug ?? null,
      away_team_slug: away?.slug ?? null,
      gols_casa: m.gols_casa,
      gols_fora: m.gols_fora,
      liga_id: m.liga_id ?? null,
      liga_nome: liga?.nome ?? null,
      liga_slug: liga?.slug ?? null,
    };
  });
}

async function resolveTeamMatches(
  supabase: any,
  team: any,
  year: number | null,
  scope: "home" | "away" | null,
  requestedLimit: number | null,
) {
  const matches = await fetchAllPartidas(supabase, team.entity_id, year, scope);
  const limit = requestedLimit ?? (isLastMatchesQuestion(normalize(team.query || "")) ? 5 : 20);
  const picked = matches.slice(0, limit);
  const rows = await buildMatchRows(supabase, picked, team.entity_id);
  return { rows, total: matches.length, source: "partidas" };
}

async function resolveHeadToHead(
  supabase: any,
  leftTeam: any,
  rightTeam: any,
  year: number | null,
) {
  const fetchPair = async (homeId: string, awayId: string) => {
    const rows: any[] = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      let q = supabase
        .from("partidas")
        .select("id, data, hora, gols_casa, gols_fora, time_casa_id, time_fora_id, liga_id, status, slug")
        .eq("time_casa_id", homeId)
        .eq("time_fora_id", awayId)
        .not("gols_casa", "is", null)
        .not("gols_fora", "is", null)
        .order("data", { ascending: false });
      if (year) q = q.gte("data", `${year}-01-01`).lte("data", `${year}-12-31`);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) {
        console.error("resolveHeadToHead pair", error);
        break;
      }
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return rows;
  };
  const [a, b] = await Promise.all([
    fetchPair(leftTeam.entity_id, rightTeam.entity_id),
    fetchPair(rightTeam.entity_id, leftTeam.entity_id),
  ]);
  const all = [...a, ...b].sort((x, y) => String(y.data || "").localeCompare(String(x.data || "")));
  const rows = await buildMatchRows(supabase, all.slice(0, 20), null);
  return { rows, total: all.length, source: "partidas" };
}


function aggregate(matches: any[], teamId: string) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of matches) {
    const isHome = m.time_casa_id === teamId;
    const my = isHome ? (m.gols_casa ?? 0) : (m.gols_fora ?? 0);
    const op = isHome ? (m.gols_fora ?? 0) : (m.gols_casa ?? 0);
    gf += my; ga += op;
    if (my > op) w++;
    else if (my === op) d++;
    else l++;
  }
  return { total: matches.length, w, d, l, gf, ga };
}

const STOPWORDS = new Set([
  "quem", "qual", "quais", "quanto", "quantos", "quantas", "como", "quando", "onde", "porque", "por", "que",
  "jogos", "jogo", "partidas", "partida", "jogou", "disputou", "fez", "marcou", "ganhou", "perdeu", "empatou",
  "em", "no", "na", "nos", "nas", "do", "da", "dos", "das", "de", "o", "a", "os", "as", "um", "uma", "pelo", "pela",
  "ano", "temporada", "ate", "agora", "estatistica", "estatisticas", "campanha", "aproveitamento",
]);

function extractEntityTokens(normQuery: string): string[] {
  return normQuery
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function slugish(s: string): string {
  return normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stripQueryNoise(s: string): string {
  return normalize(s)
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b(ultimos|ultimas|ultimo|ultima|recentes|mais recentes)\b/g, " ")
    .replace(/\b\d{1,2}\b/g, " ")
    .replace(/\b(jogos|jogo|partidas|partida|do|da|de|dos|das|em casa|fora de casa|como mandante|como visitante|mandante|visitante)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTeamPhraseFromStatsQuery(query: string): string | null {
  const n = normalize(query);
  const direct = n.match(/(?:jogos|jogo|partidas|partida)\s+(?:do|da|de|dos|das)\s+(.+?)(?:\s+em\s+casa|\s+fora\s+de\s+casa|\s+como\s+mandante|\s+como\s+visitante|\s+em\s+(?:19|20)\d{2}|$)/);
  if (direct?.[1]) return stripQueryNoise(direct[1]);
  const last = n.match(/(?:ultimos|ultimas|ultimo|ultima|recentes|mais recentes)(?:\s+\d{1,2})?\s+(?:jogos|partidas)\s+(?:do|da|de|dos|das)\s+(.+)/);
  if (last?.[1]) return stripQueryNoise(last[1]);
  const cleaned = stripQueryNoise(n);
  return cleaned || null;
}

function extractHeadToHeadPhrases(query: string): { left: string; right: string } | null {
  const n = normalize(query)
    .replace(/\b(quanto ficou|quanto foi|qual foi o placar|placar|resultado|do jogo|jogo|partida)\b/g, " ")
    .replace(/\?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = n.split(/\s+(?:x|vs|contra)\s+/).map((p) => stripQueryNoise(p)).filter(Boolean);
  if (parts.length >= 2) return { left: parts[0], right: parts[1] };
  return null;
}

function isNationalTeamPhrase(phrase: string): boolean {
  const n = normalize(phrase).replace(/_/g, " ");
  return Object.values(NATIONAL_TEAM_ALIASES).some((group) => group.some((alias) => normalize(alias) === n));
}

function nationalAliasesForPhrase(phrase: string): string[] {
  const n = normalize(phrase).replace(/_/g, " ");
  for (const group of Object.values(NATIONAL_TEAM_ALIASES)) {
    if (group.some((alias) => normalize(alias) === n)) return [...new Set(group.map((alias) => normalize(alias)))];
  }
  return [];
}

function candidateTeamScore(t: any, phrase: string): number {
  const p = normalize(phrase);
  const pSlug = slugish(phrase);
  const nameNorm = normalize(t.nome || "");
  const slugNorm = normalize(t.slug || "").replace(/-/g, " ");
  const tokenMatch = new RegExp(`(^|\\s|-)${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|-|$)`).test(nameNorm) || slugNorm.split(/\s+/).includes(p);
  let score = Number(t.total_matches || 0);
  if (nameNorm === p || slugNorm === p || t.slug === pSlug) score += 5000;
  else if (tokenMatch) score += 1500;
  else if (nameNorm.includes(p) || slugNorm.includes(p)) score += 250;
  if (isNationalTeamPhrase(p) && String(t.pais || "").toLowerCase() === "international") score += 3000;
  if (String(t.pais || "").toLowerCase() === "brazil") score += 350;
  if (t.estado) score += 120;
  if (/^(se|cr|ec|sc|fc|ac|ca|cf)\s+/i.test(t.nome || "")) score += 160;
  if (SUBTEAM_RE.test(t.nome || "")) score -= 2000;
  if (/-[A-Z]{2}\b/.test(t.nome || "") || /\b(women|u\d+|sub-?\d+)\b/i.test(t.nome || "")) score -= 900;
  if (isNationalTeamPhrase(p) && !(nameNorm === p || slugNorm === p || t.slug === pSlug || String(t.pais || "").toLowerCase() === "international")) score -= 5000;
  return score;
}

async function resolveTeamByPhrase(supabase: any, phrase: string): Promise<any | null> {
  const clean = stripQueryNoise(phrase);
  if (!clean || clean.length < 3) return null;
  const s = slugish(clean);
  const n = normalize(clean);
  const candidates: any[] = [];
  const seen = new Set<string>();
  const pushRows = (rows: any[] | null | undefined) => {
    for (const t of rows || []) {
      if (!t?.id || seen.has(t.id)) continue;
      seen.add(t.id);
      candidates.push(t);
    }
  };

  const exact = await supabase
    .from("times")
    .select("id, nome, slug, total_matches, pais, estado, cores, escudo_url")
    .or(`slug.eq.${s},nome.ilike.${clean}`)
    .range(0, 19);
  pushRows(exact.data);

  const nationalAliases = nationalAliasesForPhrase(clean);
  for (const alias of nationalAliases) {
    const aliasSlug = slugish(alias);
    const { data, error } = await supabase
      .from("times")
      .select("id, nome, slug, total_matches, pais, estado, cores, escudo_url")
      .or(`slug.eq.${aliasSlug},nome.ilike.${alias}`)
      .range(0, 9);
    if (!error) pushRows(data);
  }

  const tokens = n.split(/\s+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  for (const token of tokens.slice(0, 3)) {
    const { data, error } = await supabase
      .from("times")
      .select("id, nome, slug, total_matches, pais, estado, cores, escudo_url")
      .or(`nome.ilike.%${token}%,slug.ilike.%${token}%`)
      .range(0, 39);
    if (!error) pushRows(data);
  }

  if (candidates.length === 0) return null;
  const scored = candidates
    .map((t) => ({ entity_type: "team", entity_id: t.id, name: t.nome, score: candidateTeamScore(t, clean), extra: t }))
    .filter((c) => c.score > -1000)
    .sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

async function resolveTeamCandidate(supabase: any, query: string, normQuery: string, results: any[]) {
  const phrase = extractTeamPhraseFromStatsQuery(query);
  if (phrase) {
    const direct = await resolveTeamByPhrase(supabase, phrase);
    if (direct) return direct;
  }

  const teamCandidates = (results || []).filter((r: any) => r.entity_type === "team");
  const fromResults = teamCandidates
    .map((r: any) => ({ ...r, score: Number(r.score || 0) + candidateTeamScore({ ...(r.extra || {}), id: r.entity_id, nome: r.name }, phrase || normQuery) }))
    .filter((r: any) => !isNationalTeamPhrase(phrase || normQuery) || String(r.extra?.pais || "").toLowerCase() === "international")
    .sort((a: any, b: any) => b.score - a.score)
    .find((r: any) => !SUBTEAM_RE.test(r.name)) || teamCandidates[0];
  if (fromResults) return fromResults;

  const tokens = extractEntityTokens(normQuery);
  const seen = new Set<string>();
  const candidates: any[] = [];
  for (const token of tokens) {
    const { data, error } = await supabase
      .from("times")
      .select("id, nome, slug, total_matches, pais, estado, cores, escudo_url")
      .or(`nome.ilike.%${token}%,slug.ilike.%${token}%`)
      .range(0, 19);
    if (error) {
      console.error("resolveTeamCandidate", error);
      continue;
    }
    for (const t of data || []) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      const teamNorm = normalize(`${t.nome} ${t.slug || ""}`);
      const exact = tokens.some((tok) => teamNorm.split(/\s|-/).includes(tok));
      const subPenalty = SUBTEAM_RE.test(t.nome) ? 500 : 0;
      const suffixPenalty = /-[a-z]{2}\b|\b(pi|sc|ba|u17|u20|u23|w)\b/i.test(t.nome) ? 120 : 0;
      const score = candidateTeamScore(t, token) + (exact ? 1000 : 0) - subPenalty - suffixPenalty;
      candidates.push({ entity_type: "team", entity_id: t.id, name: t.nome, score, extra: t });
    }
  }
  candidates.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  return candidates[0] || null;
}

// ---------- IA (Lovable AI Gateway) ----------
async function openaiChat(body: any): Promise<any | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const openaiBody = { ...body, model: OPENAI_MODEL };
    const r = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(openaiBody),
    });
    if (!r.ok) {
      console.error("openai error", r.status, await r.text().catch(() => ""));
      return null;
    }
    return await r.json();
  } catch (e) {
    console.error("openaiChat ex", e);
    return null;
  }
}

async function lovableAiChat(body: any): Promise<any | null> {
  if (LOVABLE_API_KEY) {
    try {
      const r = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status === 402) {
        console.warn("AI gateway limit", r.status, "→ tentando OpenAI");
      } else {
        console.error("AI gateway error", r.status, await r.text().catch(() => ""));
      }
    } catch (e) {
      console.error("lovableAiChat ex", e);
    }
  }
  // Fallback OpenAI
  return await openaiChat(body);
}

async function callAI(context: string, question: string) {
  const system = `Você é o assistente do Statball, plataforma de estatísticas de futebol.
Regras: 1) Responda em PT-BR, conciso. 2) Use APENAS o CONTEXTO. 3) Se faltar dado, responda "Ainda não há dados suficientes no Statball para responder com precisão." 4) JSON: { answer, explanation, has_enough_data, confidence }.`;
  const data = await lovableAiChat({
    model: AI_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `CONTEXTO:\n${context}\n\nPERGUNTA: ${question}\n\nResponda em JSON.` },
    ],
    response_format: { type: "json_object" },
  });
  if (!data) {
    return { answer: "Ainda não há dados suficientes no Statball para responder com precisão.", explanation: "IA indisponível.", has_enough_data: false, confidence: 0 };
  }
  try {
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      answer: parsed.answer ?? "Ainda não há dados suficientes no Statball para responder com precisão.",
      explanation: parsed.explanation ?? "",
      has_enough_data: !!parsed.has_enough_data,
      confidence: Number(parsed.confidence ?? 0),
    };
  } catch (e) {
    console.error("callAI parse", e);
    return { answer: "Ainda não há dados suficientes no Statball para responder com precisão.", explanation: "Falha ao interpretar IA.", has_enough_data: false, confidence: 0 };
  }
}

// Classificador LLM: entende a pergunta e devolve intent + entidades
async function classifyWithAI(question: string): Promise<{
  intent: string;
  team?: string | null;
  opponent?: string | null;
  player?: string | null;
  league?: string | null;
  year?: number | null;
  time_modifier?: string | null;
} | null> {
  const system = `Classifique perguntas de futebol em PT-BR. Devolva JSON com:
- intent: um de "top_scorer" | "team_stats" | "match_lookup" | "last_match" | "next_match" | "player_stats" | "coach_lookup" | "entity_lookup" | "open_question"
- team: nome do time principal mencionado (ou null)
- opponent: adversário (ou null)
- player: jogador mencionado (ou null)
- league: liga/competição mencionada (ou null) — exs: "Copa do Mundo", "Brasileirão", "Libertadores"
- year: ano específico (ou null)
- time_modifier: "last" | "next" | "specific" | null
Use null quando não houver. NÃO invente nomes.`;
  const data = await lovableAiChat({
    model: AI_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: question },
    ],
    response_format: { type: "json_object" },
  });
  if (!data) return null;
  try {
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed;
  } catch {
    return null;
  }
}

// Política de "não encontrado": jamais inventar resposta a partir do conhecimento do modelo.
const NOT_FOUND_MESSAGE = "Não encontrei esse dado no banco de dados do StatBall.";

function notFoundAnswer(detail?: string) {
  return {
    answer: NOT_FOUND_MESSAGE,
    explanation: detail || "Nenhum registro correspondente foi localizado nas tabelas internas.",
    has_enough_data: false,
    confidence: 0,
  };
}

// Resolver de campeão consultando exclusivamente o banco (team_titles).
async function resolveChampionFromDB(
  supabase: any,
  competitionLabel: string | null,
  year: number | null,
  leagueId?: string | null,
): Promise<{ time: string; time_slug: string | null; competition: string; year: number | null; mode?: "champion" | "leader"; source?: string } | null> {
  if (!competitionLabel && !year && !leagueId) return null;
  let q = supabase
    .from("team_titles")
    .select("team_id, competition_name, edition_year, position")
    .ilike("position", "campe%");
  if (competitionLabel) q = q.ilike("competition_name", `%${competitionLabel}%`);
  if (year) q = q.eq("edition_year", year);
  const { data, error } = await q.range(0, 4);
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  const { data: time } = await supabase.from("times").select("nome, slug").eq("id", row.team_id).maybeSingle();
  return {
    time: time?.nome ?? "—",
    time_slug: time?.slug ?? null,
    competition: row.competition_name,
    year: row.edition_year,
    mode: "champion",
    source: "team_titles",
  };
}

async function resolveChampionOrLeader(
  supabase: any,
  league: { id: string; name: string } | null,
  competitionLabel: string | null,
  year: number | null,
): Promise<{ time: string; time_slug: string | null; competition: string; year: number | null; mode: "champion" | "leader"; source: string } | null> {
  const fromTitles = await resolveChampionFromDB(supabase, competitionLabel, year, league?.id ?? null);
  if (fromTitles) return { ...fromTitles, mode: "champion", source: fromTitles.source || "team_titles" };

  if (league?.id && year) {
    const { data: season } = await supabase
      .from("seasons")
      .select("winner_team_id, year")
      .eq("league_id", league.id)
      .eq("year", year)
      .maybeSingle();
    if (season?.winner_team_id) {
      const { data: time } = await supabase.from("times").select("nome, slug").eq("id", season.winner_team_id).maybeSingle();
      if (time?.nome) {
        return { time: time.nome, time_slug: time.slug ?? null, competition: league.name, year: season.year, mode: "champion", source: "seasons" };
      }
    }
  }

  if (league?.id) {
    const { rows, source } = await resolveStandingsRows(supabase, league.id, year);
    const leader = rows?.[0];
    if (leader?.out_team_nome) {
      return {
        time: leader.out_team_nome,
        time_slug: leader.out_team_slug ?? null,
        competition: league.name,
        year,
        mode: "leader",
        source,
      };
    }
  }

  return null;
}

// ---------- Last match resolver ----------
async function findTeamByName(supabase: any, name: string): Promise<{ id: string; name: string; slug: string | null } | null> {
  if (!name) return null;
  const n = normalize(name);
  const tokens = n.split(/\s+/).filter((t) => t.length >= 3);
  const orFilter = [`nome.ilike.%${name}%`, `slug.ilike.%${n}%`, ...tokens.map((t) => `nome.ilike.%${t}%`)].join(",");
  const { data } = await supabase
    .from("times")
    .select("id, nome, slug, total_matches")
    .or(orFilter)
    .order("total_matches", { ascending: false })
    .range(0, 9);
  const filtered = (data || []).filter((t: any) => !SUBTEAM_RE.test(t.nome));
  const pick = filtered[0] || (data || [])[0];
  return pick ? { id: pick.id, name: pick.nome, slug: pick.slug ?? null } : null;
}

async function resolveLastMatch(
  supabase: any,
  teamId: string,
  teamName: string,
  teamSlug: string | null,
  leagueHint: string | null,
  year: number | null,
): Promise<any | null> {
  // Tenta primeiro Copa do Mundo 2026 se a dica for "copa/mundial"
  const wantsWorldCup = leagueHint && /copa|mundial|world cup|mundo/.test(normalize(leagueHint));
  if (wantsWorldCup) {
    // Mapear team -> world_cup_2026_teams pelo nome
    const { data: wcTeam } = await supabase
      .from("world_cup_2026_teams")
      .select("id, name, slug")
      .ilike("name", `%${teamName}%`)
      .maybeSingle();
    if (wcTeam) {
      const { data: matches } = await supabase
        .from("world_cup_2026_matches")
        .select("*")
        .or(`home_team_id.eq.${wcTeam.id},away_team_id.eq.${wcTeam.id}`)
        .eq("status", "finished")
        .order("match_date", { ascending: false })
        .range(0, 0);
      const m = (matches || [])[0];
      if (m) {
        const oppId = m.home_team_id === wcTeam.id ? m.away_team_id : m.home_team_id;
        const { data: opp } = await supabase.from("world_cup_2026_teams").select("name, slug").eq("id", oppId).maybeSingle();
        const isHome = m.home_team_id === wcTeam.id;
        return {
          kind: "last_match",
          source: "world_cup_2026_matches",
          team: { id: teamId, name: teamName, slug: teamSlug },
          competition: { name: "Copa do Mundo FIFA 2026", slug: null },
          match: {
            id: m.id,
            slug: m.slug ?? null,
            detail_path: `/copa-2026/jogos/${m.id}`,
            date: m.match_date,
            is_home: isHome,
            home_team: isHome ? teamName : (opp?.name ?? "—"),
            away_team: isHome ? (opp?.name ?? "—") : teamName,
            gols_casa: m.home_score,
            gols_fora: m.away_score,
            stage: m.stage ?? null,
          },
        };
      }
    }
  }

  // Caso geral: tabela `partidas`
  let q = supabase
    .from("partidas")
    .select("id, slug, data, hora, gols_casa, gols_fora, time_casa_id, time_fora_id, liga_id, status")
    .eq("status", "finished")
    .not("gols_casa", "is", null)
    .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
    .order("data", { ascending: false });
  if (year) q = q.gte("data", `${year}-01-01`).lte("data", `${year}-12-31`);
  if (leagueHint) {
    // tenta restringir por liga (nome match)
    const { data: ligas } = await supabase
      .from("ligas")
      .select("id, nome")
      .ilike("nome", `%${leagueHint}%`)
      .range(0, 9);
    const ligaIds = (ligas || []).map((l: any) => l.id);
    if (ligaIds.length) q = q.in("liga_id", ligaIds);
  }
  const { data: rows } = await q.range(0, 0);
  const m = (rows || [])[0];
  if (!m) return null;
  const isHome = m.time_casa_id === teamId;
  const oppId = isHome ? m.time_fora_id : m.time_casa_id;
  const [{ data: opp }, { data: liga }] = await Promise.all([
    oppId ? supabase.from("times").select("nome, slug").eq("id", oppId).maybeSingle() : Promise.resolve({ data: null }),
    m.liga_id ? supabase.from("ligas").select("nome, slug").eq("id", m.liga_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    kind: "last_match",
    source: "partidas",
    team: { id: teamId, name: teamName, slug: teamSlug },
    competition: { name: liga?.nome ?? null, slug: liga?.slug ?? null },
    match: {
      id: m.id,
      slug: m.slug ?? null,
      date: m.data,
      is_home: isHome,
      home_team: isHome ? teamName : (opp?.nome ?? "—"),
      away_team: isHome ? (opp?.nome ?? "—") : teamName,
      home_team_slug: isHome ? teamSlug : (opp?.slug ?? null),
      away_team_slug: isHome ? (opp?.slug ?? null) : teamSlug,
      gols_casa: m.gols_casa,
      gols_fora: m.gols_fora,
    },
  };
}

// ---------- World Cup match lookup resolver ----------
const NATIONAL_TEAM_ALIASES: Record<string, string[]> = {
  franca: ["franca", "france"],
  brasil: ["brasil", "brazil"],
  alemanha: ["alemanha", "germany"],
  argentina: ["argentina"],
  espanha: ["espanha", "spain"],
  inglaterra: ["inglaterra", "england"],
  portugal: ["portugal"],
  italia: ["italia", "italy"],
  noruega: ["noruega", "norway"],
  iraque: ["iraque", "iraq"],
  mexico: ["mexico"],
  uruguai: ["uruguai", "uruguay"],
  japao: ["japao", "japan"],
  marrocos: ["marrocos", "morocco"],
  senegal: ["senegal"],
  suica: ["suica", "switzerland"],
  belgica: ["belgica", "belgium"],
  croacia: ["croacia", "croatia"],
  dinamarca: ["dinamarca", "denmark"],
  polonia: ["polonia", "poland"],
  servia: ["servia", "serbia"],
  canada: ["canada"],
  estados_unidos: ["estados unidos", "eua", "usa", "united states"],
};

const WORLD_CUP_PT_NAMES: Record<string, string> = {
  france: "França",
  franca: "França",
  norway: "Noruega",
  iraq: "Iraque",
  brazil: "Brasil",
  brasil: "Brasil",
  germany: "Alemanha",
  spain: "Espanha",
  england: "Inglaterra",
  italy: "Itália",
  japan: "Japão",
  morocco: "Marrocos",
  switzerland: "Suíça",
  belgium: "Bélgica",
  croatia: "Croácia",
  denmark: "Dinamarca",
  poland: "Polônia",
  serbia: "Sérvia",
  usa: "Estados Unidos",
  "united-states": "Estados Unidos",
};

function displayWorldCupTeamName(team: any): string {
  const key = normalize(team?.slug || team?.name || "").replace(/\s+/g, "-");
  return WORLD_CUP_PT_NAMES[key] || team?.name || "—";
}

function saoPauloDateKey(date: Date): string {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function targetDateFromQuestion(normQuery: string): string | null {
  const now = new Date();
  if (/\bhoje\b|\bagora\b|\bao vivo\b/.test(normQuery)) return saoPauloDateKey(now);
  if (/\bontem\b/.test(normQuery)) return saoPauloDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  return null;
}

function isResultQuestion(normQuery: string): boolean {
  return /\b(quanto foi|qual foi o placar|placar|resultado|jogo de hoje|partida de hoje|jogo da|jogo do|partida da|partida do)\b/.test(normQuery);
}

async function fetchWorldCupTeams(supabase: any): Promise<any[]> {
  const all: any[] = [];
  const PAGE = 200;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("world_cup_2026_teams")
      .select("id, name, slug, country_code")
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("fetchWorldCupTeams", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function aliasesFromQuestion(normText: string): Set<string> {
  const aliases = new Set<string>();
  for (const group of Object.values(NATIONAL_TEAM_ALIASES)) {
    if (group.some((alias) => new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`).test(normText))) {
      group.forEach((alias) => aliases.add(normalize(alias)));
    }
  }
  for (const token of extractEntityTokens(normText)) aliases.add(token);
  return aliases;
}

async function worldCupMatchCount(supabase: any, teamId: string): Promise<number> {
  const { count } = await supabase
    .from("world_cup_2026_matches")
    .select("id", { count: "exact", head: true })
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  return Number(count || 0);
}

async function findWorldCupTeamCandidates(supabase: any, query: string, explicitTeam?: string | null): Promise<any[]> {
  const normText = normalize(`${query} ${explicitTeam || ""}`);
  const aliases = aliasesFromQuestion(normText);
  const teams = await fetchWorldCupTeams(supabase);
  const scored: any[] = [];

  for (const t of teams) {
    const nameNorm = normalize(t.name);
    const slugNorm = normalize(t.slug || "").replace(/-/g, " ");
    let score = 0;
    for (const alias of aliases) {
      if (!alias) continue;
      if (nameNorm === alias || slugNorm === alias) score += 120;
      else if (nameNorm.includes(alias) || slugNorm.includes(alias)) score += 70;
    }
    if (new RegExp(`\\b${nameNorm.replace(/\s+/g, "\\s+")}\\b`).test(normText)) score += 100;
    if (slugNorm && new RegExp(`\\b${slugNorm.replace(/\s+/g, "\\s+")}\\b`).test(normText)) score += 100;
    if (score > 0) scored.push({ ...t, _score: score });
  }

  const withCounts = await Promise.all(scored.map(async (t) => ({ ...t, _matchCount: await worldCupMatchCount(supabase, t.id) })));
  return withCounts
    .map((t) => ({ ...t, _score: t._score + Math.min(Number(t._matchCount || 0), 20) * 10 }))
    .sort((a, b) => b._score - a._score || b._matchCount - a._matchCount);
}

async function fetchWorldCupMatchesForTeam(supabase: any, teamId: string): Promise<any[]> {
  const all: any[] = [];
  const PAGE = 200;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("world_cup_2026_matches")
      .select("id, home_team_id, away_team_id, match_date, status, home_score, away_score, stage, round")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order("match_date", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("fetchWorldCupMatchesForTeam", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function resolveWorldCupMatchLookup(
  supabase: any,
  query: string,
  explicitTeam?: string | null,
): Promise<any | null> {
  const normQuery = normalize(query);
  const targetDate = targetDateFromQuestion(normQuery);
  const candidates = await findWorldCupTeamCandidates(supabase, query, explicitTeam);
  if (candidates.length === 0) return null;

  for (const team of candidates) {
    const matches = await fetchWorldCupMatchesForTeam(supabase, team.id);
    if (matches.length === 0) continue;
    const dated = targetDate
      ? matches.find((m) => m.match_date && saoPauloDateKey(new Date(m.match_date)) === targetDate)
      : null;
    const finishedOrLive = (dated ? [dated] : matches).find((m) =>
      ["finished", "live", "in_progress", "1h", "2h", "halftime", "ht"].includes(String(m.status || "").toLowerCase())
    );
    const picked = finishedOrLive || dated || matches.find((m) => String(m.status || "").toLowerCase() === "finished") || matches[0];
    if (!picked) continue;

    const ids = [...new Set([picked.home_team_id, picked.away_team_id].filter(Boolean))];
    const { data: teams } = await supabase
      .from("world_cup_2026_teams")
      .select("id, name, slug")
      .in("id", ids);
    const tmap = new Map((teams || []).map((t: any) => [t.id, t]));
    const home = tmap.get(picked.home_team_id) || null;
    const away = tmap.get(picked.away_team_id) || null;
    const isHome = picked.home_team_id === team.id;

    return {
      kind: "last_match",
      source: "world_cup_2026_matches",
      team: { id: team.id, name: displayWorldCupTeamName(team), slug: team.slug ?? null },
      competition: { name: "Copa do Mundo FIFA 2026", slug: null },
      match: {
        id: picked.id,
        slug: null,
        detail_path: `/copa-2026/jogos/${picked.id}`,
        date: picked.match_date,
        is_home: isHome,
        home_team: displayWorldCupTeamName(home),
        away_team: displayWorldCupTeamName(away),
        gols_casa: picked.home_score,
        gols_fora: picked.away_score,
        stage: picked.stage ?? picked.round ?? null,
        status: picked.status ?? null,
      },
    };
  }

  return null;
}

// Overview da Copa do Mundo 2026: últimos/próximos jogos, sem depender de time específico.
async function resolveWorldCupOverview(
  supabase: any,
  wantsLast: boolean,
): Promise<{ structured: any | null; ai: any; source: string }> {
  const { data: allMatches, error } = await supabase
    .from("world_cup_2026_matches")
    .select("id, home_team_id, away_team_id, match_date, status, home_score, away_score, stage, round")
    .order("match_date", { ascending: false });
  if (error || !allMatches || allMatches.length === 0) {
    return {
      source: "world_cup_2026_matches",
      structured: null,
      ai: notFoundAnswer("Não localizei jogos da Copa do Mundo no banco do StatBall."),
    };
  }
  const finished = allMatches.filter((m: any) =>
    ["finished", "live", "in_progress", "1h", "2h", "halftime", "ht"].includes(String(m.status || "").toLowerCase())
  );
  const list = wantsLast && finished.length > 0 ? finished : allMatches;
  const top = list.slice(0, 10);
  const ids = [...new Set(top.flatMap((m: any) => [m.home_team_id, m.away_team_id]).filter(Boolean))];
  const { data: teams } = await supabase.from("world_cup_2026_teams").select("id, name, slug").in("id", ids);
  const tmap = new Map((teams || []).map((t: any) => [t.id, t]));
  const rows = top.map((m: any) => {
    const home = tmap.get(m.home_team_id) || null;
    const away = tmap.get(m.away_team_id) || null;
    return {
      id: m.id,
      data: m.match_date,
      slug: null,
      detail_path: `/copa-2026/jogos/${m.id}`,
      is_home: true,
      home_team: displayWorldCupTeamName(home),
      away_team: displayWorldCupTeamName(away),
      home_team_slug: (home as any)?.slug ?? null,
      away_team_slug: (away as any)?.slug ?? null,
      gols_casa: m.home_score,
      gols_fora: m.away_score,
      liga_id: null,
      liga_nome: "Copa do Mundo FIFA 2026",
      liga_slug: null,
    };
  });
  const last = rows[0];
  const placar = last.gols_casa != null && last.gols_fora != null ? `${last.gols_casa} x ${last.gols_fora}` : "placar indisponível";
  const dateStr = last.data ? ` em ${String(last.data).slice(0, 10)}` : "";
  return {
    source: "world_cup_2026_matches",
    ai: {
      answer: `O jogo mais recente da **Copa do Mundo FIFA 2026** foi **${last.home_team} ${placar} ${last.away_team}**${dateStr}.`,
      explanation: "Fonte: world_cup_2026_matches.",
      has_enough_data: true,
      confidence: 94,
    },
    structured: {
      kind: "competition_matches",
      summary: `Copa do Mundo FIFA 2026: exibindo ${rows.length} jogos${wantsLast ? " (mais recentes)" : ""} do banco do StatBall.`,
      league: { id: "world-cup-2026", name: "Copa do Mundo FIFA 2026", slug: null },
      year: 2026,
      source: "world_cup_2026_matches",
      matches: rows,
      total_matches: allMatches.length,
    },
  };
}


// ---------- slug + post helpers ----------
function slugify(s: string): string {
  return normalize(s)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function buildSlug(intent: string, parts: (string | number | null | undefined)[]): string {
  const base = parts.filter(Boolean).map((p) => slugify(String(p))).filter(Boolean).join("-");
  return slugify(`${intent}-${base}`).slice(0, 90);
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  const clean = s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return clean.length <= n ? clean : clean.slice(0, n - 1).trimEnd() + "…";
}

async function persistSearchPost(supabase: any, payload: {
  slug: string;
  question: string;
  normalized: string;
  intent: string;
  summary: string;
  meta_title: string;
  meta_description: string;
  answer_payload: any;
  entities: any[];
  confidence: number;
}) {
  try {
    const { error } = await supabase.from("search_posts").upsert({
      slug: payload.slug,
      question: payload.question,
      normalized_question: payload.normalized,
      intent: payload.intent,
      answer_summary: payload.summary,
      meta_title: truncate(payload.meta_title, 60),
      meta_description: truncate(payload.meta_description, 160),
      answer_payload: payload.answer_payload,
      entities: payload.entities,
      confidence: payload.confidence,
      updated_at: new Date().toISOString(),
    }, { onConflict: "slug" });
    if (error) console.error("persistSearchPost", error);
  } catch (e) {
    console.error("persistSearchPost ex", e);
  }
}

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, user_id, liga_id: forcedLeagueId } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "query inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const normalized = normalize(query);
    const intent = detectIntent(query);
    const year = extractYear(query);
    let responseYear: number | null = year;
    const scope = extractScope(query);
    const requestedLimit = extractLimit(query);

    // entidades para a UI (lista geral)
    const { data: globResults } = await supabase.rpc("search_global", { p_query: query, p_limit: 30 });
    const results = globResults || [];
    const entities = results.slice(0, 8).map((r: any) => ({ type: r.entity_type, id: r.entity_id, name: r.name }));

    let ai_answer: any = null;
    let contextStr = "";
    let source: string = "internal";
    let top_scorers: any[] | null = null;
    let resolved_league: { id: string; name: string; slug?: string | null } | null = null;
    let resolved_team: { id: string; name: string; slug?: string | null } | null = null;
    let resolved_opponent: { id: string; name: string; slug?: string | null } | null = null;
    let league_disambiguation: { id: string; name: string }[] = [];
    let structured_answer: any = null;
    let post_slug: string | null = null;

    // ---------- TOP SCORER ----------
    if (intent === "top_scorer") {
      let league: { id: string; name: string; slug?: string | null } | null = null;
      if (forcedLeagueId) {
        const { data: l } = await supabase.from("ligas").select("id, nome, slug").eq("id", forcedLeagueId).single();
        if (l) league = { id: l.id, name: l.nome, slug: l.slug };
      } else {
        const candidates = await resolveLeagueCandidates(supabase, query, normalized);
        if (candidates.length > 0) {
          const { data: lrow } = await supabase.from("ligas").select("slug").eq("id", candidates[0].id).maybeSingle();
          league = { id: candidates[0].id, name: candidates[0].name, slug: lrow?.slug ?? null };
          league_disambiguation = candidates.slice(0, 5).map((c) => ({ id: c.id, name: c.name }));
        }
      }

      if (!league) {
        ai_answer = {
          answer: "Não consegui identificar de qual campeonato você está falando. Tente: \"artilheiro do Brasileirão 2025\".",
          explanation: "Liga não resolvida.",
          has_enough_data: false,
          confidence: 0,
        };
      } else {
        resolved_league = league;
        const scorerYear = effectiveTopScorerYear(normalized, league.name, year);
        responseYear = scorerYear;
        const { rows, source: src } = await resolveTopScorers(supabase, league.id, league.name, scorerYear, 10);
        source = src;
        top_scorers = rows;
        if (rows.length === 0) {
          ai_answer = {
            answer: `Ainda não há dados de artilharia da ${league.name}${scorerYear ? ` em ${scorerYear}` : ""} no Statball.`,
            explanation: "Sem registros internos para essa liga/ano.",
            has_enough_data: false,
            confidence: 0,
          };
        } else {
          const top = rows[0];
          const list = rows.slice(0, 5).map((r, i) => `${i + 1}. ${r.jogador}${r.time ? ` (${r.time})` : ""} — ${r.gols} gols`).join("\n");
          const sourceLabel = src === "artilharia_agregada" ? "artilharia agregada Statball" : src === "gols_partida" ? "agregação de eventos de gol" : "eventos oficiais da Copa 2026 no Statball";
          contextStr = `Liga: ${league.name}${scorerYear ? ` (${scorerYear})` : ""}\nTop 10 artilheiros (fonte: ${src}):\n${list}\n\nTotal de jogadores no ranking: ${rows.length}`;
          const summary = `${top.jogador}${top.time ? ` (${top.time})` : ""} é o maior artilheiro da ${league.name}${scorerYear ? ` em ${scorerYear}` : ""} com ${top.gols} gols.`;
          ai_answer = {
            answer: `O maior artilheiro da **${league.name}**${scorerYear ? ` em ${scorerYear}` : ""} é **${top.jogador}**${top.time ? ` (${top.time})` : ""} com **${top.gols} gols**.\n\nTop 5:\n${list}`,
            explanation: `Fonte: ${sourceLabel}.`,
            has_enough_data: true,
            confidence: src === "artilharia_agregada" ? 95 : 80,
          };
          structured_answer = {
            kind: "top_scorer",
            summary,
            league: { id: league.id, name: league.name, slug: league.slug ?? null },
            year: scorerYear,
            source: src,
            top_scorers: rows,
          };
          post_slug = buildSlug("artilheiros", [league.name, scorerYear]);
          await persistSearchPost(supabase, {
            slug: post_slug,
            question: query,
            normalized,
            intent,
            summary,
            meta_title: `Artilheiros da ${league.name}${scorerYear ? ` ${scorerYear}` : ""} — Statball`,
            meta_description: `${summary} Veja o ranking completo dos 10 maiores goleadores.`,
            answer_payload: structured_answer,
            entities,
            confidence: ai_answer.confidence,
          });
        }
      }
    }

    // ---------- STANDINGS / CLASSIFICAÇÃO ----------
    else if (intent === "standings") {
      const forcedLeague = await leagueFromId(supabase, forcedLeagueId);
      const candidates = forcedLeague ? [{ id: forcedLeague.id, name: forcedLeague.name, score: 9999 }] : await resolveLeagueCandidates(supabase, query, normalized);
      const picked = candidates[0] ?? null;
      if (!picked) {
        ai_answer = notFoundAnswer("Não consegui identificar a competição. Tente especificar o nome (ex.: 'tabela do Brasileirão 2025').");
      } else {
        const league = forcedLeague ?? { id: picked.id, name: picked.name, slug: (await supabase.from("ligas").select("slug").eq("id", picked.id).maybeSingle()).data?.slug ?? null };
        resolved_league = league;
        league_disambiguation = candidates.slice(0, 5).map((c) => ({ id: c.id, name: c.name }));
          const overview = await resolveCompetitionOverview(supabase, league, year, true, isLastMatchesQuestion(normalized));
        source = overview.source;
        ai_answer = overview.ai;
        structured_answer = overview.structured;
        if (structured_answer) {
          post_slug = buildSlug("classificacao", [league.name, year]);
          await persistSearchPost(supabase, {
            slug: post_slug,
            question: query,
            normalized,
            intent: "standings",
            summary: structured_answer.summary,
            meta_title: `Tabela da ${league.name}${year ? ` ${year}` : ""} — Statball`,
            meta_description: truncate(structured_answer.summary, 160),
            answer_payload: structured_answer,
            entities,
            confidence: ai_answer.confidence,
          });
        }
      }
    }

    // ---------- CHAMPION / WINNER ----------
    else if (intent === "champion") {
      const forcedLeague = await leagueFromId(supabase, forcedLeagueId);
      const candidates = forcedLeague ? [{ id: forcedLeague.id, name: forcedLeague.name, score: 9999 }] : await resolveLeagueCandidates(supabase, query, normalized);
      const league = candidates[0] ?? null;
      if (league) {
        resolved_league = forcedLeague ?? { id: league.id, name: league.name, slug: (await supabase.from("ligas").select("slug").eq("id", league.id).maybeSingle()).data?.slug ?? null };
        league_disambiguation = candidates.slice(0, 5).map((c) => ({ id: c.id, name: c.name }));
      }
      const compLabel = league?.name ?? (aliasGroupFor(normalized)?.[0] ?? null);
      const champ = await resolveChampionOrLeader(supabase, league ? { id: league.id, name: league.name } : null, compLabel, year);
      if (!champ) {
        ai_answer = notFoundAnswer(
          compLabel
            ? `Sem registro de campeão da ${compLabel}${year ? ` em ${year}` : ""} no banco do StatBall.`
            : "Não consegui identificar a competição. Tente especificar o nome (ex.: 'Brasileirão Série A 2022').",
        );
      } else {
        const isLeader = champ.mode === "leader";
        const summary = isLeader
          ? `Pelos jogos registrados, o líder da ${champ.competition}${champ.year ? ` em ${champ.year}` : ""} é o ${champ.time}.`
          : `O campeão da ${champ.competition}${champ.year ? ` em ${champ.year}` : ""} foi o ${champ.time}.`;
        ai_answer = {
          answer: isLeader
            ? `Ainda não há campeão oficial registrado para **${champ.competition}**${champ.year ? ` em **${champ.year}**` : ""}. Pela tabela calculada a partir dos jogos, o líder é **${champ.time}**.`
            : `O campeão da **${champ.competition}**${champ.year ? ` em **${champ.year}**` : ""} foi o **${champ.time}**.`,
          explanation: isLeader ? `Fonte: ${champ.source} — tabela calculada a partir das partidas.` : `Fonte: ${champ.source}.`,
          has_enough_data: true,
          confidence: isLeader ? 82 : 95,
        };
        structured_answer = {
          kind: "external", // reaproveita o card de texto simples
          summary,
          note: isLeader ? `Dado calculado — ${champ.source}.` : `Dado oficial — ${champ.source}.`,
        };
        post_slug = buildSlug("campeao", [champ.competition, champ.year]);
        await persistSearchPost(supabase, {
          slug: post_slug,
          question: query,
          normalized,
          intent: "champion",
          summary,
          meta_title: `Campeão da ${champ.competition}${champ.year ? ` ${champ.year}` : ""} — Statball`,
          meta_description: truncate(summary, 160),
          answer_payload: structured_answer,
          entities,
          confidence: ai_answer.confidence,
        });
      }
    }


    // ---------- MATCH LOOKUP / RESULTADO DE JOGO ----------
    else if (intent === "match_lookup") {
      const wcMatch = extractHeadToHeadPhrases(query) ? null : await resolveWorldCupMatchLookup(supabase, query);
      if (wcMatch) {
        structured_answer = wcMatch;
        const m = wcMatch.match;
        const placar = `${m.gols_casa ?? "?"} x ${m.gols_fora ?? "?"}`;
        const statusNorm = String(m.status || "").toLowerCase();
        const isLive = ["live", "in_progress", "1h", "2h", "halftime", "ht"].includes(statusNorm);
        const dateStr = m.date ? ` em ${String(m.date).slice(0, 10)}` : "";
        const statusText = isLive ? "está" : "foi";
        const summary = `${m.home_team} ${placar} ${m.away_team}${dateStr}, pela ${wcMatch.competition.name}.`;
        ai_answer = {
          answer: `O jogo **${m.home_team} x ${m.away_team}** ${statusText} **${placar}**${dateStr}.`,
          explanation: `Fonte: ${wcMatch.source}.`,
          has_enough_data: true,
          confidence: 92,
        };
        post_slug = buildSlug("resultado-jogo", [m.home_team, m.away_team, String(m.date || "").slice(0, 10)]);
        await persistSearchPost(supabase, {
          slug: post_slug,
          question: query,
          normalized,
          intent: "match_lookup",
          summary,
          meta_title: `${m.home_team} ${placar} ${m.away_team} — resultado`,
          meta_description: summary,
          answer_payload: structured_answer,
          entities,
          confidence: ai_answer.confidence,
        });
      }

      if (!structured_answer) {
        const h2h = extractHeadToHeadPhrases(query);
        if (h2h) {
          const [left, right] = await Promise.all([
            resolveTeamByPhrase(supabase, h2h.left),
            resolveTeamByPhrase(supabase, h2h.right),
          ]);
          if (left && right && left.entity_id !== right.entity_id) {
            resolved_team = { id: left.entity_id, name: left.name, slug: left.extra?.slug ?? null };
            resolved_opponent = { id: right.entity_id, name: right.name, slug: right.extra?.slug ?? null };
            const { rows, total, source: src } = await resolveHeadToHead(supabase, left, right, year);
            source = src;
            if (rows.length > 0) {
              const last = rows[0];
              const placar = `${last.gols_casa ?? "?"} x ${last.gols_fora ?? "?"}`;
              const summary = `${last.home_team} ${placar} ${last.away_team}${last.data ? ` em ${String(last.data).slice(0, 10)}` : ""}. Foram encontrados ${total} confrontos no banco do StatBall.`;
              ai_answer = {
                answer: `O confronto mais recente foi **${last.home_team} ${placar} ${last.away_team}**${last.data ? ` em **${String(last.data).slice(0, 10)}**` : ""}.`,
                explanation: `Fonte: ${src}.`,
                has_enough_data: true,
                confidence: 94,
              };
              structured_answer = {
                kind: "competition_matches",
                summary,
                league: { id: `${left.entity_id}-${right.entity_id}`, name: `${left.name} x ${right.name}`, slug: null },
                year,
                source: src,
                matches: rows,
                total_matches: total,
              };
              post_slug = buildSlug("confronto", [left.name, right.name, year]);
              await persistSearchPost(supabase, {
                slug: post_slug,
                question: query,
                normalized,
                intent: "match_lookup",
                summary,
                meta_title: `${left.name} x ${right.name} — resultados`,
                meta_description: truncate(summary, 160),
                answer_payload: structured_answer,
                entities,
                confidence: 94,
              });
            } else {
              ai_answer = notFoundAnswer(`Não localizei confrontos entre ${left.name} e ${right.name}${year ? ` em ${year}` : ""} no banco do StatBall.`);
            }
          }
        }
      }
    }

    // ---------- TEAM STATS / OPEN QUESTION (com time identificado) ----------
    else if (intent === "team_stats" || intent === "open_question") {
      // Preflight: se a pergunta é sobre uma COMPETIÇÃO (alias como "copa", "libertadores",
      // "brasileirão") e não sobre um time específico, resolve como competição — evita
      // interpretações erradas como "copa" -> "New Jersey Copa".
      const aliasHit = aliasGroupFor(normalized);
      const teamPhrase = extractTeamPhraseFromStatsQuery(query);
      const phraseNorm = teamPhrase ? normalize(teamPhrase) : "";
      const phraseIsAlias = !!aliasHit && (
        !phraseNorm ||
        !!aliasGroupFor(phraseNorm) ||
        aliasHit.some((n) => normalize(n) === phraseNorm)
      );
      if (aliasHit && phraseIsAlias) {
        const forcedLeague = await leagueFromId(supabase, forcedLeagueId);
        const candidates = forcedLeague ? [{ id: forcedLeague.id, name: forcedLeague.name, score: 9999 }] : await resolveLeagueCandidates(supabase, query, normalized);
        const picked = candidates[0] ?? null;
        if (picked) {
          const league = forcedLeague ?? { id: picked.id, name: picked.name, slug: (await supabase.from("ligas").select("slug").eq("id", picked.id).maybeSingle()).data?.slug ?? null };
          resolved_league = league;
          league_disambiguation = forcedLeague ? await resolveLeagueCandidates(supabase, query, normalized).then((rows) => rows.slice(0, 5).map((c) => ({ id: c.id, name: c.name }))) : candidates.slice(0, 5).map((c) => ({ id: c.id, name: c.name }));
          const isWC = /fifa world cup|copa do mundo/.test(normalize(league.name));
          const wantsLast = isLastMatchesQuestion(normalized);
          const overview = isWC
            ? await resolveWorldCupOverview(supabase, wantsLast)
            : await resolveCompetitionOverview(supabase, league, year, false, wantsLast);
          source = overview.source;
          ai_answer = overview.ai;
          structured_answer = overview.structured;
          if (structured_answer) {
            post_slug = buildSlug("competicao", [league.name, year]);
            await persistSearchPost(supabase, {
              slug: post_slug,
              question: query,
              normalized,
              intent: "entity_lookup",
              summary: structured_answer.summary,
              meta_title: `${league.name}${year ? ` ${year}` : ""} — jogos e dados`,
              meta_description: truncate(structured_answer.summary, 160),
              answer_payload: structured_answer,
              entities,
              confidence: ai_answer.confidence,
            });
          }
        }
      }
      const topTeam = structured_answer ? null : await resolveTeamCandidate(supabase, query, normalized, results);
      if (topTeam) {
        // enrich team with slug
        let teamSlug: string | null = topTeam.extra?.slug ?? null;
        if (!teamSlug) {
          const { data: trow } = await supabase.from("times").select("slug").eq("id", topTeam.entity_id).maybeSingle();
          teamSlug = trow?.slug ?? null;
        }
        resolved_team = { id: topTeam.entity_id, name: topTeam.name, slug: teamSlug };

        const matches = await fetchAllPartidas(supabase, topTeam.entity_id, year, scope);
        const agg = aggregate(matches, topTeam.entity_id);

        // build competitions + opponents maps
        const ligaIds = [...new Set(matches.map((m: any) => m.liga_id).filter(Boolean))];
        const oppIds = [...new Set(matches.map((m: any) =>
          m.time_casa_id === topTeam.entity_id ? m.time_fora_id : m.time_casa_id
        ).filter(Boolean))];

        const [{ data: ligas }, { data: oppTeams }] = await Promise.all([
          ligaIds.length ? supabase.from("ligas").select("id, nome, slug").in("id", ligaIds) : Promise.resolve({ data: [] }),
          oppIds.length ? supabase.from("times").select("id, nome, slug").in("id", oppIds) : Promise.resolve({ data: [] }),
        ]);
        const ligaMap = new Map((ligas || []).map((l: any) => [l.id, l]));
        const oppMap = new Map((oppTeams || []).map((t: any) => [t.id, t]));

        const compCounts = new Map<string, { id: string; name: string; slug: string | null; total: number; w: number; d: number; l: number }>();
        for (const m of matches) {
          if (!m.liga_id) continue;
          const li: any = ligaMap.get(m.liga_id);
          if (!li) continue;
          const cur = compCounts.get(m.liga_id) || { id: li.id, name: li.nome, slug: li.slug ?? null, total: 0, w: 0, d: 0, l: 0 };
          cur.total += 1;
          const isHome = m.time_casa_id === topTeam.entity_id;
          const my = isHome ? (m.gols_casa ?? 0) : (m.gols_fora ?? 0);
          const op = isHome ? (m.gols_fora ?? 0) : (m.gols_casa ?? 0);
          if (my > op) cur.w += 1; else if (my === op) cur.d += 1; else cur.l += 1;
          compCounts.set(m.liga_id, cur);
        }
        const competitions = [...compCounts.values()].sort((a, b) => b.total - a.total);

        const displayLimit = requestedLimit ?? (isLastMatchesQuestion(normalized) ? 5 : 80);
        const matchList = matches.slice(0, displayLimit).map((m: any) => {
          const isHome = m.time_casa_id === topTeam.entity_id;
          const oppId = isHome ? m.time_fora_id : m.time_casa_id;
          const opp: any = oppId ? oppMap.get(oppId) : null;
          const li: any = m.liga_id ? ligaMap.get(m.liga_id) : null;
          return {
            id: m.id,
            data: m.data,
            slug: m.slug ?? null,
            is_home: isHome,
            home_team: isHome ? topTeam.name : (opp?.nome ?? "—"),
            away_team: isHome ? (opp?.nome ?? "—") : topTeam.name,
            home_team_slug: isHome ? teamSlug : (opp?.slug ?? null),
            away_team_slug: isHome ? (opp?.slug ?? null) : teamSlug,
            gols_casa: m.gols_casa,
            gols_fora: m.gols_fora,
            liga_id: m.liga_id ?? null,
            liga_nome: li?.nome ?? null,
            liga_slug: li?.slug ?? null,
          };
        });

        const scopeStr = scope === "home" ? " (mandante)" : scope === "away" ? " (visitante)" : "";
        const yearStr = year ? `Ano: ${year}\n` : "Período: todos os dados\n";
        contextStr += `Time: ${topTeam.name}\n${yearStr}Jogos${scopeStr}: ${agg.total}\nV:${agg.w} E:${agg.d} D:${agg.l}\nGols pró:${agg.gf} contra:${agg.ga}\n`;
        if (matches.length > 0) {
          const last = matches.slice(0, 5).map((m: any) => {
            const isHome = m.time_casa_id === topTeam.entity_id;
            return `${m.data?.slice(0, 10)} ${isHome ? "(casa)" : "(fora)"} ${m.gols_casa}x${m.gols_fora}`;
          }).join("; ");
          contextStr += `Últimas: ${last}\n`;
        }

        const isCountQuestion = /quantos jogos|quantas partidas|jogou|disputou/.test(normalized);
        const wantsMatchList = /\b(jogos|partidas|ultimos|ultimas|recentes|mais recentes)\b/.test(normalized);
        const listPrefix = isLastMatchesQuestion(normalized) || requestedLimit ? `Últimos ${matchList.length} jogos` : "Jogos";
        const summary = `${listPrefix} do ${topTeam.name}${year ? ` em ${year}` : ""}${scopeStr}: ${agg.total} partidas encontradas — ${agg.w} vitórias, ${agg.d} empates e ${agg.l} derrotas (${agg.gf} gols pró × ${agg.ga} contra).`;

        if (isCountQuestion || wantsMatchList || agg.total > 0) {
          ai_answer = {
            answer: wantsMatchList && matchList.length > 0
              ? `${listPrefix} do **${topTeam.name}**${year ? ` em **${year}**` : ""}${scopeStr}: encontrei **${agg.total} partidas** no banco.`
              : `O ${topTeam.name} jogou **${agg.total} partidas**${year ? ` em ${year}` : ""}${scopeStr}.`,
            explanation: `Campanha no filtro: ${agg.w}V, ${agg.d}E, ${agg.l}D; gols ${agg.gf}-${agg.ga}.`,
            has_enough_data: agg.total > 0,
            confidence: agg.total > 0 ? 95 : 0,
          };
        } else {
          ai_answer = await callAI(contextStr, query);
        }

        if (agg.total > 0) {
          structured_answer = {
            kind: "team_stats",
            summary,
            team: { id: topTeam.entity_id, name: topTeam.name, slug: teamSlug },
            year,
            scope,
            breakdown: { total: agg.total, vitorias: agg.w, empates: agg.d, derrotas: agg.l, gols_pro: agg.gf, gols_contra: agg.ga },
            competitions,
            matches: matchList,
            total_matches: matches.length,
          };
          post_slug = buildSlug("time", [topTeam.name, year, scope]);
          await persistSearchPost(supabase, {
            slug: post_slug,
            question: query,
            normalized,
            intent,
            summary,
            meta_title: `${topTeam.name}${year ? ` em ${year}` : ""}: ${agg.total} jogos — Statball`,
            meta_description: summary,
            answer_payload: structured_answer,
            entities,
            confidence: ai_answer.confidence,
          });
        }
      } else if (intent === "open_question" && !structured_answer) {
        ai_answer = await callAI(contextStr || "Sem dados internos relacionados.", query);
      }
    }

    // ---------- ENTITY LOOKUP: competição pura vira visão geral, não "não encontrado" ----------
    else if (intent === "entity_lookup") {
      const forcedLeague = await leagueFromId(supabase, forcedLeagueId);
      const candidates = forcedLeague ? [{ id: forcedLeague.id, name: forcedLeague.name, score: 9999 }] : await resolveLeagueCandidates(supabase, query, normalized);
      const picked = candidates[0] ?? null;
      if (picked) {
        const league = forcedLeague ?? { id: picked.id, name: picked.name, slug: (await supabase.from("ligas").select("slug").eq("id", picked.id).maybeSingle()).data?.slug ?? null };
        resolved_league = league;
        league_disambiguation = forcedLeague ? await resolveLeagueCandidates(supabase, query, normalized).then((rows) => rows.slice(0, 5).map((c) => ({ id: c.id, name: c.name }))) : candidates.slice(0, 5).map((c) => ({ id: c.id, name: c.name }));
        const overview = await resolveCompetitionOverview(supabase, league, year, false, isLastMatchesQuestion(normalized));
        source = overview.source;
        ai_answer = overview.ai;
        structured_answer = overview.structured;
        if (structured_answer) {
          post_slug = buildSlug("competicao", [league.name, year]);
          await persistSearchPost(supabase, {
            slug: post_slug,
            question: query,
            normalized,
            intent: "entity_lookup",
            summary: structured_answer.summary,
            meta_title: `${league.name}${year ? ` ${year}` : ""} — jogos e dados`,
            meta_description: truncate(structured_answer.summary, 160),
            answer_payload: structured_answer,
            entities,
            confidence: ai_answer.confidence,
          });
        }
      }
    }

    // ---------- FALLBACK: tenta resolver "último jogo" do time quando o resto falhou ----------
    const noStructured = !structured_answer;
    const aiInsufficient = !ai_answer || !ai_answer.has_enough_data;
    // Só entra no fallback se nenhuma intent específica já produziu resposta (estruturada OU not-found).
    const intentAlreadyHandled = ["top_scorer", "champion", "match_lookup"].includes(intent) && ai_answer != null;

    if (noStructured && aiInsufficient && !intentAlreadyHandled) {
      const refined = await classifyWithAI(query);
      const refinedIntent = refined?.intent ?? "open_question";
      const refinedTeam = refined?.team ?? null;
      const refinedLeague = refined?.league ?? null;
      const refinedYear = refined?.year ?? year ?? null;
      const wantsLast = refined?.time_modifier === "last" || /ultimo|último|recent|mais recente/.test(normalized);

      // Se a IA identificou uma competição, usa o mesmo resolvedor universal.
      if (!structured_answer && refinedLeague) {
        const candidates = await resolveLeagueCandidates(supabase, refinedLeague, normalize(refinedLeague));
        const picked = candidates[0] ?? null;
        if (picked) {
          const { data: lrow } = await supabase.from("ligas").select("slug").eq("id", picked.id).maybeSingle();
          const league = { id: picked.id, name: picked.name, slug: lrow?.slug ?? null };
          resolved_league = league;
          league_disambiguation = candidates.slice(0, 5).map((c) => ({ id: c.id, name: c.name }));
          const wantsTable = refinedIntent === "standings" || /\b(tabela|classificacao|classificacao da|classificacao do|classifica[cç][aã]o)\b/.test(normalized);
          const overview = await resolveCompetitionOverview(supabase, league, refinedYear, wantsTable);
          source = overview.source;
          ai_answer = overview.ai;
          structured_answer = overview.structured;
        }
      }

      // Tenta resolver "último jogo" do time mencionado
      if ((refinedIntent === "last_match" || refinedIntent === "match_lookup" || wantsLast) && refinedTeam) {
        const team = await findTeamByName(supabase, refinedTeam);
        if (team) {
          const lm = await resolveLastMatch(supabase, team.id, team.name, team.slug, refinedLeague, refinedYear);
          if (lm) {
            structured_answer = lm;
            const m = lm.match;
            const placar = `${m.gols_casa ?? "?"} x ${m.gols_fora ?? "?"}`;
            const opp = m.is_home ? m.away_team : m.home_team;
            const compStr = lm.competition?.name ? ` pela ${lm.competition.name}` : "";
            const dateStr = m.date ? ` em ${String(m.date).slice(0, 10)}` : "";
            const summary = `${team.name} ${m.is_home ? "recebeu" : "visitou"} o ${opp}${compStr}${dateStr} e o placar foi ${placar}.`;
            ai_answer = {
              answer: `**${team.name}** ${m.is_home ? "recebeu" : "visitou"} o **${opp}**${compStr}${dateStr}. Placar: **${placar}**.`,
              explanation: `Fonte: ${lm.source}.`,
              has_enough_data: true,
              confidence: 90,
            };
            post_slug = buildSlug("ultimo-jogo", [team.name, lm.competition?.name, refinedYear]);
            await persistSearchPost(supabase, {
              slug: post_slug,
              question: query,
              normalized,
              intent: "last_match",
              summary,
              meta_title: `Último jogo do ${team.name}${lm.competition?.name ? ` na ${lm.competition.name}` : ""} — Statball`,
              meta_description: summary,
              answer_payload: structured_answer,
              entities,
              confidence: 90,
            });
          }
        }
      }

      // Sem dados internos → resposta padrão "não encontrado". Não invocamos IA externa.
      if (!structured_answer && (!ai_answer || !ai_answer.has_enough_data)) {
        ai_answer = notFoundAnswer(
          refinedTeam
            ? `Não localizei dados de "${refinedTeam}"${refinedLeague ? ` na ${refinedLeague}` : ""}${refinedYear ? ` em ${refinedYear}` : ""} no banco do StatBall.`
            : "Tente reformular incluindo nome do time, jogador ou competição.",
        );
      }
    }

    // Construir filtros utilizados (transparência para o usuário)
    const filters_used: { label: string; value: string }[] = [];
    if (resolved_league?.name) filters_used.push({ label: "Competição", value: resolved_league.name });
    if (resolved_team?.name) filters_used.push({ label: "Time", value: resolved_team.name });
    if (resolved_opponent?.name) filters_used.push({ label: "Adversário", value: resolved_opponent.name });
    if (responseYear) filters_used.push({ label: "Temporada", value: String(responseYear) });
    if (scope) filters_used.push({ label: "Mando", value: scope === "home" ? "Mandante" : "Visitante" });
    if (requestedLimit) filters_used.push({ label: "Quantidade", value: String(requestedLimit) });
    if (source && source !== "internal") filters_used.push({ label: "Fonte", value: source });
    filters_used.push({ label: "Tipo de consulta", value: intent });





    // log da resposta
    if (ai_answer) {
      await supabase.rpc("record_ai_answer", {
        p_question: query,
        p_normalized: normalized,
        p_answer: ai_answer.answer,
        p_sources: entities,
        p_confidence: ai_answer.confidence,
        p_has_enough: ai_answer.has_enough_data,
        p_user_id: user_id ?? null,
      }).then(() => {}, (e: any) => console.error("record_ai_answer", e));
    }

    await supabase.rpc("register_search", {
      p_query: query,
      p_normalized: normalized,
      p_type: intent === "top_scorer" || intent === "player_stats" || intent === "team_stats" || intent === "open_question" || intent === "champion" ? "question" : "entity",
      p_entities: entities,
      p_user_id: user_id ?? null,
      p_result_count: results.length,
      p_status: "ok",
    }).then(() => {}, (e: any) => console.error("register_search", e));

    if (user_id) {
      await supabase.from("user_search_history").insert({
        user_id, query_text: query, query_type: intent,
      }).then(() => {}, (e: any) => console.error("history", e));
    }

    return new Response(JSON.stringify({
      type: intent,
      intent,
      query,
      normalized,
      year: responseYear,
      scope,
      entities,
      results,
      ai_answer,
      top_scorers,
      source,
      resolved_league,
      league_disambiguation,
      structured_answer,
      post_slug,
      filters_used,
      not_found: !ai_answer?.has_enough_data && !structured_answer,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("intelligent-search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

