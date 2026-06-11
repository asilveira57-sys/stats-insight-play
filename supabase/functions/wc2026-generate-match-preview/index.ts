import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGE_PT: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "Segunda Fase (R32)",
  round_of_16: "Oitavas de Final",
  quarter_final: "Quartas de Final",
  semi_final: "Semifinal",
  third_place: "Disputa do 3º Lugar",
  final: "Final",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500, headers: cors });

  try {
    const { match_id, force } = await req.json();
    if (!match_id) throw new Error("match_id required");

    // Skip if already exists (unless force)
    if (!force) {
      const { data: existing } = await supabase
        .from("world_cup_2026_ai_analyses")
        .select("id").eq("match_id", match_id).eq("analysis_type", "pre_match").maybeSingle();
      if (existing) return new Response(JSON.stringify({ success: true, skipped: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: match } = await supabase
      .from("world_cup_2026_matches")
      .select(`*, home:home_team_id(id,name,slug,group_letter,coach_name,historical_summary,best_campaign,titles_count,participations_count,nickname),
        away:away_team_id(id,name,slug,group_letter,coach_name,historical_summary,best_campaign,titles_count,participations_count,nickname)`)
      .eq("id", match_id).maybeSingle();
    if (!match) throw new Error("match not found");

    const dateStr = match.match_date ? new Date(match.match_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" }) : "";
    const stageLabel = STAGE_PT[match.stage] ?? match.stage;

    const facts = `
FATOS DA PARTIDA (use APENAS estes dados, sem inventar nada):
- Fase: ${stageLabel}${match.group_letter ? ` - Grupo ${match.group_letter}` : ""}
- Data: ${dateStr} (horário de Brasília)
- Estádio: ${match.stadium ?? "a confirmar"}, ${match.city ?? ""}

SELEÇÃO MANDANTE: ${match.home?.name}
- Apelido: ${match.home?.nickname ?? "—"}
- Técnico: ${match.home?.coach_name ?? "a confirmar"}
- Títulos mundiais: ${match.home?.titles_count ?? 0}
- Participações em Copas: ${match.home?.participations_count ?? "—"}
- Melhor campanha: ${match.home?.best_campaign ?? "—"}
- Histórico: ${match.home?.historical_summary?.slice(0, 800) ?? "—"}

SELEÇÃO VISITANTE: ${match.away?.name}
- Apelido: ${match.away?.nickname ?? "—"}
- Técnico: ${match.away?.coach_name ?? "a confirmar"}
- Títulos mundiais: ${match.away?.titles_count ?? 0}
- Participações em Copas: ${match.away?.participations_count ?? "—"}
- Melhor campanha: ${match.away?.best_campaign ?? "—"}
- Histórico: ${match.away?.historical_summary?.slice(0, 800) ?? "—"}
`.trim();

    const prompt = `${facts}

Você é Statball, analista esportivo. Escreva uma ANÁLISE PRÉ-JOGO em português brasileiro, tom jornalístico-estatístico (NÃO é aposta).

Devolva APENAS um JSON estrito com este formato:
{
  "headline": "manchete curta e atrativa (máx 90 chars)",
  "narrative": "4 parágrafos densos (mín 900 caracteres no total) contextualizando o duelo, com base APENAS nos fatos acima — fase, histórico, comissão técnica, expectativa para a partida e cenário no grupo/mata-mata. NÃO invente jogadores, lesões ou estatísticas que não estejam nos fatos.",
  "predicted_home_score": 0,
  "predicted_away_score": 0,
  "confidence": "high" | "medium" | "low",
  "tactical_matchup": "1 parágrafo curto sobre o confronto tático com base nas escolas dos países envolvidos",
  "bullet_facts": ["3 a 5 bullets factuais extraídos dos dados acima"]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    let aiRes: Response;
    try {
      aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI ${aiRes.status}: ${txt.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const fullContent = `## ${parsed.headline}\n\n${parsed.narrative}\n\n### Duelo tático\n${parsed.tactical_matchup ?? ""}\n\n### Pontos-chave\n${(parsed.bullet_facts ?? []).map((b: string) => `- ${b}`).join("\n")}`;

    const { error: upsertError } = await supabase.from("world_cup_2026_ai_analyses").upsert({
      match_id,
      analysis_type: "pre_match",
      title: parsed.headline ?? `${match.home?.name} x ${match.away?.name}`,
      content: fullContent,
      predicted_home_score: parsed.predicted_home_score ?? null,
      predicted_away_score: parsed.predicted_away_score ?? null,
      confidence_score: parsed.confidence === "high" ? 0.85 : parsed.confidence === "medium" ? 0.6 : 0.4,
      has_enough_data: (parsed.narrative?.length ?? 0) >= 700,
      model_used: "gpt-4o-mini",
      generated_at: new Date().toISOString(),
    }, { onConflict: "match_id,analysis_type" });
    if (upsertError) throw new Error(`save analysis failed: ${upsertError.message}`);

    return new Response(JSON.stringify({ success: true, length: parsed.narrative?.length ?? 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
