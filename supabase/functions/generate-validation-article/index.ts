import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GEMINI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
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
    console.error("Gemini text generation error:", response.status, errorText);
    if (response.status === 429) throw new Error("Gemini rate limit exceeded. Try again later.");
    if (response.status === 402) throw new Error("Gemini payment required. Check your API credits.");
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
  const placarReal = `${matchData.gols_casa} x ${matchData.gols_fora}`;
  
  const prompt = `Create a professional sports validation/analysis thumbnail:
- Dark modern background with data visualization elements
- Main focus: RESULT comparison concept
- Large scoreboard showing "${placarReal}"
- Subtle check/cross marks suggesting validation
- Team colors as abstract accents: ${matchData.time_casa.cores?.primary || '#1a1a2e'} and ${matchData.time_fora.cores?.primary || '#16213e'}
- Text: "VALIDAÇÃO" or "ANÁLISE PÓS-JOGO" style
- Professional broadcast quality
- 16:9 aspect ratio
- Ultra high resolution
- CRITICAL: Do NOT include any team logos, crests, badges, or shields. Use only abstract geometric shapes and colors.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
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
      const errorText = await response.text();
      console.error("Validation thumbnail generation error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: any) => part?.inlineData?.data);
    const base64Image = imagePart?.inlineData?.data;
    return base64Image ? `data:image/png;base64,${base64Image}` : null;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

async function generateValidationInternalImage(matchData: MatchData, GEMINI_API_KEY: string): Promise<string | null> {
  const prompt = `Create a professional comparison infographic image:
- Modern dark background with gradient
- Split screen concept: PREDICTION vs REALITY
- Abstract data charts on left side (prediction)
- Football result visualization on right (reality)
- Team colors: ${matchData.time_casa.cores?.primary || '#1a1a2e'} and ${matchData.time_fora.cores?.primary || '#16213e'}
- Connecting arrows or comparison elements
- Clean, professional, analytical aesthetic
- No text, pure visual design
- 16:9 aspect ratio
- Modern sports analytics visual style`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
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
      const errorText = await response.text();
      console.error("Validation internal image generation error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: any) => part?.inlineData?.data);
    const base64Image = imagePart?.inlineData?.data;
    return base64Image ? `data:image/png;base64,${base64Image}` : null;
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get optional parameters from request body
    let targetMatchId: string | null = null;
    let hoursAfterMatch = 3;
    let batchLimit = 0; // 0 = no limit (legacy behavior)
    try {
      const body = await req.json();
      targetMatchId = body?.match_id || null;
      hoursAfterMatch = body?.hours_after || 3;
      batchLimit = body?.limit || 0;
    } catch {
      // No body
    }

    const startTime = Date.now();
    const SAFETY_TIMEOUT_MS = 120_000; // 120s safety timer
    function hasTimeLeft(): boolean {
      return (Date.now() - startTime) < SAFETY_TIMEOUT_MS;
    }

    // Get existing validation articles to avoid duplicates
    const { data: existingNews } = await supabaseAdmin
      .from('noticias')
      .select('partida_id')
      .not('partida_id', 'is', null)
      .like('slug', '%validacao-palpites%');

    const existingValidationMatchIds = new Set(existingNews?.map(n => n.partida_id) || []);

    // Count total pending for stats
    const { count: totalWithComparativo } = await supabaseAdmin
      .from('comparativo_resultados')
      .select('*', { count: 'exact', head: true });

    const totalPending = (totalWithComparativo || 0) - existingValidationMatchIds.size;

    // Fetch finished matches that DON'T have validation articles yet
    // Use a smarter query: get comparativo_resultados that are NOT in existing articles
    let matchQuery = supabaseAdmin
      .from('partidas')
      .select(`
        id,
        data,
        hora,
        gols_casa,
        gols_fora,
        time_casa:times!partidas_time_casa_id_fkey(id, nome, slug, cores),
        time_fora:times!partidas_time_fora_id_fkey(id, nome, slug, cores),
        liga:ligas(id, nome, slug),
        palpite:palpites(prob_casa, prob_empate, prob_fora, placar_casa_estimado, placar_fora_estimado, forca_time_casa, forca_time_fora, confianca, analise),
        comparativo:comparativo_resultados(sistema_acertou_resultado, sistema_acertou_placar, resultado_oficial, sistema_resultado_previsto, total_usuarios_palpitaram, usuarios_acertaram_resultado, usuarios_acertaram_placar)
      `)
      .eq('status', 'finished')
      .not('gols_casa', 'is', null)
      .not('gols_fora', 'is', null)
      .order('data', { ascending: false });

    if (targetMatchId) {
      matchQuery = matchQuery.eq('id', targetMatchId);
    }

    // Apply limit for batch processing (fetch more than needed to filter)
    if (batchLimit > 0) {
      matchQuery = matchQuery.limit(batchLimit * 5); // Fetch extra to account for skips
    }

    const { data: matches, error: matchError } = await matchQuery;

    if (matchError) {
      console.error("Error fetching matches:", matchError);
      throw new Error(`Failed to fetch matches: ${matchError.message}`);
    }

    console.log(`Found ${matches?.length || 0} finished matches, ${totalPending} pending validation articles`);

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

        // Generate and upload thumbnail
        let imageUrl: string | null = null;
        const thumbnailBase64 = await generateValidationThumbnail(matchData, GEMINI_API_KEY);
        
        if (thumbnailBase64) {
          imageUrl = await uploadImage(supabaseAdmin, thumbnailBase64, `validation-${match.id}.png`);
          console.log(`Validation thumbnail uploaded: ${imageUrl}`);
        } else {
          imageUrl = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1280&h=720&fit=crop";
        }

        // Generate and upload internal image
        let internalImageUrl: string | null = null;
        const internalImageBase64 = await generateValidationInternalImage(matchData, GEMINI_API_KEY);
        
        if (internalImageBase64) {
          internalImageUrl = await uploadImage(supabaseAdmin, internalImageBase64, `validation-${match.id}-internal.png`);
          console.log(`Validation internal image uploaded: ${internalImageUrl}`);
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

        // Generate slug for validation article
        const slug = generateValidationSlug(
          matchData.time_casa.nome,
          matchData.time_fora.nome,
          matchData.data,
          matchData.liga.nome
        );

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
