import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um analista esportivo do Statball cobrindo a Copa do Mundo 2026.
Escreva em português brasileiro, tom jornalístico, claro e informativo.
NUNCA use linguagem de apostas. Palpites são previsões editoriais esportivas.
Use APENAS os dados reais fornecidos no contexto. Se faltarem dados, sinalize cobertura parcial.
NUNCA invente escalações oficiais — apenas use as marcadas como oficiais.`;

async function callAI(messages: any[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit. Tente em alguns instantes.");
    if (res.status === 402) throw new Error("Créditos esgotados. Adicione créditos no workspace.");
    throw new Error(`AI ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "ai_generation", provider: "lovable-ai", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    const body = await req.json();
    const { match_id, team_id, analysis_type } = body;
    if (!analysis_type) throw new Error("analysis_type obrigatório");

    let context = "";
    let title = "";
    let hasEnoughData = true;

    if (match_id) {
      const { data: m } = await supabase.from("world_cup_2026_matches")
        .select(`*, home:world_cup_2026_teams!home_team_id(name,group_letter,status), away:world_cup_2026_teams!away_team_id(name,group_letter,status)`)
        .eq("id", match_id).maybeSingle();
      if (!m) throw new Error("Partida não encontrada");
      const homeName = (m as any).home?.name ?? "Time da casa";
      const awayName = (m as any).away?.name ?? "Visitante";
      title = `${homeName} x ${awayName}`;
      context = `Partida: ${homeName} x ${awayName}
Data: ${m.match_date}
Estádio: ${m.stadium ?? "n/d"} - ${m.city ?? "n/d"}
Fase: ${m.stage} ${m.group_letter ? `(Grupo ${m.group_letter})` : ""}
Status: ${m.status}
Placar: ${m.home_score ?? "-"} x ${m.away_score ?? "-"}`;
      if (!m.stadium || !m.match_date) hasEnoughData = false;
    } else if (team_id) {
      const { data: t } = await supabase.from("world_cup_2026_teams").select("*").eq("id", team_id).maybeSingle();
      if (!t) throw new Error("Seleção não encontrada");
      title = t.name;
      context = `Seleção: ${t.name}
Grupo: ${t.group_letter ?? "n/d"}
Técnico: ${t.coach_name ?? "n/d"}
Status: ${t.status}
Participações em Copas: ${t.participations_count ?? 0}
Melhor campanha: ${t.best_campaign ?? "n/d"}
Histórico: ${t.historical_summary ?? "n/d"}`;
    }

    const userMsg = `Tipo de análise: ${analysis_type}
Contexto:
${context}

Gere uma análise jornalística (3-5 parágrafos). ${analysis_type === "prediction" ? "Inclua uma previsão editorial de placar provável e justificativa." : ""}`;

    const content = await callAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ]);

    let predictedHome: number | null = null, predictedAway: number | null = null;
    if (analysis_type === "prediction") {
      const m = content.match(/(\d+)\s*[x×-]\s*(\d+)/);
      if (m) { predictedHome = +m[1]; predictedAway = +m[2]; }
    }

    const { data: inserted } = await supabase.from("world_cup_2026_ai_analyses").insert({
      match_id: match_id ?? null, team_id: team_id ?? null, analysis_type,
      title, content,
      predicted_home_score: predictedHome, predicted_away_score: predictedAway,
      confidence_score: hasEnoughData ? 0.75 : 0.4,
      has_enough_data: hasEnoughData, model_used: "google/gemini-2.5-flash",
    }).select().single();

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: 1,
      payload_snapshot: { analysis_type, match_id, team_id },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, analysis: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("world_cup_2026_sync_logs").update({
      status: "error", finished_at: new Date().toISOString(), error_message: msg,
    }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
