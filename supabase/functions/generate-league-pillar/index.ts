import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeagueData {
  id: string;
  nome: string;
  slug: string;
  pais: string | null;
  stats: {
    totalPartidas: number;
    totalGols: number;
    mediaGolsPorJogo: number;
    percentualEmpates: number;
    totalTimes: number;
  };
}

async function generatePillarContent(leagueData: LeagueData, OPENAI_API_KEY: string): Promise<{
  visao_geral: string;
  estilo_liga: string;
  panorama_temporada: string;
}> {
  const prompt = `Você é um analista esportivo brasileiro especializado em futebol. Gere conteúdo evergreen para a página pilar do campeonato ${leagueData.nome}.

DADOS DO CAMPEONATO:
- Nome: ${leagueData.nome}
- País: ${leagueData.pais || "Não informado"}
- Total de partidas: ${leagueData.stats.totalPartidas}
- Total de gols: ${leagueData.stats.totalGols}
- Média de gols por jogo: ${leagueData.stats.mediaGolsPorJogo}
- Percentual de empates: ${leagueData.stats.percentualEmpates}%
- Times participantes: ${leagueData.stats.totalTimes}

Gere EXATAMENTE 3 blocos de texto em HTML, separados por marcadores:

===VISAO_GERAL===
Escreva 2-3 parágrafos sobre a história, importância e características do campeonato. Foque em informações atemporais que permanecem relevantes. Mencione o prestígio da liga, rivalidades históricas e seu papel no cenário do futebol.

===ESTILO_LIGA===
Escreva 2-3 parágrafos analisando o perfil tático e estatístico da liga baseado nos dados fornecidos. Mencione tendências como ritmo de jogo, média de gols, estilo predominante (ofensivo/defensivo), e como a liga se compara a outras.

===PANORAMA_TEMPORADA===
Escreva 1-2 parágrafos sobre aspectos gerais de uma temporada típica desta liga. Foque em estrutura (pontos corridos, mata-mata), calendário, e o que torna a competição única.

REGRAS:
- Use HTML com <p> para parágrafos
- Não use <h2> ou <h3> (os headings são adicionados pelo sistema)
- Seja analítico e profissional
- NUNCA prometa resultados ou mencione apostas
- Foque em análise estatística e tendências
- Mantenha tom informativo e objetivo
- Escreva conteúdo evergreen que permanece válido entre temporadas`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um analista esportivo brasileiro profissional. Escreva em português brasileiro." },
        { role: "user", content: prompt }
      ],
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    if (response.status === 429) throw new Error("OpenAI rate limit exceeded. Try again later.");
    if (response.status === 402) throw new Error("OpenAI payment required. Check your API credits.");
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  const sections = {
    visao_geral: "",
    estilo_liga: "",
    panorama_temporada: "",
  };

  const visaoMatch = content.match(/===VISAO_GERAL===([\s\S]*?)(?====|$)/);
  const estiloMatch = content.match(/===ESTILO_LIGA===([\s\S]*?)(?====|$)/);
  const panoramaMatch = content.match(/===PANORAMA_TEMPORADA===([\s\S]*?)(?====|$)/);

  if (visaoMatch) sections.visao_geral = visaoMatch[1].trim();
  if (estiloMatch) sections.estilo_liga = estiloMatch[1].trim();
  if (panoramaMatch) sections.panorama_temporada = panoramaMatch[1].trim();

  return sections;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let league_id, league_slug, force_regenerate;
    try {
      const body = await req.json();
      league_id = body.league_id;
      league_slug = body.league_slug;
      force_regenerate = body.force_regenerate;
    } catch {
      // No body provided, use defaults
    }

    let leagueQuery = supabaseAdmin.from('ligas').select('*').eq('ativa', true);
    
    if (league_id) {
      leagueQuery = leagueQuery.eq('id', league_id);
    } else if (league_slug) {
      leagueQuery = leagueQuery.eq('slug', league_slug);
    } else {
      leagueQuery = leagueQuery
        .or('pillar_content.is.null,pillar_updated_at.lt.' + new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .limit(3);
    }

    const { data: leagues, error: leagueError } = await leagueQuery;

    if (leagueError) {
      throw new Error(`Error fetching leagues: ${leagueError.message}`);
    }

    if (!leagues || leagues.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No leagues to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const league of leagues) {
      try {
        if (!force_regenerate && league.pillar_content && league.pillar_updated_at) {
          const lastUpdate = new Date(league.pillar_updated_at);
          const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate < 14) {
            results.push({ league_id: league.id, status: "skipped", reason: "Recent content exists" });
            continue;
          }
        }

        // Get match stats for this league
        const { data: matches } = await supabaseAdmin
          .from('partidas')
          .select('gols_casa, gols_fora, status, time_casa_id, time_fora_id')
          .eq('liga_id', league.id);

        const finishedMatches = (matches || []).filter(m => m.status === 'finished');
        
        let totalGols = 0;
        let empates = 0;
        const teamsSet = new Set<string>();

        finishedMatches.forEach(m => {
          const gc = m.gols_casa ?? 0;
          const gf = m.gols_fora ?? 0;
          totalGols += gc + gf;
          if (gc === gf) empates++;
          if (m.time_casa_id) teamsSet.add(m.time_casa_id);
          if (m.time_fora_id) teamsSet.add(m.time_fora_id);
        });

        const mediaGolsPorJogo = finishedMatches.length > 0 
          ? Math.round((totalGols / finishedMatches.length) * 100) / 100 
          : 0;
        const percentualEmpates = finishedMatches.length > 0 
          ? Math.round((empates / finishedMatches.length) * 100) 
          : 0;

        const leagueData: LeagueData = {
          id: league.id,
          nome: league.nome,
          slug: league.slug,
          pais: league.pais,
          stats: {
            totalPartidas: finishedMatches.length,
            totalGols,
            mediaGolsPorJogo,
            percentualEmpates,
            totalTimes: teamsSet.size,
          },
        };

        const content = await generatePillarContent(leagueData, OPENAI_API_KEY);

        const { error: updateError } = await supabaseAdmin
          .from('ligas')
          .update({
            pillar_content: content,
            pillar_updated_at: new Date().toISOString(),
          })
          .eq('id', league.id);

        if (updateError) {
          results.push({ league_id: league.id, status: "error", error: updateError.message });
        } else {
          results.push({ league_id: league.id, status: "success", league_name: league.nome });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (leagueErr) {
        console.error(`Error processing league ${league.id}:`, leagueErr);
        results.push({ league_id: league.id, status: "error", error: String(leagueErr) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-league-pillar:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
