import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCENE_VARIANTS = [
  "Vista aérea panorâmica do estádio com torcida ao fundo e iluminação dourada",
  "Perspectiva do nível do gramado com foco no centro do campo e linhas laterais",
  "Ângulo da arquibancada principal com close na torcida e bandeiras coloridas",
  "Vista noturna cinemática com holofotes e neblina atmosférica sobre o campo",
  "Visão lateral do banco de reservas com o campo iluminado ao fundo",
  "Ângulo dramático de trás do gol com a rede em primeiro plano",
  "Vista do alto com padrões geométricos do gramado e sombras longas",
  "Perspectiva do túnel de acesso ao campo com luz no final",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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

  const systemPrompt = `Você é um analista esportivo profissional de elite escrevendo em ${analysisDate}.

CONTEXTO TEMPORAL CRÍTICO:
- Estamos em ${analysisDate}, ANTES do jogo acontecer
- NÃO mencione NADA que aconteceu após esta data
- NÃO revele o resultado do jogo sob nenhuma circunstância
- Use verbos no futuro ao se referir à partida

REGRAS ABSOLUTAS:
- Escreva no MÍNIMO 1200 palavras, idealmente 1500-1800
- Linguagem jornalística profissional em português brasileiro
- NÃO fazer referência a apostas, odds ou casas de apostas
- Conteúdo deve parecer escrito por especialista humano, NUNCA genérico ou automático
- Interprete os dados — NÃO apenas repita números
- PROIBIDO frases genéricas: "jogo promete ser equilibrado", "duas equipes fortes", "qualquer coisa pode acontecer"
- Use estrutura HTML com H2 para seções principais`;

  const userPrompt = `Escreva uma análise pré-jogo completa e diferenciada para o Statball:

DADOS DO CONFRONTO:
- ${timeCasa} x ${timeFora}
- Competição: ${liga}
- Data do jogo: ${matchDate}
${match.rodada ? `- Rodada: ${match.rodada}` : ""}
- Força ${timeCasa}: ${forcaCasa}/100
- Força ${timeFora}: ${forcaFora}/100
- Probabilidades: Vitória ${timeCasa} ${probCasa.toFixed(1)}% | Empate ${probEmpate.toFixed(1)}% | Vitória ${timeFora} ${probFora.toFixed(1)}%
- Placar mais provável: ${placarCasa} x ${placarFora}

ESTRUTURA OBRIGATÓRIA (mínimo 1200 palavras, HTML com h2, h3, p, ul, li, strong, em):

<h2>Introdução: Contexto Real do Confronto</h2>
- Cite ambos os times com contexto específico da competição e momento (200+ palavras)
- Explique por que este confronto é relevante NESTE momento da temporada
- PROIBIDO aberturas genéricas

<h2>Momento das Equipes na ${liga}</h2>
- Desempenho recente de AMBAS as equipes com tendências concretas (250+ palavras)
- Compare diretamente: quem chega melhor e por quê
- Sequências, consistência, motivação

<h2>Análise Tática e Fatores Decisivos</h2>
- Ataque vs defesa de cada equipe usando dados de força (${forcaCasa} vs ${forcaFora}) (250+ palavras)
- Pontos fortes e fracos com justificativa numérica
- Esquemas táticos prováveis e jogadores-chave

<!-- INSERIR IMAGEM: [ALT: Análise tática ${timeCasa} x ${timeFora} - ${liga}] -->

<h2>Fator Casa/Fora e Histórico</h2>
- Impacto do mando de campo com dados (150+ palavras)
- Retrospecto do confronto direto
- Padrões históricos relevantes

<h2>Tendência da Partida e Placar Estimado</h2>
- Indique qual time chega melhor e JUSTIFIQUE com dados (200+ palavras)
- Placar estimado: ${placarCasa} x ${placarFora} com justificativa matemática
- Cenários alternativos prováveis
- NÃO revelar resultado real

<h2>Leitura de Cenário Statball</h2>
- Análise direta estilo especialista (150+ palavras)
- Formato: "O cenário indica um jogo com tendência X, principalmente pela Y do time Z..."
- Cenário provável: ofensivo, defensivo, equilibrado etc.

${relatedLinksHtml ? `\nAdicione ao final do artigo os seguintes links relacionados:\n${relatedLinksHtml}` : ""}

REGRAS CRÍTICAS:
- TODA afirmação deve ser justificada com dados
- SEMPRE compare os dois times lado a lado
- Conteúdo ÚNICO por seção, sem repetir informações
- Tom: natural, analítico, sem parecer robótico
- Mínimo 1200 palavras`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8000,
      temperature: 0.75,
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

async function generateThumbnailWithSeoName(
  match: MatchData,
  supabase: any,
  apiKey: string,
  seoFileName: string
): Promise<string | null> {
  const timeCasa = match.time_casa?.nome || "Time Casa";
  const timeFora = match.time_fora?.nome || "Time Fora";
  const liga = match.liga?.nome || "Campeonato";
  
  const corCasa = match.time_casa?.cores?.primary || "#1a365d";
  const corFora = match.time_fora?.cores?.primary || "#742a2a";

  const scene = SCENE_VARIANTS[hashCode(match.id) % SCENE_VARIANTS.length];

  const prompt = `Create a UNIQUE professional sports photograph for a football match preview.

MANDATORY SCENE: ${scene}

VISUAL REQUIREMENTS:
- Photorealistic stadium photograph, NOT illustration or cartoon
- Match preview atmosphere — anticipation, rivalry, pre-game energy
- Dominant colors from the two teams: ${corCasa} (home) and ${corFora} (away)
- Match context: ${timeCasa} vs ${timeFora} — ${liga}
- Professional broadcast/cinematic quality with dramatic lighting
- 16:9 aspect ratio, ultra high resolution

CRITICAL RULES:
- Do NOT include any team logos, crests, badges, or shields
- Do NOT include any text, typography, or written words
- Do NOT include any recognizable player faces
- This image MUST be visually unique`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("Image generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      console.error("No valid image in AI response");
      return null;
    }

    const base64Image = imageUrl.replace(/^data:image\/[a-z]+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));
    
    const { error: uploadError } = await supabase.storage
      .from("news-thumbnails")
      .upload(seoFileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from("news-thumbnails")
      .getPublicUrl(seoFileName);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return null;
  }
}

