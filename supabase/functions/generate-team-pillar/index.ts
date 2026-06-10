import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isContentGenerationEnabled, disabledResponse } from "../_shared/killswitch.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamData {
  id: string;
  nome: string;
  slug: string;
  pais: string | null;
  liga: string | null;
  stats: {
    jogos: number;
    vitorias: number;
    empates: number;
    derrotas: number;
    golsMarcados: number;
    golsSofridos: number;
    aproveitamento: number;
    vitoriasCasa: number;
    jogosCasa: number;
    vitoriasFora: number;
    jogosFora: number;
  };
}

async function generatePillarContent(teamData: TeamData, GEMINI_API_KEY: string): Promise<{
  visao_geral: string;
  estilo_jogo: string;
  desempenho_temporada: string;
  confrontos_relevantes: string;
}> {
  const prompt = `Você é um analista esportivo brasileiro especializado em futebol. Gere conteúdo evergreen para a página pilar do time ${teamData.nome}.

DADOS DO TIME:
- Nome: ${teamData.nome}
- País: ${teamData.pais || "Não informado"}
- Liga atual: ${teamData.liga || "Não informada"}
- Jogos: ${teamData.stats.jogos}
- Vitórias: ${teamData.stats.vitorias} (${Math.round(teamData.stats.vitorias / Math.max(1, teamData.stats.jogos) * 100)}%)
- Empates: ${teamData.stats.empates}
- Derrotas: ${teamData.stats.derrotas}
- Gols marcados: ${teamData.stats.golsMarcados}
- Gols sofridos: ${teamData.stats.golsSofridos}
- Aproveitamento: ${teamData.stats.aproveitamento}%
- Jogos em casa: ${teamData.stats.jogosCasa} (${teamData.stats.vitoriasCasa} vitórias)
- Jogos fora: ${teamData.stats.jogosFora} (${teamData.stats.vitoriasFora} vitórias)

Gere EXATAMENTE 4 blocos de texto em HTML, separados por marcadores:

===VISAO_GERAL===
Escreva 2-3 parágrafos sobre o histórico e papel atual do clube. Foque em informações atemporais que permanecem relevantes. Não mencione datas específicas ou resultados de jogos recentes.

===ESTILO_JOGO===
Escreva 2-3 parágrafos analisando o perfil tático e estatístico do time baseado nos dados fornecidos. Mencione tendências como força em casa/fora, média de gols, estilo ofensivo/defensivo.

===DESEMPENHO_TEMPORADA===
Escreva 1-2 parágrafos interpretando os números da temporada atual de forma analítica. Contextualize o aproveitamento e a posição do clube.

===CONFRONTOS_RELEVANTES===
Escreva 1-2 parágrafos sobre rivalidades históricas e jogos importantes do clube. Foque em clássicos tradicionais.

REGRAS:
- Use HTML com <p> para parágrafos
- Não use <h2> ou <h3> (os headings são adicionados pelo sistema)
- Seja analítico e profissional
- NUNCA prometa resultados ou mencione apostas
- Foque em análise estatística e tendências
- Mantenha tom informativo e objetivo`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GEMINI_API_KEY}`,
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
    console.error("Gemini API error:", response.status, errorText);
    if (response.status === 429) throw new Error("Gemini rate limit exceeded. Try again later.");
    if (response.status === 402) throw new Error("Gemini payment required. Check your API credits.");
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse the content into sections
  const sections = {
    visao_geral: "",
    estilo_jogo: "",
    desempenho_temporada: "",
    confrontos_relevantes: "",
  };

  const visaoMatch = content.match(/===VISAO_GERAL===([\s\S]*?)(?====|$)/);
  const estiloMatch = content.match(/===ESTILO_JOGO===([\s\S]*?)(?====|$)/);
  const desempenhoMatch = content.match(/===DESEMPENHO_TEMPORADA===([\s\S]*?)(?====|$)/);
  const confrontosMatch = content.match(/===CONFRONTOS_RELEVANTES===([\s\S]*?)(?====|$)/);

  if (visaoMatch) sections.visao_geral = visaoMatch[1].trim();
  if (estiloMatch) sections.estilo_jogo = estiloMatch[1].trim();
  if (desempenhoMatch) sections.desempenho_temporada = desempenhoMatch[1].trim();
  if (confrontosMatch) sections.confrontos_relevantes = confrontosMatch[1].trim();

  return sections;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // === KILL-SWITCH: cost control ===
  if (!(await isContentGenerationEnabled())) {
    return disabledResponse(corsHeaders, "generate-team-pillar");
  }


  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GEMINI_API_KEY = Deno.env.get("OPENAI_API_KEY") || Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let team_id, team_slug, force_regenerate;
    try {
      const body = await req.json();
      team_id = body.team_id;
      team_slug = body.team_slug;
      force_regenerate = body.force_regenerate;
    } catch {
      // No body provided, use defaults
    }

    // Fetch team
    let teamQuery = supabaseAdmin.from('times').select('*');
    
    if (team_id) {
      teamQuery = teamQuery.eq('id', team_id);
    } else if (team_slug) {
      teamQuery = teamQuery.eq('slug', team_slug);
    } else {
      // Get teams without pillar content or with old content
      teamQuery = teamQuery
        .or('pillar_content.is.null,pillar_updated_at.lt.' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    }

    const { data: teams, error: teamError } = await teamQuery;

    if (teamError) {
      throw new Error(`Error fetching teams: ${teamError.message}`);
    }

    if (!teams || teams.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No teams to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const team of teams) {
      try {
        // Skip if already has recent content (unless forced)
        if (!force_regenerate && team.pillar_content && team.pillar_updated_at) {
          const lastUpdate = new Date(team.pillar_updated_at);
          const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate < 7) {
            results.push({ team_id: team.id, status: "skipped", reason: "Recent content exists" });
            continue;
          }
        }

        // Calculate team stats
        const { data: homeMatches } = await supabaseAdmin
          .from('partidas')
          .select('gols_casa, gols_fora, liga:ligas(nome)')
          .eq('time_casa_id', team.id)
          .eq('status', 'finished');

        const { data: awayMatches } = await supabaseAdmin
          .from('partidas')
          .select('gols_casa, gols_fora')
          .eq('time_fora_id', team.id)
          .eq('status', 'finished');

        let vitorias = 0, empates = 0, derrotas = 0;
        let golsMarcados = 0, golsSofridos = 0;
        let vitoriasCasa = 0, vitoriasFora = 0;

        (homeMatches || []).forEach(m => {
          const gc = m.gols_casa ?? 0;
          const gf = m.gols_fora ?? 0;
          golsMarcados += gc;
          golsSofridos += gf;
          if (gc > gf) { vitorias++; vitoriasCasa++; }
          else if (gc === gf) { empates++; }
          else { derrotas++; }
        });

        (awayMatches || []).forEach(m => {
          const gc = m.gols_casa ?? 0;
          const gf = m.gols_fora ?? 0;
          golsMarcados += gf;
          golsSofridos += gc;
          if (gf > gc) { vitorias++; vitoriasFora++; }
          else if (gf === gc) { empates++; }
          else { derrotas++; }
        });

        const jogos = (homeMatches?.length || 0) + (awayMatches?.length || 0);
        const aproveitamento = jogos > 0 ? Math.round((vitorias * 3 + empates) / (jogos * 3) * 100) : 0;

        const liga = (homeMatches?.[0]?.liga as unknown as { nome: string } | null)?.nome || null;

        const teamData: TeamData = {
          id: team.id,
          nome: team.nome,
          slug: team.slug,
          pais: team.pais,
          liga,
          stats: {
            jogos,
            vitorias,
            empates,
            derrotas,
            golsMarcados,
            golsSofridos,
            aproveitamento,
            vitoriasCasa,
            jogosCasa: homeMatches?.length || 0,
            vitoriasFora,
            jogosFora: awayMatches?.length || 0,
          },
        };

        // Generate content
        const content = await generatePillarContent(teamData, GEMINI_API_KEY);

        // Update team with content
        const { error: updateError } = await supabaseAdmin
          .from('times')
          .update({
            pillar_content: content,
            pillar_updated_at: new Date().toISOString(),
          })
          .eq('id', team.id);

        if (updateError) {
          results.push({ team_id: team.id, status: "error", error: updateError.message });
        } else {
          results.push({ team_id: team.id, status: "success", team_name: team.nome });
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (teamErr) {
        console.error(`Error processing team ${team.id}:`, teamErr);
        results.push({ team_id: team.id, status: "error", error: String(teamErr) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-team-pillar:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
