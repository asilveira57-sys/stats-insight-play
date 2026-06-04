// Pesquisa Inteligente Statball — edge function
// Recebe query, classifica, busca dados internos, opcionalmente chama Lovable AI Gateway.
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

function normalize(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const STAT_KEYWORDS = [
  "artilheir", "ranking", "média", "media", "total", "comparar",
  "comparação", "comparacao", "tendência", "tendencia", "mais gols",
  "mais vitórias", "mais vitorias", "estatística", "estatistica",
  "aproveitamento", "saldo",
];
const QUESTION_MARKERS = [
  "?", "quem ", "qual ", "quais ", "quanto", "quantos ", "quantas ",
  "como ", "por que", "porque ", "quando ", "onde ",
];

function classify(q: string): "entity" | "stat" | "question" {
  const n = normalize(q);
  if (QUESTION_MARKERS.some((m) => n.includes(m))) return "question";
  if (STAT_KEYWORDS.some((m) => n.includes(m))) return "stat";
  return "entity";
}

function extractYear(q: string): number | null {
  const n = normalize(q);
  const m = q.match(/\b(19|20)\d{2}\b/);
  if (m) return parseInt(m[0], 10);
  const now = new Date();
  if (/\bano passado\b|\btemporada passada\b/.test(n)) return now.getUTCFullYear() - 1;
  if (/\beste ano\b|\bano atual\b|\btemporada atual\b/.test(n)) return now.getUTCFullYear();
  return null;
}

function extractScope(q: string): "home" | "away" | null {
  const n = normalize(q);
  if (/\bem casa\b|\bcomo mandante\b|\bmandante\b/.test(n)) return "home";
  if (/\bfora de casa\b|\bcomo visitante\b|\bvisitante\b/.test(n)) return "away";
  return null;
}

const SUBTEAM_RE = /(\s|^)(U-?17|U-?20|U-?23|Sub-?\d+|Women|Feminin|W)(\s|$|-)/i;

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

async function callAI(context: string, question: string): Promise<{
  answer: string;
  explanation: string;
  has_enough_data: boolean;
  confidence: number;
}> {
  if (!LOVABLE_API_KEY) {
    return {
      answer: "Ainda não há dados suficientes no Statball para responder com precisão.",
      explanation: "Configuração de IA indisponível.",
      has_enough_data: false,
      confidence: 0,
    };
  }
  const system = `Você é o assistente do Statball, uma plataforma de estatísticas de futebol.
Regras INVIOLÁVEIS:
1. Responda APENAS com base nos dados fornecidos no CONTEXTO abaixo. Os números do CONTEXTO já vêm filtrados pelo ano/escopo da pergunta — use-os exatamente como estão.
2. NUNCA invente nomes, números, datas ou fatos que não estejam no contexto.
3. Sempre confirme qual entidade foi consultada na resposta (ex.: "O Fluminense-RJ teve...").
4. Se o CONTEXTO trouxer "Ano consultado:", a resposta DEVE usar os números daquele ano.
5. Se o contexto não tiver dados suficientes para responder, retorne EXATAMENTE: "Ainda não há dados suficientes no Statball para responder com precisão."
6. Seja conciso, em português do Brasil.
7. Responda em JSON puro com as chaves: answer (string), explanation (string curta), has_enough_data (boolean), confidence (0-100).`;

  const user = `CONTEXTO (dados do banco Statball):\n${context}\n\nPERGUNTA: ${question}\n\nResponda em JSON.`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429 || r.status === 402) {
      return {
        answer: "Limite de uso da IA atingido. Tente novamente em instantes.",
        explanation: "Rate limit / créditos.",
        has_enough_data: false,
        confidence: 0,
      };
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
    return {
      answer: "Ainda não há dados suficientes no Statball para responder com precisão.",
      explanation: "Falha ao consultar IA.",
      has_enough_data: false,
      confidence: 0,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, user_id } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "query inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const normalized = normalize(query);
    const type = classify(query);
    const year = extractYear(query);
    const scope = extractScope(query);

    // 1. Resolve entidades — extrai tokens significativos
    const STOPWORDS = new Set([
      "quantos","quantas","quanto","qual","quais","quem","como","quando","onde",
      "por","porque","que","de","do","da","dos","das","o","a","os","as","um","uma",
      "no","na","nos","nas","em","e","ou","com","sem","para","pra","pelo","pela",
      "jogo","jogos","jogou","jogar","partida","partidas","fez","feito","tem",
      "ja","já","mais","menos","melhor","pior","time","times","liga","campeonato",
      "ano","anos","temporada","atual","passado","passada","este","esse","essa",
      "casa","fora","mandante","visitante",
    ]);
    const tokens = normalized
      .replace(/[?!.,;:()"]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d{4}$/.test(t));

    const queriesToTry: string[] = [query];
    if (type !== "entity" && tokens.length > 0) {
      queriesToTry.push(tokens.join(" "));
      for (const t of tokens) queriesToTry.push(t);
    }

    const seen = new Set<string>();
    const merged: any[] = [];
    for (const q of queriesToTry) {
      const { data, error } = await supabase.rpc("search_global", { p_query: q, p_limit: 20 });
      if (error) { console.error("search_global", q, error); continue; }
      for (const r of (data || [])) {
        const k = `${r.entity_type}:${r.entity_id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(r);
        if (merged.length >= 30) break;
      }
      if (merged.length >= 30) break;
    }
    const results = merged;

    const entities = (results || []).slice(0, 8).map((r: any) => ({
      type: r.entity_type,
      id: r.entity_id,
      name: r.name,
    }));

    let ai_answer: any = null;
    let contextStr = "";

    // 2. Monta contexto factual real (com filtros aplicados) para a IA
    if (type === "question" || type === "stat") {
      // pula sub-times se houver alternativa principal
      const teamCandidates = results.filter((r: any) => r.entity_type === "team");
      const topTeam = teamCandidates.find((r: any) => !SUBTEAM_RE.test(r.name)) || teamCandidates[0];
      const topLeague = results.find((r: any) => r.entity_type === "league");
      const topPlayer = results.find((r: any) => r.entity_type === "player");

      if (topTeam) {
        const matches = await fetchAllPartidas(supabase, topTeam.entity_id, year, scope);
        const agg = aggregate(matches, topTeam.entity_id);
        const scopeStr = scope === "home" ? " (apenas como mandante)" : scope === "away" ? " (apenas como visitante)" : "";
        const yearStr = year ? `Ano consultado: ${year}\n` : "Período: todos os dados disponíveis\n";
        contextStr += `Time consultado: ${topTeam.name} (id: ${topTeam.entity_id})\n${yearStr}`;
        contextStr += `Jogos finalizados${scopeStr}: ${agg.total}\n`;
        contextStr += `Vitórias: ${agg.w} | Empates: ${agg.d} | Derrotas: ${agg.l}\n`;
        contextStr += `Gols marcados: ${agg.gf} | Gols sofridos: ${agg.ga}\n`;
        if (matches.length > 0) {
          const last = matches.slice(0, 5).map((m: any) => {
            const isHome = m.time_casa_id === topTeam.entity_id;
            return `${m.data?.slice(0,10)} ${isHome ? "(casa)" : "(fora)"} ${m.gols_casa}x${m.gols_fora}`;
          }).join("; ");
          contextStr += `Últimas partidas no período: ${last}\n`;
        }
        if (teamCandidates.length > 1) {
          const others = teamCandidates.slice(0, 5).filter((t: any) => t.entity_id !== topTeam.entity_id).map((t: any) => t.name);
          if (others.length) contextStr += `Outros times com nome similar (não consultados): ${others.join(", ")}\n`;
        }
      }
      if (topLeague) contextStr += `Liga relacionada: ${topLeague.name}\n`;
      if (topPlayer) contextStr += `Jogador relacionado: ${topPlayer.name}\n`;

      if (type === "question") {
        const ai = await callAI(contextStr || "Sem dados internos relacionados.", query);
        ai_answer = ai;
        await supabase.rpc("record_ai_answer", {
          p_question: query,
          p_normalized: normalized,
          p_answer: ai.answer,
          p_sources: entities,
          p_confidence: ai.confidence,
          p_has_enough: ai.has_enough_data,
          p_user_id: user_id ?? null,
        });
      }
    }

    // 3. Registra busca + trends
    await supabase.rpc("register_search", {
      p_query: query,
      p_normalized: normalized,
      p_type: type,
      p_entities: entities,
      p_user_id: user_id ?? null,
      p_result_count: results?.length ?? 0,
      p_status: "ok",
    });

    // 4. Histórico individual
    if (user_id) {
      await supabase.from("user_search_history").insert({
        user_id,
        query_text: query,
        query_type: type,
      });
    }

    return new Response(
      JSON.stringify({
        type,
        query,
        normalized,
        year,
        scope,
        entities,
        results: results ?? [],
        ai_answer,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("intelligent-search error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
