import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchData {
  id: string;
  data: string;
  hora: string | null;
  rodada: number | null;
  time_casa: { id: string; nome: string; slug: string | null; cores: any } | null;
  time_fora: { id: string; nome: string; slug: string | null; cores: any } | null;
  liga: { id: string; nome: string; slug: string | null; pais: string | null } | null;
  palpite: {
    prob_casa: number | null;
    prob_empate: number | null;
    prob_fora: number | null;
    placar_casa_estimado: number | null;
    placar_fora_estimado: number | null;
    forca_time_casa: number | null;
    forca_time_fora: number | null;
    confianca: number | null;
  } | null;
}

interface ProcessedArticle {
  partida_id: string;
  time_casa: string;
  time_fora: string;
  data: string;
  word_count: number;
  slug: string;
  success: boolean;
  error?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateForSlug(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

function calculatePublicationDate(matchDate: string): string {
  const date = new Date(matchDate);
  date.setDate(date.getDate() - 2);
  return date.toISOString();
}

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
}

async function generateArticleContent(
  match: MatchData,
  relatedLinks: string[],
  apiKey: string
): Promise<{ content: string; title: string; summary: string }> {
  const timeCasa = match.time_casa?.nome || "Time Casa";
  const timeFora = match.time_fora?.nome || "Time Fora";
  const liga = match.liga?.nome || "Campeonato";
  const matchDate = formatDateForDisplay(match.data);
  const pubDate = new Date(match.data);
  pubDate.setDate(pubDate.getDate() - 2);
  const analysisDate = pubDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const palpite = match.palpite || {};
  const probCasa = palpite.prob_casa || 33;
  const probEmpate = palpite.prob_empate || 34;
  const probFora = palpite.prob_fora || 33;
  const placarCasa = palpite.placar_casa_estimado ?? 1;
  const placarFora = palpite.placar_fora_estimado ?? 1;
  const forcaCasa = palpite.forca_time_casa || 50;
  const forcaFora = palpite.forca_time_fora || 50;

  const relatedLinksHtml = relatedLinks.length > 0 
    ? `\n\n<div class="related-matches">\n<h3>Outras Análises dos Times</h3>\n<ul>\n${relatedLinks.map(l => `<li>${l}</li>`).join("\n")}\n</ul>\n</div>`
    : "";

  const systemPrompt = `Você é um analista esportivo profissional escrevendo em ${analysisDate}.

CONTEXTO TEMPORAL CRÍTICO:
- Estamos em ${analysisDate}, ANTES do jogo acontecer
- NÃO mencione NADA que aconteceu após esta data
- NÃO revele o resultado do jogo sob nenhuma circunstância
- Analise baseado APENAS nos dados que existiriam até ${analysisDate}
- Use verbos no futuro ao se referir à partida

REGRAS ABSOLUTAS:
- Escreva no MÍNIMO 1200 palavras, idealmente 1500-1800
- Linguagem jornalística profissional em português brasileiro
- NÃO fazer referência a apostas, odds ou casas de apostas
- NÃO usar clichês excessivos
- Seja analítico e técnico, baseado em dados estatísticos
- Use estrutura HTML com H2 para seções principais`;

  const userPrompt = `Escreva uma análise pré-jogo completa para:

DADOS DO CONFRONTO:
- ${timeCasa} x ${timeFora}
- Competição: ${liga}
- Data do jogo: ${matchDate}
${match.rodada ? `- Rodada: ${match.rodada}` : ""}
- Força ${timeCasa}: ${forcaCasa}/100
- Força ${timeFora}: ${forcaFora}/100
- Probabilidades calculadas: Vitória ${timeCasa} ${probCasa.toFixed(1)}% | Empate ${probEmpate.toFixed(1)}% | Vitória ${timeFora} ${probFora.toFixed(1)}%
- Placar mais provável: ${placarCasa} x ${placarFora}

ESTRUTURA OBRIGATÓRIA DO ARTIGO (mínimo 1200 palavras):

<h2>O Grande Confronto: ${timeCasa} x ${timeFora}</h2>
- Contexto do jogo e sua importância na competição (150+ palavras)
- Situe o leitor no momento da temporada

<h2>Momento das Equipes na ${liga}</h2>
- Análise da forma recente de ambas as equipes (200+ palavras)
- Como chegam para este confronto
- Fatores de motivação

<h2>Histórico do Confronto Direto</h2>
- Retrospecto entre as equipes (150+ palavras)
- Padrões históricos deste clássico/confronto
- Curiosidades relevantes

<h2>Análise Tática e Fatores Decisivos</h2>
- Pontos fortes e fracos de cada equipe (200+ palavras)
- Esquemas táticos prováveis
- Jogadores-chave para a partida

<!-- INSERIR IMAGEM: [ALT: Análise tática ${timeCasa} x ${timeFora} - ${liga}] -->

<h2>O Que os Números Indicam</h2>
- Análise estatística detalhada baseada nas probabilidades (200+ palavras)
- Interpretação dos dados de força das equipes
- Tendências estatísticas

<h2>Cenários Prováveis</h2>
- Possibilidades de resultado (150+ palavras)
- O que cada time precisa fazer para vencer
- Fatores externos (casa, torcida, clima)

<h2>Palpite Estatístico</h2>
- Placar estimado: ${placarCasa} x ${placarFora} com justificativa (150+ palavras)
- Confiança na previsão
- NÃO revelar o resultado real

${relatedLinksHtml ? `\nAdicione ao final do artigo os seguintes links relacionados:\n${relatedLinksHtml}` : ""}

LEMBRE-SE: Mínimo 1200 palavras, use HTML com tags H2, escreva como se estivesse ANTES do jogo acontecer.`;

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) throw new Error(`AI API error 429: Rate limit exceeded`);
    if (response.status === 402) throw new Error(`AI API error 402: Payment required`);
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Generate title (max 60 chars)
  const title = `${timeCasa} x ${timeFora}: Análise - ${liga}`.slice(0, 60);
  
