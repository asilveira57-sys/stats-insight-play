// supabase/functions/explain-prediction/index.ts
// Gera os pesos auditáveis de uma previsão (Elo, FIFA, forma, etc.)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface Body { match_id: string; source: "wc2026" | "partidas" }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { match_id, source = "wc2026" } = (await req.json()) as Body;
    if (!match_id) throw new Error("match_id obrigatório");
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Coletar previsão e contexto
    let prediction: any = null;
    let context: any = {};
    if (source === "wc2026") {
      const { data: ai } = await sb
        .from("world_cup_2026_ai_analyses")
        .select("*")
        .eq("match_id", match_id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      prediction = ai;
      const { data: match } = await sb
        .from("world_cup_2026_matches")
        .select("*, home:world_cup_2026_teams!world_cup_2026_matches_home_team_id_fkey(*), away:world_cup_2026_teams!world_cup_2026_matches_away_team_id_fkey(*)")
        .eq("id", match_id)
        .maybeSingle();
      context = match;
    } else {
      const { data: pal } = await sb.from("palpites").select("*").eq("partida_id", match_id).maybeSingle();
      prediction = pal;
      const { data: match } = await sb.from("partidas").select("*").eq("id", match_id).maybeSingle();
      context = match;
    }

    if (!prediction) {
      return new Response(JSON.stringify({ error: "Previsão não encontrada para esta partida" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- Heurística de pesos (determinística + ajustes via LLM opcional)
    const homeName = context?.home?.name ?? context?.home?.nome ?? "Mandante";
    const awayName = context?.away?.name ?? context?.away?.nome ?? "Visitante";
    const homeRank = context?.home?.fifa_ranking ?? null;
    const awayRank = context?.away?.fifa_ranking ?? null;
    const isFinal = context?.stage === "final" || context?.stage === "semi_final";

    // base
    let weights: Record<string, number> = {
      elo: 0.22, fifa: 0.15, recent_form: 0.18, goals_for: 0.10,
      goals_against: 0.10, home_advantage: 0.08, absences: 0.07, h2h: 0.10,
    };

    if (isFinal) { weights.h2h += 0.05; weights.recent_form += 0.03; weights.home_advantage -= 0.05; }
    if (homeRank && awayRank) {
      const diff = Math.abs(homeRank - awayRank);
      if (diff > 30) { weights.fifa += 0.06; weights.elo += 0.04; }
    }
    // normalizar
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    weights = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, +(v / sum).toFixed(3)]));

    const labels: Record<string, string> = {
      elo: "Elo Rating", fifa: "Ranking FIFA", recent_form: "Forma recente",
      goals_for: "Gols marcados", goals_against: "Gols sofridos", home_advantage: "Mando",
      absences: "Desfalques", h2h: "Histórico H2H",
    };
    const topFactors = Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, w]) => ({ key: k, label: labels[k], weight: w }));

    let rationale = `Previsão ${prediction.predicted_home_score ?? prediction.placar_casa_estimado}-${prediction.predicted_away_score ?? prediction.placar_fora_estimado} para ${homeName} x ${awayName}, com peso maior em ${topFactors.map(f => f.label).join(", ")}.`;

    if (LOVABLE_API_KEY) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você é um analista esportivo. Resuma em UMA frase (máx 220 caracteres) por que a IA escolheu este placar, usando os pesos fornecidos. Sem inventar." },
              { role: "user", content: `Partida: ${homeName} x ${awayName}\nPlacar previsto: ${prediction.predicted_home_score ?? prediction.placar_casa_estimado}-${prediction.predicted_away_score ?? prediction.placar_fora_estimado}\nPesos: ${JSON.stringify(weights)}` },
            ],
          }),
        });
        const j = await r.json();
        const txt = j?.choices?.[0]?.message?.content?.trim();
        if (txt) rationale = txt;
      } catch (_) { /* segue heurístico */ }
    }

    // ---- Persistir (imutável: ON CONFLICT DO NOTHING via unique)
    const { data: existing } = await sb
      .from("prediction_explanations")
      .select("id")
      .eq("prediction_source", source)
      .eq("prediction_id", prediction.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, existed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await sb.from("prediction_explanations").insert({
      prediction_source: source,
      prediction_id: prediction.id,
      match_id,
      model_version: "statball-ai-v1",
      weights,
      rationale,
      top_factors: topFactors,
    });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, weights, top_factors: topFactors, rationale }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