async function getRelatedArticles(
  _supabase: any,
  _timeCasaId: string,
  _timeForaId: string,
  _matchDate: string,
  _ligaId: string,
  ligaSlug: string | null,
  timeCasaSlug: string | null,
  timeForaSlug: string | null
): Promise<string[]> {
  // Server-controlled links only — no AI-generated or DB-fetched article lists.
  // This prevents infinite link bloat and keeps articles lightweight.
  const links: string[] = [];

  if (timeCasaSlug) {
    links.push(`<a href="/time/${timeCasaSlug}">Todas análises do time mandante</a>`);
  }
  if (timeForaSlug && timeForaSlug !== timeCasaSlug) {
    links.push(`<a href="/time/${timeForaSlug}">Todas análises do visitante</a>`);
  }
  if (ligaSlug) {
    links.push(`<a href="/campeonato/${ligaSlug}">Mais jogos desta competição</a>`);
  }

  return links;
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
  const geminiApiKey = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("GEMINI_API_KEY");

  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let limit = 1; // Safe default: 1 item per execution
  let leagueId: string | null = null;
  let skipImages = false;

  try {
    const body = await req.json();
    const requestedLimit = Number(body?.limit ?? 2);
    limit = Math.min(MAX_SAFE_LIMIT, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 2));
    leagueId = body?.league_id || null;
    skipImages = body?.skip_images === true;
  } catch {
    // No body, use defaults
  }

  try {
    // Count total actionable matches (finished + have prediction)
    let totalActionable = 0;
    {
      let q = supabase
        .from("partidas")
        .select("id, palpites!inner(partida_id)", { count: "exact", head: true })
        .eq("status", "finished");

      if (leagueId) {
        q = q.eq("liga_id", leagueId);
      }

      const { count } = await q;
      totalActionable = count || 0;
    }

    // Get ALL existing article partida_ids using pagination (avoids 1000-row limit)
    const existingPartidaIds = new Set<string>();
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      let existingQuery = supabase
        .from("noticias")
        .select("partida_id")
        .not("partida_id", "is", null)
        .range(offset, offset + batchSize - 1);


      const { data: batch } = await existingQuery;

      if (!batch || batch.length === 0) break;
      batch.forEach((n: any) => existingPartidaIds.add(n.partida_id));
      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    console.log(`Found ${existingPartidaIds.size} existing articles with partida_id`);

    const pendingMatches = Math.max(totalActionable - existingPartidaIds.size, 0);
    const alreadyProcessed = existingPartidaIds.size;

    // Fetch matches progressively until we have enough actionable items
    const fetchBatchSize = 200;
    let matchOffset = 0;
    let filteredMatches: any[] = [];
    let scannedRows = 0;
    let batchesScanned = 0;
    const maxScanRows = 200_000;

    while (filteredMatches.length < limit && scannedRows < maxScanRows && hasTimeLeft()) {
      batchesScanned++;

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
          )
        `)
        .eq("status", "finished")
        .order("data", { ascending: true })
        .range(matchOffset, matchOffset + fetchBatchSize - 1);

      if (leagueId) {
        query = query.eq("liga_id", leagueId);
      }

      const { data: batchMatches, error: matchError } = await query;

      if (matchError) {
        throw new Error(`Failed to fetch matches: ${matchError.message}`);
      }

      if (!batchMatches || batchMatches.length === 0) break;

      scannedRows += batchMatches.length;

      // Filter out matches that already have articles
      const newFiltered = batchMatches.filter((m: any) => !existingPartidaIds.has(m.id));
      if (newFiltered.length > 0) {
        filteredMatches = filteredMatches.concat(newFiltered);
      }

      if (batchMatches.length < fetchBatchSize) break;
      matchOffset += fetchBatchSize;
    }

    const matchesToProcess = filteredMatches.slice(0, limit);
    console.log(`Found ${filteredMatches.length} matches without articles after scanning ${scannedRows} rows (${batchesScanned} batches)`);

    if (matchesToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma partida pendente para processar",
          created: 0,
          failed: 0,
          progress: {
            total: totalActionable || 0,
            processed: alreadyProcessed,
            remaining: pendingMatches,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ProcessedArticle[] = [];

    for (const match of matchesToProcess) {
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

        // Thumbnail é gerado depois pelo job SVG (admin/imagens → generate-article-card-svg).
        // Aqui salvamos null para não consumir créditos de imagem da Lovable AI.
        const thumbnailUrl: string | null = null;

        // Calculate publication date (2 days before match)
        const publicationDate = calculatePublicationDate(matchData.data);

        // Create slug with full match ID to guarantee uniqueness
        const baseSlug = `${slugify(timeCasa)}-x-${slugify(timeFora)}-${formatDateForSlug(matchData.data)}-analise-pre-jogo`;
        const slug = `${baseSlug}-${matchData.id.slice(0, 12)}`;

        // Insert news article — use slug as unique key, skip on conflict
        const { error: insertError } = await supabase.from("noticias").insert({
          titulo: title,
          resumo: summary,
          texto: content,
          imagem_url: thumbnailUrl,
          slug,
          data_publicacao: publicationDate,
          partida_id: matchData.id,
          publicada: true,
        });

        if (insertError) {
          // If duplicate slug/partida_id, reconcile and move on (prevents infinite retries)
          if (insertError.message.includes("duplicate key") || insertError.code === "23505") {
            console.log(`Duplicate for match ${matchData.id}, reconciling existing article`);

            const { data: existingBySlug } = await supabase
              .from("noticias")
              .select("id, partida_id")
              .eq("slug", slug)
              .maybeSingle();

            if (existingBySlug?.id && !existingBySlug.partida_id) {
              await supabase
                .from("noticias")
                .update({ partida_id: matchData.id })
                .eq("id", existingBySlug.id);
            }

            existingPartidaIds.add(matchData.id);

            results.push({
              partida_id: matchData.id,
              time_casa: timeCasa,
              time_fora: timeFora,
              data: matchData.data,
              word_count: wordCount,
              slug,
              success: true,
            });
            continue;
          }
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
                total: totalActionable || 0,
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
        created: successCount,
        failed: results.length - successCount,
        processed: results,
        progress: {
          total: totalActionable || 0,
          processed: alreadyProcessed + successCount,
          remaining: Math.max(pendingMatches - successCount, 0),
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
