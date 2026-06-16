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

// Resposta de conhecimento geral (fallback). Marca explicitamente como fonte externa.
async function externalAnswer(question: string, contextHint: string): Promise<{ answer: string; explanation: string; confidence: number } | null> {
  const system = `Você é especialista em futebol. Responda a pergunta do usuário em PT-BR de forma factual e concisa (até 4 frases).
Se houver "CONTEXTO STATBALL" abaixo, priorize esses dados.
Caso contrário, responda com seu conhecimento geral de futebol — mas seja honesto: se não tiver certeza, diga "não tenho confirmação".
Devolva JSON: { answer: string, explanation: string (curta), confidence: 0-100 }.`;
  const data = await lovableAiChat({
    model: AI_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `CONTEXTO STATBALL:\n${contextHint || "(sem dados internos)"}\n\nPERGUNTA: ${question}\n\nResponda em JSON.` },
    ],
    response_format: { type: "json_object" },
  });
  if (!data) return null;
  try {
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      answer: parsed.answer ?? "Não foi possível responder agora.",
      explanation: parsed.explanation ?? "Resposta gerada com conhecimento externo da IA.",
      confidence: Number(parsed.confidence ?? 40),
    };
  } catch {
    return null;
  }
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

    // entidades para a UI (lista geral)
    const { data: globResults } = await supabase.rpc("search_global", { p_query: query, p_limit: 30 });
    const results = globResults || [];
    const entities = results.slice(0, 8).map((r: any) => ({ type: r.entity_type, id: r.entity_id, name: r.name }));

    let ai_answer: any = null;
    let contextStr = "";
    let source: string = "internal";
    let top_scorers: any[] | null = null;
    let resolved_league: { id: string; name: string; slug?: string | null } | null = null;
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

    // ---------- TEAM STATS / OPEN QUESTION (com time identificado) ----------
    else if (intent === "team_stats" || intent === "open_question") {
      const topTeam = await resolveTeamCandidate(supabase, query, normalized, results);
      if (topTeam) {
        // enrich team with slug
        let teamSlug: string | null = topTeam.extra?.slug ?? null;
        if (!teamSlug) {
          const { data: trow } = await supabase.from("times").select("slug").eq("id", topTeam.entity_id).maybeSingle();
          teamSlug = trow?.slug ?? null;
        }

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

        const matchList = matches.slice(0, 80).map((m: any) => {
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
        const summary = `O ${topTeam.name} disputou ${agg.total} partidas${year ? ` em ${year}` : ""}${scopeStr} — ${agg.w} vitórias, ${agg.d} empates e ${agg.l} derrotas (${agg.gf} gols pró × ${agg.ga} contra).`;

        if (isCountQuestion || agg.total > 0) {
          ai_answer = {
            answer: `O ${topTeam.name} jogou **${agg.total} partidas**${year ? ` em ${year}` : ""}${scopeStr}.`,
            explanation: `Campanha: ${agg.w}V, ${agg.d}E, ${agg.l}D; gols ${agg.gf}-${agg.ga}.`,
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
      } else if (intent === "open_question") {
        ai_answer = await callAI(contextStr || "Sem dados internos relacionados.", query);
      }
    }

    // ---------- FALLBACK GARANTIDO ----------
    // Se ainda não temos resposta estruturada, usa o classificador LLM para refinar
    // intenção e entidades, tenta resolver "último jogo" no banco e, em último caso,
    // devolve uma resposta de conhecimento externo (marcada como tal).
    const noStructured = !structured_answer;
    const aiInsufficient = !ai_answer || !ai_answer.has_enough_data;

    if (noStructured && aiInsufficient) {
      const refined = await classifyWithAI(query);
      const refinedIntent = refined?.intent ?? "open_question";
      const refinedTeam = refined?.team ?? null;
      const refinedLeague = refined?.league ?? null;
      const refinedYear = refined?.year ?? year ?? null;
      const wantsLast = refined?.time_modifier === "last" || /ultimo|último|recent|mais recente/.test(normalized);

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

      // Se mesmo assim continua sem resposta, dispara a resposta externa
      if (!structured_answer && (!ai_answer || !ai_answer.has_enough_data)) {
        const ext = await externalAnswer(query, contextStr);
        if (ext) {
          ai_answer = {
            answer: ext.answer,
            explanation: ext.explanation,
            has_enough_data: true,
            confidence: ext.confidence,
          };
          structured_answer = {
            kind: "external",
            summary: ext.answer,
            note: "Resposta gerada com conhecimento externo da IA — não confirmada pelos dados internos do Statball.",
          };
          post_slug = buildSlug("pergunta", [query.slice(0, 60)]);
          await persistSearchPost(supabase, {
            slug: post_slug,
            question: query,
            normalized,
            intent: refinedIntent,
            summary: ext.answer,
            meta_title: truncate(query, 60),
            meta_description: ext.answer,
            answer_payload: structured_answer,
            entities,
            confidence: ext.confidence,
          });
        } else if (!ai_answer) {
          ai_answer = {
            answer: "Não consegui responder agora. Tente reformular a pergunta com nome do time, jogador ou competição.",
            explanation: "IA indisponível no momento.",
            has_enough_data: false,
            confidence: 0,
          };
        }
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
      structured_answer,
      post_slug,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("intelligent-search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

