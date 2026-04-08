import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  hora: string;
  gols_casa: number;
  gols_fora: number;
  time_casa: {
    id: string;
    nome: string;
    slug: string;
    cores: { primary: string; secondary: string };
  };
  time_fora: {
    id: string;
    nome: string;
    slug: string;
    cores: { primary: string; secondary: string };
  };
  liga: {
    id: string;
    nome: string;
    slug: string;
  };
  palpite: {
    prob_casa: number;
    prob_empate: number;
    prob_fora: number;
    placar_casa_estimado: number;
    placar_fora_estimado: number;
    forca_time_casa: number;
    forca_time_fora: number;
    confianca: number;
    analise: string;
  } | null;
  comparativo: {
    sistema_acertou_resultado: boolean;
    sistema_acertou_placar: boolean;
    resultado_oficial: string;
    sistema_resultado_previsto: string;
    total_usuarios_palpitaram: number;
    usuarios_acertaram_resultado: number;
    usuarios_acertaram_placar: number;
  } | null;
}

function slugifyForFile(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function generateValidationSlug(timeCasa: string, timeFora: string, dataJogo: string, liga: string): string {
  const date = new Date(dataJogo);
  const dateStr = date.toISOString().split('T')[0];
  
  const text = `${timeCasa} x ${timeFora} ${dateStr} validacao palpites ${liga}`;
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function getResultLabel(resultado: string): string {
  switch (resultado) {
    case 'casa': return 'vitória do mandante';
    case 'fora': return 'vitória do visitante';
    case 'empate': return 'empate';
    default: return resultado;
  }
}

async function generateValidationContent(matchData: MatchData, GEMINI_API_KEY: string): Promise<{ titulo: string; resumo: string; texto: string }> {
  const palpite = matchData.palpite;
  const comparativo = matchData.comparativo;
  
  const matchDate = new Date(matchData.data).toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const placarReal = `${matchData.gols_casa} x ${matchData.gols_fora}`;
  const placarPrevisto = `${palpite?.placar_casa_estimado || 0} x ${palpite?.placar_fora_estimado || 0}`;
  
  const resultadoReal = getResultLabel(comparativo?.resultado_oficial || '');
  const resultadoPrevisto = getResultLabel(comparativo?.sistema_resultado_previsto || '');
  
  const acertouResultado = comparativo?.sistema_acertou_resultado ? 'SIM' : 'NÃO';
  const acertouPlacar = comparativo?.sistema_acertou_placar ? 'SIM' : 'NÃO';
  
  // Calculate user consensus prediction (most common result among users)
  const totalUsuarios = comparativo?.total_usuarios_palpitaram || 0;
  const usuariosAcertaramResultado = comparativo?.usuarios_acertaram_resultado || 0;
  const taxaAcertoUsuarios = totalUsuarios > 0 ? ((usuariosAcertaramResultado / totalUsuarios) * 100).toFixed(1) : '0';

  const prompt = `Você é um analista esportivo brasileiro experiente. Escreva um artigo de VALIDAÇÃO PÓS-JOGO, analisando como foi a previsão do sistema em comparação com o resultado real.

DADOS DO JOGO ENCERRADO:
- Competição: ${matchData.liga.nome}
- Data: ${matchDate}
- Mandante: ${matchData.time_casa.nome}
- Visitante: ${matchData.time_fora.nome}
- PLACAR FINAL REAL: ${placarReal}
- RESULTADO: ${resultadoReal}

PREVISÃO DA IA (PRÉ-JOGO):
- Placar previsto: ${placarPrevisto}
- Resultado previsto: ${resultadoPrevisto}
- Probabilidade do resultado previsto: ${palpite?.prob_casa?.toFixed(1) || 33}% casa / ${palpite?.prob_empate?.toFixed(1) || 33}% empate / ${palpite?.prob_fora?.toFixed(1) || 33}% fora
- Força ${matchData.time_casa.nome}: ${palpite?.forca_time_casa?.toFixed(0) || 50}/100
- Força ${matchData.time_fora.nome}: ${palpite?.forca_time_fora?.toFixed(0) || 50}/100
- Confiança da análise: ${palpite?.confianca?.toFixed(0) || 50}%

VALIDAÇÃO:
- IA acertou o resultado? ${acertouResultado}
- IA acertou o placar exato? ${acertouPlacar}
- Total de usuários que palpitaram: ${totalUsuarios}
- Taxa de acerto dos usuários: ${taxaAcertoUsuarios}%

INSTRUÇÕES:

Gere um artigo de validação pós-jogo com EXATAMENTE esta estrutura:

1. TÍTULO SEO (máximo 70 caracteres):
Exemplo: "${matchData.time_casa.nome} x ${matchData.time_fora.nome}: IA, equipe e resultado — análise completa"

2. RESUMO/META DESCRIPTION (máximo 155 caracteres):
Texto persuasivo comparando previsão x realidade

3. TEXTO PRINCIPAL (mínimo 1500 palavras) com as seguintes seções em HTML:

<h2>Introdução: O Confronto Que Aconteceu</h2>
- Apresente o jogo e o contexto
- Mencione que este post analisa previsões x realidade
- Contextualize a importância do confronto
- Mínimo 200 palavras

<h2>O Palpite da IA: O Que os Números Diziam</h2>
- Explique detalhadamente qual foi o palpite da IA antes do jogo
- Apresente a justificativa estatística
- Discuta a confiança e probabilidades
- Linguagem analítica, sem promessas
- Mínimo 250 palavras

<h2>A Leitura da Equipe Statball</h2>
- Apresente a perspectiva humana da análise
- Discuta fatores qualitativos que a IA pode não capturar
- Mencione contexto tático e emocional
- Diferenças entre leitura humana e algoritmo
- Mínimo 200 palavras

<!-- INSERIR IMAGEM INTERNA -->

<h2>O Resultado Oficial: ${placarReal}</h2>
- Descreva o que aconteceu na partida
- Pontos-chave do jogo
- Momentos decisivos
- Resumo do desempenho das equipes
- Mínimo 200 palavras

<!-- INSERIR AD SLOT 1 -->

<h2>Validação Completa: Comparando Previsão e Realidade</h2>
- Análise detalhada: onde a IA acertou
- Onde a IA errou e por quê
- Fatores não previsíveis que influenciaram
- O que os dados ensinaram sobre este confronto
- Este é o bloco CENTRAL do artigo, mínimo 350 palavras

<!-- INSERIR CTA PREMIUM -->
<div class="premium-cta">
<p><strong>Membros do Clube Statball</strong> acompanham análises completas de validação como esta, com métricas avançadas e histórico de acertos.</p>
</div>

<h2>Aprendizados do Confronto</h2>
- O que os dados ensinam para futuros confrontos
- Como a IA pode melhorar
- Valor da complementaridade entre análise humana e algoritmo
- Insights para jogos similares
- Mínimo 200 palavras

<h2>Conclusão: O Valor da Transparência</h2>
- Síntese da análise de validação
- Reforce o compromisso com transparência
- Importância de aprender com acertos e erros
- Mínimo 150 palavras

<!-- INSERIR CTA FINAL -->
<div class="premium-cta-final">
<p>Esta análise de validação foi gerada pelo Statball. Para acompanhar todas as comparações entre previsões e resultados reais, conheça o <strong>Clube Statball Premium</strong> — onde dados e transparência caminham juntos.</p>
</div>

REGRAS IMPORTANTES:
- Este é um portal de ANÁLISE ESTATÍSTICA, não de apostas
- Nunca mencione apostas ou recomendações de apostas
- Use linguagem profissional e transparente
- Seja honesto sobre acertos e erros
- O texto deve ter pelo menos 1500 palavras
- Inclua as tags HTML corretamente

Responda APENAS em formato JSON válido:
{
  "titulo": "título SEO aqui",
  "resumo": "meta description aqui",
  "texto": "<h2>...</h2><p>...</p>..."
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GEMINI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { 
          role: "system", 
          content: "Você é um analista esportivo brasileiro especializado em validação de previsões. Gere conteúdo profissional, transparente e educativo. Responda sempre em JSON válido." 
        },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI text generation error:", response.status, errorText);
    if (response.status === 429) throw new Error("Rate limit exceeded. Try again later.");
    if (response.status === 402) throw new Error("Credits exhausted. Add funds.");
    throw new Error(`Text generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in AI response");
  }

  let jsonContent = content;
  if (content.includes("```json")) {
    jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  } else if (content.includes("```")) {
    jsonContent = content.replace(/```\n?/g, "");
  }
  
  try {
    return JSON.parse(jsonContent.trim());
  } catch (e) {
    console.error("Failed to parse AI response:", jsonContent);
    throw new Error("Failed to parse AI response as JSON");
  }
}

async function generateValidationThumbnail(matchData: MatchData, GEMINI_API_KEY: string): Promise<string | null> {
  const scene = SCENE_VARIANTS[hashCode(matchData.id + "-val") % SCENE_VARIANTS.length];
  const corCasa = matchData.time_casa.cores?.primary || '#1a1a2e';
  const corFora = matchData.time_fora.cores?.primary || '#16213e';
  
  const prompt = `Create a UNIQUE professional post-match analysis photograph.

MANDATORY SCENE: ${scene}

VISUAL REQUIREMENTS:
- Photorealistic stadium photograph with post-match atmosphere
- Results/validation mood — final whistle moment, empty pitch after game
- Team colors: ${corCasa} and ${corFora} as atmospheric lighting
- Context: ${matchData.time_casa.nome} ${matchData.gols_casa} x ${matchData.gols_fora} ${matchData.time_fora.nome}
- 16:9 aspect ratio, ultra high resolution

CRITICAL: No text, no logos, no player faces. Pure photographic scene.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("Validation thumbnail error:", response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) return null;
    return imageUrl.startsWith("data:") ? imageUrl : `data:image/png;base64,${imageUrl}`;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

async function generateValidationInternalImage(matchData: MatchData, GEMINI_API_KEY: string): Promise<string | null> {
  const scene = SCENE_VARIANTS[hashCode(matchData.id + "-val-int") % SCENE_VARIANTS.length];
  const corCasa = matchData.time_casa.cores?.primary || '#1a1a2e';
  const corFora = matchData.time_fora.cores?.primary || '#16213e';

  const prompt = `Create a UNIQUE professional sports analytics photograph.

MANDATORY SCENE: ${scene}

VISUAL REQUIREMENTS:
- Photorealistic analytical/tactical aesthetic
- Team colors: ${corCasa} and ${corFora}
- Post-match analysis context
- 16:9 aspect ratio, ultra high resolution

CRITICAL: No text, no logos, no player faces.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) return null;
    return imageUrl.startsWith("data:") ? imageUrl : `data:image/png;base64,${imageUrl}`;
  } catch (error) {
    console.error("Error generating internal image:", error);
    return null;
  }
}

async function uploadImage(
  supabaseAdmin: any,
  imageBase64: string,
  fileName: string
): Promise<string | null> {
  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const { data, error } = await supabaseAdmin.storage
      .from('news-thumbnails')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('news-thumbnails')
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get optional parameters from request body
    let targetMatchId: string | null = null;
    let hoursAfterMatch = 3;
    let batchLimit = 1; // Safe default: 1 item per execution
    let skipImages = false; // skip image generation for speed in batch mode
    try {
      const body = await req.json();
      targetMatchId = body?.match_id || null;
      hoursAfterMatch = body?.hours_after || 3;
      batchLimit = body?.limit || 0;
      skipImages = body?.skip_images === true; // only skip if explicitly requested
    } catch {
      // No body
    }

    const startTime = Date.now();
    const SAFETY_TIMEOUT_MS = 120_000; // 120s safety timer
    function hasTimeLeft(): boolean {
      return (Date.now() - startTime) < SAFETY_TIMEOUT_MS;
    }

    // === PAGINATED FETCH: Get ALL existing validation article partida_ids ===
    const existingValidationMatchIds = new Set<string>();
    {
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data: batch } = await supabaseAdmin
          .from('noticias')
          .select('partida_id')
          .not('partida_id', 'is', null)
          .like('slug', '%validacao-palpites%')
          .range(offset, offset + pageSize - 1);

        if (batch && batch.length > 0) {
          for (const n of batch) existingValidationMatchIds.add(n.partida_id);
          offset += pageSize;
          if (batch.length < pageSize) hasMore = false;
        } else {
          hasMore = false;
        }
      }
    }
    console.log(`Found ${existingValidationMatchIds.size} existing validation articles`);

    // Count total comparativos for stats
    const { count: totalWithComparativo } = await supabaseAdmin
      .from('comparativo_resultados')
      .select('*', { count: 'exact', head: true });

    const totalPending = (totalWithComparativo || 0) - existingValidationMatchIds.size;

    // === PROGRESSIVE SCANNING: Find matches that need validation articles ===
    let matches: any[] = [];

    if (targetMatchId) {
      // Single match mode
      const { data, error } = await supabaseAdmin
        .from('partidas')
        .select(`
          id, data, hora, gols_casa, gols_fora,
          time_casa:times!partidas_time_casa_id_fkey(id, nome, slug, cores),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, slug, cores),
          liga:ligas(id, nome, slug),
          palpite:palpites(prob_casa, prob_empate, prob_fora, placar_casa_estimado, placar_fora_estimado, forca_time_casa, forca_time_fora, confianca, analise),
          comparativo:comparativo_resultados(sistema_acertou_resultado, sistema_acertou_placar, resultado_oficial, sistema_resultado_previsto, total_usuarios_palpitaram, usuarios_acertaram_resultado, usuarios_acertaram_placar)
        `)
        .eq('id', targetMatchId);
      if (error) throw new Error(`Failed to fetch match: ${error.message}`);
      matches = data || [];
    } else {
      // Progressive scan: fetch comparativo_resultados in batches, skip already-covered
      const needed = batchLimit > 0 ? batchLimit : 10;
      let scanOffset = 0;
      const scanBatch = 500;
      const maxScanRows = 50000;

      while (matches.length < needed && scanOffset < maxScanRows && hasTimeLeft()) {
        const { data: compBatch, error: compErr } = await supabaseAdmin
          .from('comparativo_resultados')
          .select('partida_id')
          .range(scanOffset, scanOffset + scanBatch - 1);

        if (compErr || !compBatch || compBatch.length === 0) break;

        // Filter to IDs not yet covered
        const pendingIds = compBatch
          .map(c => c.partida_id)
          .filter(id => !existingValidationMatchIds.has(id));

        if (pendingIds.length > 0) {
          // Fetch only the needed amount of full match data
          const idsToFetch = pendingIds.slice(0, needed - matches.length);
          const { data: matchBatch, error: matchErr } = await supabaseAdmin
            .from('partidas')
            .select(`
              id, data, hora, gols_casa, gols_fora,
              time_casa:times!partidas_time_casa_id_fkey(id, nome, slug, cores),
              time_fora:times!partidas_time_fora_id_fkey(id, nome, slug, cores),
              liga:ligas(id, nome, slug),
              palpite:palpites(prob_casa, prob_empate, prob_fora, placar_casa_estimado, placar_fora_estimado, forca_time_casa, forca_time_fora, confianca, analise),
              comparativo:comparativo_resultados(sistema_acertou_resultado, sistema_acertou_placar, resultado_oficial, sistema_resultado_previsto, total_usuarios_palpitaram, usuarios_acertaram_resultado, usuarios_acertaram_placar)
            `)
            .in('id', idsToFetch)
            .eq('status', 'finished')
            .not('gols_casa', 'is', null)
            .not('gols_fora', 'is', null);

          if (!matchErr && matchBatch) {
            matches.push(...matchBatch);
          }
        }

        scanOffset += scanBatch;
        if (compBatch.length < scanBatch) break;
      }
    }

    console.log(`Progressive scan found ${matches.length} actionable matches, ${totalPending} pending total`);

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
      articles: [] as { slug: string; titulo: string; timeCasa: string; timeFora: string; data: string }[],
      stats: {
        totalWithComparativo: totalWithComparativo || 0,
        withValidation: existingValidationMatchIds.size,
        pending: totalPending
      }
    };

    for (const match of (matches || [])) {
      // Safety timer check
      if (!hasTimeLeft()) {
        console.log(`Safety timer reached after ${results.created} articles. Stopping.`);
        break;
      }

      // Batch limit check
      if (batchLimit > 0 && results.created >= batchLimit) {
        console.log(`Batch limit of ${batchLimit} reached. Stopping.`);
        break;
      }

      results.processed++;

      // Skip if validation article already exists
      if (existingValidationMatchIds.has(match.id)) {
        console.log(`Skipping match ${match.id} - validation article already exists`);
        results.skipped++;
        continue;
      }

      // Handle array returns from Supabase joins
      const palpite = Array.isArray(match.palpite) ? match.palpite[0] : match.palpite;
      const comparativo = Array.isArray(match.comparativo) ? match.comparativo[0] : match.comparativo;
      const timeCasa = Array.isArray(match.time_casa) ? match.time_casa[0] : match.time_casa;
      const timeFora = Array.isArray(match.time_fora) ? match.time_fora[0] : match.time_fora;
      const liga = Array.isArray(match.liga) ? match.liga[0] : match.liga;

      // Skip if no prediction or comparison data
      if (!palpite || !comparativo) {
        console.log(`Skipping match ${match.id} - no prediction or comparison data`);
        results.skipped++;
        continue;
      }

      if (!timeCasa || !timeFora || !liga) {
        console.log(`Skipping match ${match.id} - missing team or league data`);
        results.skipped++;
        continue;
      }

      const matchData: MatchData = {
        id: match.id,
        data: match.data,
        hora: match.hora,
        gols_casa: match.gols_casa,
        gols_fora: match.gols_fora,
        time_casa: timeCasa,
        time_fora: timeFora,
        liga: liga,
        palpite: palpite,
        comparativo: comparativo
      };

      try {
        console.log(`Processing validation for: ${matchData.time_casa.nome} vs ${matchData.time_fora.nome} (${matchData.gols_casa}-${matchData.gols_fora})`);

        // Generate validation content
        const textContent = await generateValidationContent(matchData, GEMINI_API_KEY);
        console.log(`Validation text generated: ${textContent.titulo} (${textContent.texto.length} chars)`);

        // Generate and upload thumbnail with SEO filename
        let imageUrl: string | null = null;
        if (!skipImages) {
          const seoFileName = `validation-${slugifyForFile(matchData.time_casa.nome)}-vs-${slugifyForFile(matchData.time_fora.nome)}-${matchData.data}.png`;
          const thumbnailBase64 = await generateValidationThumbnail(matchData, GEMINI_API_KEY);
          if (thumbnailBase64) {
            imageUrl = await uploadImage(supabaseAdmin, thumbnailBase64, seoFileName);
            console.log(`Validation thumbnail uploaded: ${imageUrl}`);
          } else {
            // Retry once after 3s delay
            console.log("Thumbnail generation failed, retrying in 3s...");
            await new Promise(r => setTimeout(r, 3000));
            const retryBase64 = await generateValidationThumbnail(matchData, GEMINI_API_KEY);
            if (retryBase64) {
              imageUrl = await uploadImage(supabaseAdmin, retryBase64, seoFileName);
              console.log(`Validation thumbnail uploaded on retry: ${imageUrl}`);
            } else {
              console.log("Thumbnail retry also failed, saving with null image");
            }
          }
        }
        // NEVER use Unsplash placeholder — null triggers frontend CSS fallback

        // Generate and upload internal image with SEO filename
        let internalImageUrl: string | null = null;
        if (!skipImages) {
          const internalSeoFileName = `validation-${slugifyForFile(matchData.time_casa.nome)}-vs-${slugifyForFile(matchData.time_fora.nome)}-${matchData.data}-internal.png`;
          const internalImageBase64 = await generateValidationInternalImage(matchData, GEMINI_API_KEY);
          if (internalImageBase64) {
            internalImageUrl = await uploadImage(supabaseAdmin, internalImageBase64, internalSeoFileName);
            console.log(`Validation internal image uploaded: ${internalImageUrl}`);
          }
        }

        // Build internal links
        const timeACasaLink = timeCasa.slug ? `/time/${timeCasa.slug}` : null;
        const timeForaLink = timeFora.slug ? `/time/${timeFora.slug}` : null;
        const ligaLink = liga.slug ? `/campeonato/${liga.slug}` : null;

        // Find pre-match analysis article
        const { data: preMatchArticle } = await supabaseAdmin
          .from('noticias')
          .select('slug')
          .eq('partida_id', match.id)
          .like('slug', '%analise-estatistica%')
          .single();

        const preMatchLink = preMatchArticle?.slug ? `/noticias/${preMatchArticle.slug}` : null;

        // Inject images and internal links into text
        let finalText = textContent.texto;
        
        // Inject internal image
        if (internalImageUrl) {
          const imageHtml = `<figure class="internal-image">
            <img src="${internalImageUrl}" alt="Comparação entre palpite da IA e resultado real em ${matchData.time_casa.nome} x ${matchData.time_fora.nome}" loading="lazy" />
            <figcaption>Análise comparativa: previsão vs resultado real</figcaption>
          </figure>`;
          finalText = finalText.replace('<!-- INSERIR IMAGEM INTERNA -->', imageHtml);
        }

        // Inject ad slot placeholder
        finalText = finalText.replace('<!-- INSERIR AD SLOT 1 -->', '<div class="ad-slot" data-position="article-mid"></div>');

        // Add internal links section at the end
        let linksSection = '<div class="internal-links"><h3>Conteúdos Relacionados</h3><ul>';
        
        if (preMatchLink) {
          linksSection += `<li><a href="${preMatchLink}">📊 Análise pré-jogo: ${matchData.time_casa.nome} x ${matchData.time_fora.nome}</a></li>`;
        }
        if (timeACasaLink) {
          linksSection += `<li><a href="${timeACasaLink}">⚽ Página do ${matchData.time_casa.nome}</a></li>`;
        }
        if (timeForaLink) {
          linksSection += `<li><a href="${timeForaLink}">⚽ Página do ${matchData.time_fora.nome}</a></li>`;
        }
        if (ligaLink) {
          linksSection += `<li><a href="${ligaLink}">🏆 ${matchData.liga.nome}</a></li>`;
        }
        
        linksSection += '</ul></div>';
        
        // Insert before final CTA
        finalText = finalText.replace('<div class="premium-cta-final">', linksSection + '<div class="premium-cta-final">');

        // Generate slug for validation article (with match ID suffix for uniqueness)
        const baseSlug = generateValidationSlug(
          matchData.time_casa.nome,
          matchData.time_fora.nome,
          matchData.data,
          matchData.liga.nome
        );
        const slug = `${baseSlug}-${match.id.slice(0, 8)}`;

        // Insert validation article
        const { error: insertError } = await supabaseAdmin
          .from('noticias')
          .insert({
            titulo: textContent.titulo,
            resumo: textContent.resumo,
            texto: finalText,
            imagem_url: imageUrl,
            slug: slug,
            partida_id: match.id,
            publicada: true,
            data_publicacao: new Date().toISOString()
          });

        if (insertError) {
          // Handle duplicate slug gracefully
          if (insertError.message?.includes('duplicate key') || insertError.code === '23505') {
            console.log(`Skipping match ${match.id} - duplicate slug: ${slug}`);
            results.skipped++;
            continue;
          }
          console.error(`Error inserting validation article for match ${match.id}:`, insertError);
          results.errors.push(`Match ${match.id}: ${insertError.message}`);
          continue;
        }

        console.log(`Validation article created: ${slug}`);
        results.created++;
        results.articles.push({
          slug,
          titulo: textContent.titulo,
          timeCasa: matchData.time_casa.nome,
          timeFora: matchData.time_fora.nome,
          data: matchData.data
        });

        // Update pending count
        results.stats.pending = Math.max(0, results.stats.pending - 1);
        results.stats.withValidation++;

      } catch (matchError) {
        const errorMessage = matchError instanceof Error ? matchError.message : String(matchError);
        console.error(`Error processing validation for match ${match.id}:`, errorMessage);
        results.errors.push(`Match ${match.id}: ${errorMessage}`);

        // CIRCUIT BREAKER: stop immediately on 402/429 — no point retrying
        if (errorMessage.includes('Credits exhausted') || errorMessage.includes('Rate limit')) {
          console.error(`CIRCUIT BREAKER: ${errorMessage}. Stopping all processing.`);
          (results as any).circuit_breaker = errorMessage;
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} matches, created ${results.created} validation articles`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in generate-validation-article:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
