import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isContentGenerationEnabled, disabledResponse } from "../_shared/killswitch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // === KILL-SWITCH: cost control ===
  if (!(await isContentGenerationEnabled())) {
    return disabledResponse(corsHeaders, "reprocess-articles");
  }


  const startTime = Date.now();
  const SAFETY_TIMEOUT_MS = 120_000;

  function hasTimeLeft(): boolean {
    return Date.now() - startTime < SAFETY_TIMEOUT_MS;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let limit = 3;
  let leagueFilter: string | null = null;
  let prioritizeRecent = true;
  let articleId: string | null = null;

  try {
    const body = await req.json();
    limit = Math.min(5, Math.max(1, Number(body?.limit) || 3));
    leagueFilter = body?.league_id || null;
    prioritizeRecent = body?.prioritize_recent !== false;
    articleId = body?.article_id || null;
  } catch {
    // defaults
  }

  try {
    // Fetch articles to reprocess
    let query = supabase
      .from("noticias")
      .select(
        `
        id, titulo, texto, resumo, slug, partida_id, content_updated,
        partida:partidas!noticias_partida_id_fkey(
          id, data, hora, rodada,
          time_casa:times!partidas_time_casa_id_fkey(id, nome, cores),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, cores),
          liga:ligas!partidas_liga_id_fkey(id, nome),
          palpite:palpites(prob_casa, prob_empate, prob_fora, placar_casa_estimado, placar_fora_estimado, forca_time_casa, forca_time_fora, confianca)
        )
      `
      )
      .eq("publicada", true)
      .or("content_updated.is.null,content_updated.eq.false");

    if (articleId) {
      query = query.eq("id", articleId);
    }

    if (prioritizeRecent) {
      query = query.order("data_publicacao", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: true });
    }

    query = query.limit(limit);

    const { data: articles, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum artigo pendente de reprocessamento",
          processed: 0,
          failed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count total pending
    const { count: totalPending } = await supabase
      .from("noticias")
      .select("id", { count: "exact", head: true })
      .eq("publicada", true)
      .or("content_updated.is.null,content_updated.eq.false");

    const { count: totalUpdated } = await supabase
      .from("noticias")
      .select("id", { count: "exact", head: true })
      .eq("publicada", true)
      .eq("content_updated", true);

    const results: Array<{
      id: string;
      titulo: string;
      success: boolean;
      word_count_before: number;
      word_count_after: number;
      error?: string;
    }> = [];

    for (const article of articles) {
      if (!hasTimeLeft()) {
        console.log(
          `Safety timer reached after ${results.length} articles. Stopping.`
        );
        break;
      }

      const wordCountBefore = countWords(article.texto);

      try {
        // Extract match data from the joined relation
        const partida = Array.isArray(article.partida)
          ? article.partida[0]
          : article.partida;

        const timeCasa = partida
          ? Array.isArray(partida.time_casa)
            ? partida.time_casa[0]
            : partida.time_casa
          : null;
        const timeFora = partida
          ? Array.isArray(partida.time_fora)
            ? partida.time_fora[0]
            : partida.time_fora
          : null;
        const liga = partida
          ? Array.isArray(partida.liga)
            ? partida.liga[0]
            : partida.liga
          : null;
        const palpite = partida
          ? Array.isArray(partida.palpite)
            ? partida.palpite[0]
            : partida.palpite
          : null;

        const timeCasaNome = timeCasa?.nome || extractTeamFromTitle(article.titulo, "casa");
        const timeForaNome = timeFora?.nome || extractTeamFromTitle(article.titulo, "fora");
        const ligaNome = liga?.nome || "Campeonato";
        const forcaCasa = palpite?.forca_time_casa || 50;
        const forcaFora = palpite?.forca_time_fora || 50;
        const probCasa = palpite?.prob_casa || 33;
        const probEmpate = palpite?.prob_empate || 34;
        const probFora = palpite?.prob_fora || 33;
        const placarCasa = palpite?.placar_casa_estimado ?? 1;
        const placarFora = palpite?.placar_fora_estimado ?? 1;

        const newContent = await rewriteArticle({
          tituloOriginal: article.titulo,
          conteudoOriginal: article.texto,
          timeCasa: timeCasaNome,
          timeFora: timeForaNome,
          competicao: ligaNome,
          dataPartida: partida?.data || "",
          forcaCasa,
          forcaFora,
          probCasa,
          probEmpate,
          probFora,
          placarCasa,
          placarFora,
          apiKey: OPENAI_API_KEY,
        });

        const wordCountAfter = countWords(newContent.texto);

        // Only update if the new content is substantially better
        if (wordCountAfter < 250) {
          console.warn(
            `Rewritten content too short (${wordCountAfter} words), skipping update`
          );
          results.push({
            id: article.id,
            titulo: article.titulo,
            success: false,
            word_count_before: wordCountBefore,
            word_count_after: wordCountAfter,
            error: "Conteúdo reescrito muito curto",
          });
          continue;
        }

        // Update article in database
        const { error: updateError } = await supabase
          .from("noticias")
          .update({
            texto: newContent.texto,
            resumo: newContent.resumo,
            content_updated: true,
            content_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", article.id);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        results.push({
          id: article.id,
          titulo: article.titulo,
          success: true,
          word_count_before: wordCountBefore,
          word_count_after: wordCountAfter,
        });

        console.log(
          `Reprocessed: "${article.titulo}" (${wordCountBefore} → ${wordCountAfter} words)`
        );

        // Delay between requests
        await new Promise((r) => setTimeout(r, 2000));
      } catch (error) {
        console.error(`Error reprocessing article ${article.id}:`, error);
        results.push({
          id: article.id,
          titulo: article.titulo,
          success: false,
          word_count_before: wordCountBefore,
          word_count_after: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        if (
          error instanceof Error &&
          (error.message.includes("429") || error.message.includes("402"))
        ) {
          break;
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reprocessados ${successCount} de ${results.length} artigos`,
        processed: successCount,
        failed: results.length - successCount,
        results,
        progress: {
          total_updated: (totalUpdated || 0) + successCount,
          total_pending: Math.max((totalPending || 0) - successCount, 0),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in reprocess-articles:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function countWords(text: string): number {
  return text
    .replace(/<[^>]*>/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

function extractTeamFromTitle(titulo: string, side: "casa" | "fora"): string {
  // Try to extract team names from title like "TeamA x TeamB: ..."
  const match = titulo.match(/^(.+?)\s+x\s+(.+?)(?:\s*[:\-–—]|$)/i);
  if (match) {
    return side === "casa" ? match[1].trim() : match[2].trim();
  }
  return side === "casa" ? "Mandante" : "Visitante";
}

interface RewriteParams {
  tituloOriginal: string;
  conteudoOriginal: string;
  timeCasa: string;
  timeFora: string;
  competicao: string;
  dataPartida: string;
  forcaCasa: number;
  forcaFora: number;
  probCasa: number;
  probEmpate: number;
  probFora: number;
  placarCasa: number;
  placarFora: number;
  apiKey: string;
}

async function rewriteArticle(
  params: RewriteParams
): Promise<{ texto: string; resumo: string }> {
  const {
    tituloOriginal,
    conteudoOriginal,
    timeCasa,
    timeFora,
    competicao,
    dataPartida,
    forcaCasa,
    forcaFora,
    probCasa,
    probEmpate,
    probFora,
    placarCasa,
    placarFora,
    apiKey,
  } = params;

  const wordCount = countWords(conteudoOriginal);
  const contentPreview = conteudoOriginal
    .replace(/<[^>]*>/g, "")
    .substring(0, 500);

  const systemPrompt = `Você é um analista esportivo brasileiro de elite, especializado em reescrita editorial de conteúdo esportivo. Seu objetivo é transformar artigos genéricos em análises profundas, únicas e com valor real para o leitor.

REGRAS ABSOLUTAS:
- Reescreva 100% do conteúdo textual — NENHUMA frase do original deve permanecer
- Mantenha o mesmo tema: ${timeCasa} x ${timeFora} pela ${competicao}
- NÃO altere o título, URL ou times envolvidos
- Mínimo 400 palavras no texto final
- Use HTML com tags h2, h3, p, ul, li, strong, em
- PROIBIDO: frases genéricas, repetição de dados sem interpretação, conteúdo superficial
- Tom: natural, analítico, de especialista — sem parecer robótico
- NÃO faça referência a apostas`;

  const userPrompt = `REPROCESSAMENTO DE ARTIGO EXISTENTE

TÍTULO ORIGINAL (manter): ${tituloOriginal}
CONTEÚDO ATUAL (${wordCount} palavras): 
"${contentPreview}..."

DADOS ESTATÍSTICOS:
- ${timeCasa} x ${timeFora}
- Competição: ${competicao}
${dataPartida ? `- Data: ${dataPartida}` : ""}
- Força ${timeCasa}: ${forcaCasa}/100
- Força ${timeFora}: ${forcaFora}/100
- Probabilidades: ${timeCasa} ${probCasa.toFixed(1)}% | Empate ${probEmpate.toFixed(1)}% | ${timeFora} ${probFora.toFixed(1)}%
- Placar mais provável: ${placarCasa} x ${placarFora}

REESCREVA completamente seguindo esta estrutura HTML:

<h2>Introdução: Contexto Real do Confronto</h2>
- Cite os dois times com contexto ESPECÍFICO da competição (150+ palavras)
- PROIBIDO frases genéricas como "jogo promete ser equilibrado"

<h2>Momento das Equipes</h2>
- Desempenho recente com tendências concretas (200+ palavras)
- Compare diretamente usando os dados de força (${forcaCasa} vs ${forcaFora})

<h2>Comparação Técnica: Ataque vs Defesa</h2>
- Eficiência ofensiva e consistência defensiva de cada time (200+ palavras)
- Pontos fortes e fracos com justificativa nos dados

<h2>Fator Mando de Campo</h2>
- Impacto real de jogar em casa/fora (100+ palavras)

<h2>Tendência da Partida</h2>
- Quem chega melhor, justificado com dados (150+ palavras)
- Placar esperado ${placarCasa} x ${placarFora}: por que esse cenário

<h2>Análise Atualizada pelo Aleball</h2>
- Leitura de cenário direta, estilo especialista (100+ palavras)
- "O cenário indica..." com conclusão técnica
- Reforce a autoridade analítica do Aleball

REGRAS CRÍTICAS:
- TODA afirmação deve ter justificativa com dados
- SEMPRE compare os dois times lado a lado
- Conteúdo ÚNICO, sem repetir informações entre seções
- Mínimo 400 palavras no total

Responda APENAS em JSON válido:
{
  "texto": "<h2>...</h2><p>...</p>...",
  "resumo": "meta description atualizada (max 155 chars)"
}`;

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.75,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI rewrite error:", response.status, errorText);
    if (response.status === 429)
      throw new Error("Rate limit exceeded. Try again later.");
    if (response.status === 402)
      throw new Error("Payment required. Add credits.");
    throw new Error(`AI rewrite failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse JSON response with fallback strategies
  let jsonContent = content;

  if (jsonContent.includes("```")) {
    jsonContent = jsonContent.replace(/```(?:json)?\s*\n?/g, "");
  }

  const jsonMatch = jsonContent.match(
    /\{[\s\S]*"texto"[\s\S]*"resumo"[\s\S]*\}/
  );
  if (jsonMatch) {
    jsonContent = jsonMatch[0];
  }

  jsonContent = jsonContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  try {
    return JSON.parse(jsonContent.trim());
  } catch {
    try {
      const cleaned = jsonContent
        .trim()
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
      return JSON.parse(cleaned);
    } catch {
      // Regex extraction fallback
      const textoMatch = jsonContent.match(
        /"texto"\s*:\s*"([\s\S]*?)"\s*,\s*"resumo"/
      );
      const resumoMatch = jsonContent.match(
        /"resumo"\s*:\s*"((?:[^"\\]|\\.)*)"/
      );

      if (textoMatch && resumoMatch) {
        return {
          texto: textoMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
          resumo: JSON.parse(`"${resumoMatch[1]}"`),
        };
      }

      throw new Error("Failed to parse AI rewrite response");
    }
  }
}
