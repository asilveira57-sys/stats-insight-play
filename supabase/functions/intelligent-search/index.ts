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
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

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
  | "open_question";

function detectIntent(q: string): Intent {
  const n = normalize(q);
  if (/artilheir|maior goleador|mais gols na|mais gols no|mais gols da|mais gols do|quem fez mais gols|top.?scorer|chuteira de ouro/.test(n))
    return "top_scorer";
  if (/quantos gols .* (fez|marcou)|estatistica do |estatisticas do |numeros do /.test(n))
    return "player_stats";
  if (/^(quem|qual|quais|quanto|quantos|quantas|como|quando|onde|por que|porque)\b|\?/.test(n)) {
    // pergunta sobre time específico
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

  if (aliases) {
    const { data } = await supabase
      .from("ligas")
      .select("id, nome, ativa, tipo_principal, priority_score")
      .in("nome", aliases);
    for (const l of data || []) {
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
      .select("data, gols_casa, gols_fora, time_casa_id, time_fora_id, status, liga_id")
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

async function resolveTeamCandidate(supabase: any, query: string, normQuery: string, results: any[]) {
  const teamCandidates = (results || []).filter((r: any) => r.entity_type === "team");
  const fromResults = teamCandidates.find((r: any) => !SUBTEAM_RE.test(r.name)) || teamCandidates[0];
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
      const score = (exact ? 1000 : 0) + Number(t.total_matches || 0) - subPenalty - suffixPenalty;
      candidates.push({ entity_type: "team", entity_id: t.id, name: t.nome, score, extra: t });
    }
  }
  candidates.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  return candidates[0] || null;
}

// ---------- IA ----------
async function callAI(context: string, question: string) {
  if (!OPENAI_API_KEY) {
    return { answer: "Ainda não há dados suficientes no Statball para responder com precisão.", explanation: "IA indisponível.", has_enough_data: false, confidence: 0 };
  }
  const system = `Você é o assistente do Statball, uma plataforma de estatísticas de futebol.
Regras INVIOLÁVEIS:
1. Responda APENAS com base nos dados do CONTEXTO. Não invente nomes, números ou datas.
2. Os números do CONTEXTO já vêm filtrados pela pergunta — use-os exatamente.
3. Se o contexto não tiver dados suficientes, retorne EXATAMENTE: "Ainda não há dados suficientes no Statball para responder com precisão."
4. Seja conciso, em português do Brasil.
5. Responda em JSON com: answer (string), explanation (string curta), has_enough_data (boolean), confidence (0-100).`;
  const user = `CONTEXTO:\n${context}\n\nPERGUNTA: ${question}\n\nResponda em JSON.`;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429 || r.status === 402) {
      return { answer: "Limite de uso da IA atingido. Tente novamente em instantes.", explanation: "Rate limit.", has_enough_data: false, confidence: 0 };
    }
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      answer: parsed.answer ?? "Ainda não há dados suficientes no Statball para responder com precisão.",
      explanation: parsed.explanation ?? "",
      has_enough_data: !!parsed.has_enough_data,
      confidence: Number(parsed.confidence ?? 0),
    };
  } catch (e) {
    console.error("AI error", e);
    return { answer: "Ainda não há dados suficientes no Statball para responder com precisão.", explanation: "Falha ao consultar IA.", has_enough_data: false, confidence: 0 };
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

    // entidades para a UI (lista geral)
    const { data: globResults } = await supabase.rpc("search_global", { p_query: query, p_limit: 30 });
    const results = globResults || [];
    const entities = results.slice(0, 8).map((r: any) => ({ type: r.entity_type, id: r.entity_id, name: r.name }));

    let ai_answer: any = null;
    let contextStr = "";
    let source: string = "internal";
    let top_scorers: any[] | null = null;
    let resolved_league: { id: string; name: string } | null = null;
    let league_disambiguation: { id: string; name: string }[] = [];

    // ---------- TOP SCORER ----------
    if (intent === "top_scorer") {
      let league: { id: string; name: string } | null = null;
      if (forcedLeagueId) {
        const { data: l } = await supabase.from("ligas").select("id, nome").eq("id", forcedLeagueId).single();
        if (l) league = { id: l.id, name: l.nome };
      } else {
        const candidates = await resolveLeagueCandidates(supabase, query, normalized);
        if (candidates.length > 0) {
          league = { id: candidates[0].id, name: candidates[0].name };
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
          ai_answer = {
            answer: `O maior artilheiro da **${league.name}**${scorerYear ? ` em ${scorerYear}` : ""} é **${top.jogador}**${top.time ? ` (${top.time})` : ""} com **${top.gols} gols**.\n\nTop 5:\n${list}`,
            explanation: `Fonte: ${sourceLabel}.`,
            has_enough_data: true,
            confidence: src === "artilharia_agregada" ? 95 : 80,
          };
        }
      }
    }

    // ---------- TEAM STATS / OPEN QUESTION (com time identificado) ----------
    else if (intent === "team_stats" || intent === "open_question") {
      const topTeam = await resolveTeamCandidate(supabase, query, normalized, results);
      if (topTeam) {
        const matches = await fetchAllPartidas(supabase, topTeam.entity_id, year, scope);
        const agg = aggregate(matches, topTeam.entity_id);
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
        if (/quantos jogos|quantas partidas|jogou|disputou/.test(normalized)) {
          ai_answer = {
            answer: `O ${topTeam.name} jogou **${agg.total} partidas**${year ? ` em ${year}` : ""}${scopeStr}.`,
            explanation: `Contagem feita nas partidas finalizadas do banco interno. Campanha: ${agg.w}V, ${agg.d}E, ${agg.l}D; gols ${agg.gf}-${agg.ga}.`,
            has_enough_data: true,
            confidence: 95,
          };
        } else {
          ai_answer = await callAI(contextStr, query);
        }
      } else if (intent === "open_question") {
        ai_answer = await callAI(contextStr || "Sem dados internos relacionados.", query);
      }
    }

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
      p_type: intent === "top_scorer" || intent === "player_stats" || intent === "team_stats" || intent === "open_question" ? "question" : "entity",
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
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("intelligent-search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
