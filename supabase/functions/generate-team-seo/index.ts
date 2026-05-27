// Generate SEO descriptive content for team/league/season using Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isContentGenerationEnabled, disabledResponse } from "../_shared/killswitch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  team_id: string;
  league_id: string | null;
  season: number;
  team_name: string;
  league_name: string | null;
  stats: {
    jogos: number;
    vitorias: number;
    empates: number;
    derrotas: number;
    golsMarcados: number;
    golsSofridos: number;
    mediaGolsMarcados: number;
    mediaGolsSofridos: number;
    saldo: number;
    aproveitamento: number;
    over25: number;
    btts: number;
    cleanSheets: number;
    semMarcar: number;
    casaJogos: number;
    casaVitorias: number;
    foraJogos: number;
    foraVitorias: number;
    forma: string[];
  };
  force?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // === KILL-SWITCH: cost control ===
  if (!(await isContentGenerationEnabled())) {
    return disabledResponse(corsHeaders, "generate-team-seo");
  }


  try {
    const body = (await req.json()) as ReqBody;
    const { team_id, league_id, season, team_name, league_name, stats, force } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Cache check
    if (!force) {
      const { data: cached } = await supabase
        .from("team_seo_content")
        .select("*")
        .eq("team_id", team_id)
        .eq("season", season)
        .eq(league_id ? "league_id" : "team_id", league_id ?? team_id)
        .maybeSingle();
      if (cached) {
        return new Response(JSON.stringify({ cached: true, ...cached }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Você é um analista esportivo do Statball. Gere um texto descritivo, factual e variado sobre o desempenho do ${team_name}${league_name ? ` no ${league_name}` : ""} na temporada ${season}.

Estatísticas reais:
- Jogos: ${stats.jogos} (${stats.vitorias}V / ${stats.empates}E / ${stats.derrotas}D)
- Aproveitamento: ${stats.aproveitamento}%
- Gols marcados: ${stats.golsMarcados} (média ${stats.mediaGolsMarcados.toFixed(2)}/jogo)
- Gols sofridos: ${stats.golsSofridos} (média ${stats.mediaGolsSofridos.toFixed(2)}/jogo)
- Saldo: ${stats.saldo > 0 ? "+" : ""}${stats.saldo}
- Casa: ${stats.casaVitorias}V em ${stats.casaJogos} jogos
- Fora: ${stats.foraVitorias}V em ${stats.foraJogos} jogos
- Over 2.5 gols: ${stats.over25}% das partidas
- Ambas marcam (BTTS): ${stats.btts}%
- Clean sheets: ${stats.cleanSheets}
- Jogos sem marcar: ${stats.semMarcar}
- Forma recente: ${stats.forma.join(", ")}

Retorne JSON com as chaves:
{
  "desempenho_geral": "2-3 frases sobre a campanha",
  "gols_e_media": "2 frases sobre produção e defesa",
  "estatisticas_avancadas": "2 frases sobre Over/BTTS/clean sheets",
  "casa": "1-2 frases sobre desempenho como mandante",
  "fora": "1-2 frases sobre desempenho como visitante",
  "forma_recente": "1 frase sobre os últimos jogos",
  "meta_title": "Título SEO até 60 caracteres",
  "meta_description": "Descrição SEO até 155 caracteres"
}

NUNCA invente números. Use APENAS os dados acima. Linguagem analítica, neutra (NÃO é apostas).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você gera conteúdo SEO factual em português do Brasil. Sempre responda em JSON válido." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429 || aiResp.status === 402) {
      return new Response(JSON.stringify({ skipped: true, reason: aiResp.status === 429 ? "rate_limit" : "no_credits" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const content = JSON.parse(aiData.choices[0].message.content);

    const { data: saved, error } = await supabase
      .from("team_seo_content")
      .upsert({
        team_id,
        league_id,
        season,
        content,
        meta_title: content.meta_title,
        meta_description: content.meta_description,
        generated_at: new Date().toISOString(),
      }, { onConflict: "team_id,league_id,season" })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ cached: false, ...saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-team-seo error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
