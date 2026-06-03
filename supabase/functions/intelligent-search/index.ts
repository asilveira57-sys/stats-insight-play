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
1. Responda APENAS com base nos dados fornecidos no CONTEXTO abaixo.
2. NUNCA invente nomes, números, datas ou fatos que não estejam no contexto.
3. Se o contexto não tiver dados suficientes para responder, retorne EXATAMENTE: "Ainda não há dados suficientes no Statball para responder com precisão."
4. Seja conciso, em português do Brasil.
5. Responda em JSON puro com as chaves: answer (string), explanation (string curta), has_enough_data (boolean), confidence (0-100).`;

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

    // 1. Resolve entidades
    const { data: results, error: searchErr } = await supabase.rpc("search_global", {
      p_query: query,
      p_limit: 20,
    });
    if (searchErr) console.error("search_global", searchErr);

    const entities = (results || []).slice(0, 8).map((r: any) => ({
      type: r.entity_type,
      id: r.entity_id,
      name: r.name,
    }));

    let ai_answer: any = null;
    let contextStr = "";

    // 2. Monta contexto factual para a IA (se for pergunta)
    if (type === "question" || type === "stat") {
      const topTeam = results?.find((r: any) => r.entity_type === "team");
      const topLeague = results?.find((r: any) => r.entity_type === "league");
      const topPlayer = results?.find((r: any) => r.entity_type === "player");

      if (topTeam) {
        const { data: stats } = await supabase.rpc("get_team_stats_bulk", {
          p_team_ids: [topTeam.entity_id],
        });
        if (stats?.[0]) {
          const s = stats[0];
          contextStr += `Time: ${topTeam.name}\n- Jogos: ${s.total_matches}, Vitórias: ${s.wins}, Empates: ${s.draws}, Derrotas: ${s.losses}\n- Gols marcados: ${s.goals_scored}, Gols sofridos: ${s.goals_conceded}\n`;
        }
        const { data: lastMatches } = await supabase
          .from("partidas")
          .select("data, gols_casa, gols_fora, time_casa_id, time_fora_id")
          .or(`time_casa_id.eq.${topTeam.entity_id},time_fora_id.eq.${topTeam.entity_id}`)
          .eq("status", "finished")
          .order("data", { ascending: false })
          .range(0, 4);
        if (lastMatches?.length) {
          contextStr += `Últimas 5 partidas: ${lastMatches.map((m: any) => `${m.data} ${m.gols_casa}x${m.gols_fora}`).join("; ")}\n`;
        }
      }
      if (topLeague) contextStr += `Liga encontrada: ${topLeague.name}\n`;
      if (topPlayer) contextStr += `Jogador encontrado: ${topPlayer.name}\n`;

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