  // Generate meta description (max 155 chars)
  const summary = `Análise completa do confronto ${timeCasa} x ${timeFora} pela ${liga}. Estatísticas, probabilidades e palpite para a partida de ${matchDate}.`.slice(0, 155);

  return { content, title, summary };
}

async function generateThumbnail(
  match: MatchData,
  supabase: any,
  apiKey: string
): Promise<string | null> {
  const timeCasa = match.time_casa?.nome || "Time Casa";
  const timeFora = match.time_fora?.nome || "Time Fora";
  const liga = match.liga?.nome || "Campeonato";
  const matchDate = formatDateForDisplay(match.data);
  
  const corCasa = match.time_casa?.cores?.primary || "#1a365d";
  const corFora = match.time_fora?.cores?.primary || "#742a2a";

  const prompt = `Create a professional sports match preview thumbnail:
- Dramatic stadium atmosphere at night with crowd silhouettes
- Modern sports broadcast visual style with dynamic lighting
- Team colors subtly incorporated: ${corCasa} and ${corFora}
- Abstract geometric patterns suggesting competition
- Professional typography overlay showing: "${timeCasa} vs ${timeFora}"
- Subtitle: "${matchDate} - ${liga}"
- 16:9 aspect ratio, ultra high resolution
- Cinematic lighting with spotlights and lens flares
- CRITICAL: Do NOT include any team logos, crests, badges, shields, or official emblems
- Use abstract shapes, stadium architecture, and atmospheric effects only`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (!response.ok) {
      console.error("Image generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: any) => part?.inlineData?.data);
    const base64Image = imagePart?.inlineData?.data;

    if (!base64Image) {
      console.error("No valid image in Gemini response");
      return null;
    }

    const imageUrl = `data:image/png;base64,${base64Image}`;

    if (!base64Image) {
      console.error("No image data after extraction");
      return null;
    }

    // Extract base64 data and upload to storage
    const imageBuffer = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));
    
    const fileName = `${match.id}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("news-thumbnails")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from("news-thumbnails")
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return null;
  }
}

async function getRelatedArticles(
  supabase: any,
  timeCasaId: string,
  timeForaId: string,
  matchDate: string,
  ligaId: string,
  ligaSlug: string | null,
  timeCasaSlug: string | null,
  timeForaSlug: string | null
): Promise<string[]> {
  const links: string[] = [];

  // Get last 3 matches for each team that have news
  const { data: casaMatches } = await supabase
    .from("noticias")
    .select("slug, titulo")
    .not("partida_id", "is", null)
    .order("data_publicacao", { ascending: false });

  if (casaMatches) {
    for (const article of casaMatches) {
      if (article.slug) {
        links.push(`<a href="/noticias/${article.slug}">${article.titulo}</a>`);
      }
    }
  }

  // Add team pillar links if available
  if (timeCasaSlug) {
    links.push(`<a href="/time/${timeCasaSlug}">Todas análises do time</a>`);
  }
  if (timeForaSlug && timeForaSlug !== timeCasaSlug) {
    links.push(`<a href="/time/${timeForaSlug}">Todas análises do adversário</a>`);
  }

  // Add league pillar link
  if (ligaSlug) {
    links.push(`<a href="/campeonato/${ligaSlug}">Mais jogos desta competição</a>`);
  }

  return links.slice(0, 6); // Max 6 links
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Safety timer to avoid platform timeout (~150s)
  const startTime = Date.now();
  const SAFETY_TIMEOUT_MS = 120_000;
  const MAX_SAFE_LIMIT = 3;

  function hasTimeLeft(): boolean {
    return (Date.now() - startTime) < SAFETY_TIMEOUT_MS;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let limit = 2;
  let leagueId: string | null = null;

  try {
    const body = await req.json();
    const requestedLimit = Number(body?.limit ?? 2);
    limit = Math.min(MAX_SAFE_LIMIT, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 2));
    leagueId = body?.league_id || null;
  } catch {
    // No body, use defaults
  }

  try {
    // Get total counts for progress
    const { count: totalMatches } = await supabase
      .from("partidas")
      .select("*", { count: "exact", head: true })
      .eq("status", "finished");

    let pendingCountQuery = supabase
      .from("partidas")
      .select("id, palpites!inner(id), noticias!left(partida_id)", { count: "exact", head: true })
      .eq("status", "finished")
      .is("noticias.partida_id", null);

    if (leagueId) {
      pendingCountQuery = pendingCountQuery.eq("liga_id", leagueId);
    }

    const { count: pendingMatches } = await pendingCountQuery;
    const alreadyProcessed = Math.max((totalMatches || 0) - (pendingMatches || 0), 0);

    // Get pending matches (without linked article), with predictions, ordered by date ASC
    let query = supabase
      .from("partidas")
      .select(`
        id,
        data,
        hora,
        rodada,
        time_casa:times!partidas_time_casa_id_fkey(id, nome, slug, cores),
        time_fora:times!partidas_time_fora_id_fkey(id, nome, slug, cores),
        liga:ligas!partidas_liga_id_fkey(id, nome, slug, pais),
        palpite:palpites!inner(
          prob_casa,
          prob_empate,
          prob_fora,
          placar_casa_estimado,
          placar_fora_estimado,
          forca_time_casa,
          forca_time_fora,
          confianca
        ),
        noticias:noticias!left(partida_id)
      `)
      .eq("status", "finished")
      .is("noticias.partida_id", null)
      .order("data", { ascending: true })
      .limit(limit);

    if (leagueId) {
      query = query.eq("liga_id", leagueId);
    }

    const { data: matches, error: matchError } = await query;

    if (matchError) {
      throw new Error(`Failed to fetch matches: ${matchError.message}`);
    }

    const matchesToProcess = matches || [];

    if (matchesToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma partida pendente para processar",
          progress: {
            total: totalMatches || 0,
            processed: alreadyProcessed,
            remaining: pendingMatches || 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ProcessedArticle[] = [];

    for (const match of matchesToProcess.slice(0, limit)) {
      if (!hasTimeLeft()) {
        console.log(`Safety timer reached after ${results.length} partidas. Finalizando lote.`);
        break;
      }

      const matchData = match as unknown as MatchData;
      const timeCasa = matchData.time_casa?.nome || "Time Casa";
      const timeFora = matchData.time_fora?.nome || "Time Fora";

      try {
        // Get related links
        const relatedLinks = await getRelatedArticles(
          supabase,
          matchData.time_casa?.id || "",
          matchData.time_fora?.id || "",
          matchData.data,
          matchData.liga?.id || "",
          matchData.liga?.slug || null,
          matchData.time_casa?.slug || null,
          matchData.time_fora?.slug || null
        );

        // Generate article content
        const { content, title, summary } = await generateArticleContent(
          matchData,
          relatedLinks,
          geminiApiKey
        );

        const wordCount = countWords(content);

        // Validate word count
        if (wordCount < 800) {
          console.warn(`Article too short (${wordCount} words), regenerating...`);
          // Could retry here, but for now we'll accept it with a warning
        }

        // Generate thumbnail
        const thumbnailUrl = await generateThumbnail(matchData, supabase, geminiApiKey);

        // Calculate publication date (2 days before match)
        const publicationDate = calculatePublicationDate(matchData.data);

        // Create slug (include match id suffix to guarantee uniqueness)
        const slug = `${slugify(timeCasa)}-x-${slugify(timeFora)}-${formatDateForSlug(matchData.data)}-analise-pre-jogo-${matchData.id.slice(0, 8)}`;

        // Insert news article
        const { error: insertError } = await supabase.from("noticias").insert({
          titulo: title,
          resumo: summary,
          texto: content,
          imagem_url: thumbnailUrl || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200",
          slug,
          data_publicacao: publicationDate,
          partida_id: matchData.id,
          publicada: true,
        });

        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }

        results.push({
          partida_id: matchData.id,
          time_casa: timeCasa,
          time_fora: timeFora,
          data: matchData.data,
          word_count: wordCount,
          slug,
          success: true,
        });

        // Add delay between requests to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error processing match ${matchData.id}:`, error);
        results.push({
          partida_id: matchData.id,
          time_casa: timeCasa,
          time_fora: timeFora,
          data: matchData.data,
          word_count: 0,
          slug: "",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Check for rate limit errors
        if (error instanceof Error && (error.message.includes("429") || error.message.includes("402"))) {
          const successCount = results.filter((r) => r.success).length;
          return new Response(
            JSON.stringify({
              success: false,
              error: "Rate limit ou créditos insuficientes",
              message: "Adicione mais créditos e tente novamente",
              processed: results,
              progress: {
                total: totalMatches || 0,
                processed: alreadyProcessed + successCount,
                remaining: Math.max((pendingMatches || 0) - successCount, 0),
              },
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;

    // Log the operation
    await supabase.from("sync_logs").insert({
      entity_type: "retroactive_articles",
      status: "completed",
      items_processed: results.length,
      items_created: successCount,
      items_failed: results.length - successCount,
      details: {
        matches: results,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processadas ${successCount} de ${results.length} partidas`,
        processed: results,
        progress: {
          total: totalMatches || 0,
          processed: alreadyProcessed + successCount,
          remaining: Math.max((pendingMatches || 0) - successCount, 0),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-retroactive-articles:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
