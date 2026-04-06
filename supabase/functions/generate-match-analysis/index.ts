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
  time_casa: {
    id: string;
    nome: string;
    cores: { primary: string; secondary: string };
  };
  time_fora: {
    id: string;
    nome: string;
    cores: { primary: string; secondary: string };
  };
  liga: {
    nome: string;
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

function generateSlug(timeCasa: string, timeFora: string, dataJogo: string, liga: string): string {
  // Format date as YYYY-MM-DD
  const date = new Date(dataJogo);
  const dateStr = date.toISOString().split('T')[0];
  
  const text = `${timeCasa} x ${timeFora} ${dateStr} analise estatistica ${liga}`;
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

async function generateLongFormContent(matchData: MatchData, GEMINI_API_KEY: string): Promise<{ titulo: string; resumo: string; texto: string }> {
  const palpite = matchData.palpite;
  const matchDate = new Date(matchData.data).toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const timeCasa = matchData.time_casa.nome;
  const timeFora = matchData.time_fora.nome;
  const liga = matchData.liga.nome;
  const probCasa = palpite?.prob_casa?.toFixed(1) || '33';
  const probEmpate = palpite?.prob_empate?.toFixed(1) || '33';
  const probFora = palpite?.prob_fora?.toFixed(1) || '33';
  const placarCasa = palpite?.placar_casa_estimado || 0;
  const placarFora = palpite?.placar_fora_estimado || 0;
  const forcaCasa = palpite?.forca_time_casa?.toFixed(0) || '50';
  const forcaFora = palpite?.forca_time_fora?.toFixed(0) || '50';
  const confianca = palpite?.confianca?.toFixed(0) || '50';

  const prompt = `Você é um analista esportivo brasileiro experiente e renomado, especialista em análise estatística e tática de futebol. Seu objetivo é gerar uma página de análise pré-jogo para o Statball que pareça escrita por especialista humano, interprete dados de forma útil e aumente o tempo de permanência do leitor.

DADOS COMPLETOS DA PARTIDA:
- Competição: ${liga}
- Data: ${matchDate} às ${matchData.hora?.substring(0, 5) || '00:00'}
- Mandante: ${timeCasa}
- Visitante: ${timeFora}

MÉTRICAS DO SISTEMA DE ANÁLISE:
- Força do ${timeCasa}: ${forcaCasa}/100
- Força do ${timeFora}: ${forcaFora}/100
- Probabilidade vitória ${timeCasa}: ${probCasa}%
- Probabilidade empate: ${probEmpate}%
- Probabilidade vitória ${timeFora}: ${probFora}%
- Placar mais provável: ${placarCasa} x ${placarFora}
- Nível de confiança: ${confianca}%

ESTRUTURA OBRIGATÓRIA DO ARTIGO (HTML com h2, h3, p, ul, li, strong, em):

<h2>Introdução: Contexto Real do Confronto</h2>
- Cite os dois times e a competição com contexto específico
- Explique o momento de cada equipe na competição
- PROIBIDO frases genéricas como "jogo promete ser equilibrado" ou "duas equipes fortes"
- Mínimo 200 palavras

<h2>Momento das Equipes</h2>
- Desempenho recente dos dois times com tendências específicas
- Sequências de vitórias, derrotas, consistência
- Compare diretamente: quem chega melhor e por quê
- Mínimo 250 palavras

<h2>Análise Tática Baseada em Dados</h2>
- Ataque vs defesa de cada equipe (use os dados de força)
- Pontos fortes e fracos com justificativa numérica
- Comportamento tático esperado baseado nas métricas
- Mínimo 300 palavras

<!-- INSERIR CTA PREMIUM AQUI -->
<div class="premium-cta">
<p><strong>Quer análises ainda mais detalhadas?</strong> Usuários do Clube Statball Premium acessam estatísticas avançadas, dados exclusivos e análises complementares de cada confronto.</p>
</div>

<h2>Fator Casa/Fora</h2>
- Impacto real do mando de campo com dados
- Diferenças de desempenho como mandante vs visitante
- Mínimo 150 palavras

<h2>Tendência da Partida</h2>
- Indique qual time chega melhor e JUSTIFIQUE com dados concretos
- Evite cravar resultado absoluto
- Analise o placar previsto ${placarCasa} x ${placarFora} com justificativa matemática
- Discuta cenários alternativos
- Mínimo 250 palavras

<h2>Leitura de Cenário Statball</h2>
- Análise direta estilo especialista em 1-2 parágrafos
- Exemplo: "O cenário indica um jogo com tendência X, principalmente pela Y do time Z, enquanto o time W costuma..."
- Cenário provável: jogo aberto, equilibrado, defensivo, etc.
- Mínimo 150 palavras

<!-- INSERIR CTA FINAL -->
<div class="premium-cta-final">
<p>Esta análise foi gerada pelo sistema de inteligência estatística do Statball. Para acompanhar análises detalhadas de todos os confrontos, conheça o <strong>Clube Statball Premium</strong>.</p>
</div>

REGRAS CRÍTICAS:
- PROIBIDO frases genéricas: "jogo promete ser equilibrado", "duas equipes fortes", "qualquer coisa pode acontecer", "confronto interessante"
- OBRIGATÓRIO sempre comparar os dois times lado a lado
- OBRIGATÓRIO justificar TODA afirmação com dados numéricos
- OBRIGATÓRIO mencionar desempenho recente, ataque e defesa
- Este é um portal de ANÁLISE ESTATÍSTICA, não de apostas
- Nunca faça recomendações de apostas
- Cada seção deve ter conteúdo ÚNICO, sem repetir informações
- Texto total MÍNIMO 1500 palavras
- Tom: linguagem natural, levemente analítica, sem exagero técnico, sem parecer robótico

TÍTULO SEO (máximo 60 caracteres):
- Inclua os nomes dos times e a competição
- Exemplo: "${timeCasa} x ${timeFora}: Análise Estatística - ${liga}"

RESUMO/META DESCRIPTION (máximo 155 caracteres):
- Texto persuasivo para resultados de busca

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
          content: "Você é um analista esportivo brasileiro de elite, especializado em análise estatística de futebol. Seu conteúdo deve parecer escrito por humano especialista, nunca genérico ou automático. Interprete dados — não apenas repita números. Responda sempre em JSON válido com campos titulo, resumo e texto. O texto deve ter no mínimo 1500 palavras." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.75,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway text generation error:", response.status, errorText);
    if (response.status === 429) throw new Error("Rate limit exceeded. Try again later.");
    if (response.status === 402) throw new Error("Credits exhausted. Add funds to workspace.");
    throw new Error(`Text generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse JSON from response - handle markdown code blocks and edge cases
  let jsonContent = content;
  
  // Remove markdown code fences
  if (jsonContent.includes("```")) {
    jsonContent = jsonContent.replace(/```(?:json)?\s*\n?/g, "");
  }
  
  // Try to extract JSON object if surrounded by other text
  const jsonMatch = jsonContent.match(/\{[\s\S]*"titulo"[\s\S]*"resumo"[\s\S]*"texto"[\s\S]*\}/);
  if (jsonMatch) {
    jsonContent = jsonMatch[0];
  }
  
  // Remove control characters that break JSON.parse (except newlines/tabs inside strings)
  jsonContent = jsonContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  
  try {
    return JSON.parse(jsonContent.trim());
  } catch (e) {
    console.error("JSON parse attempt 1 failed, trying cleanup...");
    
    // Second attempt: fix common issues like unescaped newlines in HTML strings
    try {
      const cleaned = jsonContent.trim()
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
      return JSON.parse(cleaned);
    } catch (e2) {
      // Third attempt: manually extract fields with regex
      console.error("JSON parse attempt 2 failed, trying regex extraction...");
      try {
        const tituloMatch = jsonContent.match(/"titulo"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const resumoMatch = jsonContent.match(/"resumo"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const textoMatch = jsonContent.match(/"texto"\s*:\s*"([\s\S]*)"[\s\n\r]*\}$/);
        
        if (tituloMatch && resumoMatch && textoMatch) {
          return {
            titulo: JSON.parse(`"${tituloMatch[1]}"`),
            resumo: JSON.parse(`"${resumoMatch[1]}"`),
            texto: textoMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
          };
        }
      } catch (e3) {
        // Fall through
      }
      
      console.error("All parse attempts failed. Raw content length:", content.length);
      console.error("First 500 chars:", content.substring(0, 500));
      throw new Error("Failed to parse AI response as JSON after multiple attempts");
    }
  }
}

async function generateThumbnail(matchData: MatchData, LOVABLE_API_KEY: string): Promise<string | null> {
  const scene = getSceneForMatch(matchData.id);
  const corCasa = matchData.time_casa.cores?.primary || '#1a365d';
  const corFora = matchData.time_fora.cores?.primary || '#742a2a';
  
  const prompt = `Create a UNIQUE professional sports photograph for a football match preview.

MANDATORY SCENE: ${scene}

VISUAL REQUIREMENTS:
- Photorealistic stadium photograph, NOT illustration or cartoon
- Match preview atmosphere — anticipation, rivalry, pre-game energy
- Dominant colors from the two teams: ${corCasa} (home) and ${corFora} (away)
- These colors should appear in lighting, banners, or atmospheric tints
- Match context: ${matchData.time_casa.nome} vs ${matchData.time_fora.nome} — ${matchData.liga.nome}
- Professional broadcast/cinematic quality with dramatic lighting
- 16:9 aspect ratio, ultra high resolution

CRITICAL RULES:
- Do NOT include any team logos, crests, badges, or shields
- Do NOT include any text, typography, or written words in the image
- Do NOT include any recognizable player faces
- This image MUST be visually unique — different from any other stadium photo
- Use the specific camera angle described in MANDATORY SCENE above`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      console.log("No image in AI response");
      return null;
    }

    return imageUrl.startsWith("data:") ? imageUrl : `data:image/png;base64,${imageUrl}`;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

async function generateInternalImage(matchData: MatchData, LOVABLE_API_KEY: string): Promise<string | null> {
  const scene = getSceneForMatch(matchData.id + "-internal");
  const corCasa = matchData.time_casa.cores?.primary || '#1a365d';
  const corFora = matchData.time_fora.cores?.primary || '#742a2a';

  const prompt = `Create a UNIQUE professional sports analytics photograph.

MANDATORY SCENE: ${scene}

VISUAL REQUIREMENTS:
- Photorealistic tactical/analytical aesthetic
- Team colors: ${corCasa} and ${corFora} as atmospheric tints
- Context: tactical analysis of ${matchData.time_casa.nome} vs ${matchData.time_fora.nome}
- Clean, professional, data-driven aesthetic
- 16:9 aspect ratio, ultra high resolution

CRITICAL: No text, no logos, no player faces. Pure visual design.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("Internal image error:", response.status);
      return null;
    }

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
    // Extract base64 data from data URL
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

    // Get public URL
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

  // Safety timer: stop processing before the 150s platform limit
  const startTime = Date.now();
  const SAFETY_TIMEOUT_MS = 120_000; // 120s, leaving 30s buffer

  function hasTimeLeft(): boolean {
    return (Date.now() - startTime) < SAFETY_TIMEOUT_MS;
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
    let processLimit: number = 3; // Reduced default: each match takes ~60s (text + 2 DALL-E images)
    try {
      const body = await req.json();
      targetMatchId = body?.match_id || null;
      processLimit = body?.limit || 3;
    } catch {
      // No body, process all scheduled matches with default limit
    }

    // Fetch scheduled matches that don't have news yet
    // Expanded to 7 days for better weekend coverage
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    let matchQuery = supabaseAdmin
      .from('partidas')
      .select(`
        id,
        data,
        hora,
        time_casa:times!partidas_time_casa_id_fkey(id, nome, cores),
        time_fora:times!partidas_time_fora_id_fkey(id, nome, cores),
        liga:ligas(id, nome),
        palpite:palpites(prob_casa, prob_empate, prob_fora, placar_casa_estimado, placar_fora_estimado, forca_time_casa, forca_time_fora, confianca)
      `)
      .eq('status', 'scheduled')
      .gte('data', new Date().toISOString().split('T')[0])
      .lte('data', sevenDaysLater.toISOString().split('T')[0])
      .order('data', { ascending: true }); // Prioritize matches closer to today

    if (targetMatchId) {
      matchQuery = supabaseAdmin
        .from('partidas')
        .select(`
          id,
          data,
          hora,
          time_casa:times!partidas_time_casa_id_fkey(id, nome, cores),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, cores),
          liga:ligas(id, nome),
          palpite:palpites(prob_casa, prob_empate, prob_fora, placar_casa_estimado, placar_fora_estimado, forca_time_casa, forca_time_fora, confianca)
        `)
        .eq('id', targetMatchId);
    }

    const { data: matches, error: matchError } = await matchQuery;

    if (matchError) {
      console.error("Error fetching matches:", matchError);
      throw new Error(`Failed to fetch matches: ${matchError.message}`);
    }

    console.log(`Found ${matches?.length || 0} scheduled matches`);

    // Get existing news to avoid duplicates
    const matchIds = matches?.map(m => m.id) || [];
    const { data: existingNews } = await supabaseAdmin
      .from('noticias')
      .select('partida_id')
      .in('partida_id', matchIds);

    const existingMatchIds = new Set(existingNews?.map(n => n.partida_id) || []);

    // Filter matches that already have news
    const matchesWithoutAnalysis = (matches || []).filter(m => !existingMatchIds.has(m.id));

    // For batch mode, process only actionable matches (with prediction + complete relations)
    const actionableMatches = targetMatchId
      ? matchesWithoutAnalysis
      : matchesWithoutAnalysis.filter((match) => {
          const palpite = Array.isArray(match.palpite) ? match.palpite[0] : match.palpite;
          const timeCasa = Array.isArray(match.time_casa) ? match.time_casa[0] : match.time_casa;
          const timeFora = Array.isArray(match.time_fora) ? match.time_fora[0] : match.time_fora;
          const liga = Array.isArray(match.liga) ? match.liga[0] : match.liga;
          return !!palpite && !!timeCasa && !!timeFora && !!liga;
        });

    // Apply processing limit to avoid timeouts
    const limitedMatches = actionableMatches.slice(0, processLimit);

    console.log(`Stats: ${matches?.length || 0} total matches in window, ${matchesWithoutAnalysis.length} without analysis, ${actionableMatches.length} actionable, processing ${limitedMatches.length} (limit: ${processLimit})`);

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
      stats: {
        totalInWindow: matches?.length || 0,
        withoutAnalysis: matchesWithoutAnalysis.length,
        actionableWithoutAnalysis: actionableMatches.length,
        processingLimit: processLimit
      }
    };

    for (const match of limitedMatches) {
      // Check safety timer before processing each match
      if (!hasTimeLeft()) {
        console.log(`Safety timer reached after ${results.created} matches. Stopping gracefully.`);
        break;
      }

      results.processed++;

      // Skip if no prediction data
      const palpite = Array.isArray(match.palpite) ? match.palpite[0] : match.palpite;
      if (!palpite) {
        console.log(`Skipping match ${match.id} - no prediction data`);
        results.skipped++;
        continue;
      }
      // Handle array returns from Supabase joins
      const timeCasa = Array.isArray(match.time_casa) ? match.time_casa[0] : match.time_casa;
      const timeFora = Array.isArray(match.time_fora) ? match.time_fora[0] : match.time_fora;
      const liga = Array.isArray(match.liga) ? match.liga[0] : match.liga;

      if (!timeCasa || !timeFora || !liga) {
        console.log(`Skipping match ${match.id} - missing team or league data`);
        results.skipped++;
        continue;
      }

      const matchData: MatchData = {
        id: match.id,
        data: match.data,
        hora: match.hora,
        time_casa: timeCasa,
        time_fora: timeFora,
        liga: liga,
        palpite: palpite
      };

      try {
        console.log(`Processing match: ${matchData.time_casa.nome} vs ${matchData.time_fora.nome}`);

        // Generate long-form text content
        const textContent = await generateLongFormContent(matchData, GEMINI_API_KEY);
        console.log(`Text generated: ${textContent.titulo} (${textContent.texto.length} chars)`);

        // Generate and upload thumbnail with SEO filename + retry
        let imageUrl: string | null = null;
        const seoFileName = `${slugifyForFile(matchData.time_casa.nome)}-vs-${slugifyForFile(matchData.time_fora.nome)}-${matchData.data}.png`;
        const thumbnailBase64 = await generateThumbnail(matchData, GEMINI_API_KEY);
        
        if (thumbnailBase64) {
          imageUrl = await uploadImage(supabaseAdmin, thumbnailBase64, seoFileName);
          console.log(`Thumbnail uploaded: ${imageUrl}`);
        } else {
          // Retry once after 3s
          console.log("Thumbnail failed, retrying in 3s...");
          await new Promise(r => setTimeout(r, 3000));
          const retryBase64 = await generateThumbnail(matchData, GEMINI_API_KEY);
          if (retryBase64) {
            imageUrl = await uploadImage(supabaseAdmin, retryBase64, seoFileName);
            console.log(`Thumbnail uploaded on retry: ${imageUrl}`);
          } else {
            console.log("Thumbnail retry also failed, saving with null image");
          }
        }
        // NEVER use Unsplash placeholder — null triggers frontend CSS fallback

        // Generate and upload internal image with SEO filename
        let internalImageUrl: string | null = null;
        const internalSeoFileName = `${slugifyForFile(matchData.time_casa.nome)}-vs-${slugifyForFile(matchData.time_fora.nome)}-${matchData.data}-internal.png`;
        const internalImageBase64 = await generateInternalImage(matchData, GEMINI_API_KEY);
        
        if (internalImageBase64) {
          internalImageUrl = await uploadImage(supabaseAdmin, internalImageBase64, internalSeoFileName);
          console.log(`Internal image uploaded: ${internalImageUrl}`);
        }

        // Inject internal image into text if available
        let finalText = textContent.texto;
        if (internalImageUrl) {
          // Find the middle CTA and add image before it
          const ctaIndex = finalText.indexOf('<div class="premium-cta">');
          if (ctaIndex > 0) {
            const imageHtml = `<figure class="internal-image">
              <img src="${internalImageUrl}" alt="Análise estatística do confronto ${matchData.time_casa.nome} x ${matchData.time_fora.nome} pela ${matchData.liga.nome}" loading="lazy" />
              <figcaption>Visualização analítica do confronto ${matchData.time_casa.nome} x ${matchData.time_fora.nome}</figcaption>
            </figure>`;
            finalText = finalText.slice(0, ctaIndex) + imageHtml + finalText.slice(ctaIndex);
          }
        }

        // Generate slug
        const slug = generateSlug(matchData.time_casa.nome, matchData.time_fora.nome, matchData.data, matchData.liga.nome);

        // Insert news article
        const { error: insertError } = await supabaseAdmin
          .from('noticias')
          .insert({
            titulo: textContent.titulo,
            resumo: textContent.resumo,
            texto: finalText,
            imagem_url: imageUrl,
            partida_id: match.id,
            publicada: true,
            data_publicacao: new Date().toISOString(),
            slug: slug
          });

        if (insertError) {
          console.error(`Error inserting news for match ${match.id}:`, insertError);
          results.errors.push(`Match ${match.id}: ${insertError.message}`);
        } else {
          console.log(`News created for match ${match.id} with slug: ${slug}`);
          results.created++;
        }

      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error);
        results.errors.push(`Match ${match.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("Processing complete:", results);

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in generate-match-analysis:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
