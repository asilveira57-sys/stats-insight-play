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
  
  const prompt = `Você é um analista esportivo brasileiro experiente, especializado em análise estatística e tática de futebol. Escreva como um profissional de redação esportiva de alto nível.

DADOS COMPLETOS DA PARTIDA:
- Competição: ${matchData.liga.nome}
- Data: ${matchDate} às ${matchData.hora?.substring(0, 5) || '00:00'}
- Mandante: ${matchData.time_casa.nome}
- Visitante: ${matchData.time_fora.nome}

MÉTRICAS DO SISTEMA DE ANÁLISE:
- Força do ${matchData.time_casa.nome}: ${palpite?.forca_time_casa?.toFixed(0) || 50}/100
- Força do ${matchData.time_fora.nome}: ${palpite?.forca_time_fora?.toFixed(0) || 50}/100
- Probabilidade vitória ${matchData.time_casa.nome}: ${palpite?.prob_casa?.toFixed(1) || 33}%
- Probabilidade empate: ${palpite?.prob_empate?.toFixed(1) || 33}%
- Probabilidade vitória ${matchData.time_fora.nome}: ${palpite?.prob_fora?.toFixed(1) || 33}%
- Placar mais provável: ${palpite?.placar_casa_estimado || 0} x ${palpite?.placar_fora_estimado || 0}
- Nível de confiança da análise: ${palpite?.confianca?.toFixed(0) || 50}%

INSTRUÇÕES DETALHADAS:

Gere um artigo completo e aprofundado de análise pré-jogo seguindo EXATAMENTE esta estrutura:

1. TÍTULO SEO (máximo 65 caracteres):
- Inclua os nomes dos times
- Mencione "Análise Estatística"
- Inclua a competição
- Exemplo: "${matchData.time_casa.nome} x ${matchData.time_fora.nome}: Análise Estatística da ${matchData.liga.nome}"

2. RESUMO/META DESCRIPTION (máximo 155 caracteres):
- Texto persuasivo para resultados de busca
- Mencione a análise e a competição
- Convide à leitura

3. TEXTO PRINCIPAL (mínimo 1500 palavras):
O artigo DEVE conter as seguintes seções em HTML, usando tags h2, h3, p, ul, li, strong, em:

<h2>Introdução: Contexto do Confronto</h2>
- Apresente o jogo e sua importância no campeonato
- Contextualize o momento de cada equipe
- Explique por que este confronto é relevante
- Mínimo 200 palavras

<h2>Análise Pré-Jogo: Forma Recente das Equipes</h2>
- Desempenho recente de cada time
- Resultados em casa (mandante) e fora (visitante)
- Sequências positivas ou negativas
- Jogadores-chave e desfalques importantes
- Mínimo 250 palavras

<h2>Leitura Estatística do Confronto</h2>
- Explique as métricas de força de cada time
- Analise as probabilidades calculadas
- Compare os números de forma objetiva
- Discuta tendências estatísticas
- Mínimo 300 palavras

<h2>Cenários Táticos Prováveis</h2>
- Como cada time deve se comportar taticamente
- Possíveis formações e estratégias
- Pontos de pressão e vulnerabilidades
- Onde o jogo pode ser decidido
- Mínimo 250 palavras

<!-- INSERIR CTA PREMIUM AQUI -->
<div class="premium-cta">
<p><strong>Quer análises ainda mais detalhadas?</strong> Usuários do Clube Statball Premium acessam estatísticas avançadas, dados exclusivos e análises complementares de cada confronto.</p>
</div>

<h2>Análise do Placar Previsto: ${palpite?.placar_casa_estimado || 0} x ${palpite?.placar_fora_estimado || 0}</h2>
- Justifique matematicamente o placar previsto
- Explique os fatores que levaram a essa projeção
- Discuta cenários alternativos prováveis
- Mínimo 200 palavras

<h2>Fatores Decisivos para o Resultado</h2>
- Mando de campo e torcida
- Calendário e desgaste físico
- Histórico recente do confronto direto
- Importância do jogo para cada equipe
- Mínimo 200 palavras

<h2>Conclusão: O Que os Números Indicam</h2>
- Síntese da análise completa
- Reforce o valor da análise baseada em dados
- Conclusão equilibrada e profissional
- Mínimo 150 palavras

<!-- INSERIR CTA FINAL -->
<div class="premium-cta-final">
<p>Esta análise foi gerada pelo sistema de inteligência estatística do Statball. Para acompanhar análises detalhadas de todos os confrontos e acessar dados avançados, conheça o <strong>Clube Statball Premium</strong>.</p>
</div>

REGRAS IMPORTANTES:
- Este é um portal de ANÁLISE ESTATÍSTICA, não de apostas
- Nunca faça recomendações de apostas
- Use linguagem profissional de jornalismo esportivo
- Evite frases genéricas ou repetitivas
- Cada seção deve ter conteúdo único e aprofundado
- O texto total deve ter pelo menos 1500 palavras
- Use dados concretos sempre que possível
- Inclua as tags HTML corretamente formatadas

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
          content: "Você é um analista esportivo brasileiro especializado em análise estatística de futebol. Gere conteúdo longo, detalhado e profissional. Responda sempre em JSON válido. O texto deve ser extenso e aprofundado, com pelo menos 1500 palavras." 
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
      // Replace literal newlines inside JSON string values with escaped version
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

async function generateThumbnail(matchData: MatchData, GEMINI_API_KEY: string): Promise<string | null> {
  const formattedDate = new Date(matchData.data).toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit',
    year: 'numeric'
  });
  
  const prompt = `Create a professional sports thumbnail image for a football match preview:
- Background: Modern football stadium at night with dramatic lighting and atmosphere
- Dark semi-transparent overlay for text readability
- Main text centered in bold white letters: "${matchData.time_casa.nome} vs ${matchData.time_fora.nome}"
- Below in smaller text: "${formattedDate} - ${matchData.liga.nome}"
- Style: Bold, modern sports broadcast typography
- Use subtle accent colors: ${matchData.time_casa.cores?.primary || '#1a1a2e'} and ${matchData.time_fora.cores?.primary || '#16213e'}
- Professional broadcast quality design
- 16:9 aspect ratio
- Ultra high resolution
- CRITICAL: Do NOT include any team logos, crests, badges, or shields. Use only abstract geometric shapes and colors.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const base64Image = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Image) {
      console.log("No image in DALL-E response");
      return null;
    }

    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

async function generateInternalImage(matchData: MatchData, GEMINI_API_KEY: string): Promise<string | null> {
  const prompt = `Create a professional sports analytics infographic image:
- Modern dark background with subtle gradient
- Football field tactical view with abstract data visualization elements
- Team colors subtly incorporated: ${matchData.time_casa.cores?.primary || '#1a1a2e'} and ${matchData.time_fora.cores?.primary || '#16213e'}
- Statistical charts and graphs overlay (abstract, decorative)
- Clean, professional, data-driven aesthetic
- No text, pure visual design
- 16:9 aspect ratio for blog content
- Modern sports analytics visual style
- Ultra high resolution
- CRITICAL: Do NOT include any team logos, crests, badges, or shields. Use only abstract geometric shapes.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const base64Image = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
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
    const matchesToProcess = (matches || []).filter(m => !existingMatchIds.has(m.id));
    
    // Apply processing limit to avoid timeouts
    const limitedMatches = matchesToProcess.slice(0, processLimit);

    console.log(`Stats: ${matches?.length || 0} total matches in window, ${matchesToProcess.length} without analysis, processing ${limitedMatches.length} (limit: ${processLimit})`);

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
      stats: {
        totalInWindow: matches?.length || 0,
        withoutAnalysis: matchesToProcess.length,
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

        // Generate and upload thumbnail
        let imageUrl: string | null = null;
        const thumbnailBase64 = await generateThumbnail(matchData, GEMINI_API_KEY);
        
        if (thumbnailBase64) {
          imageUrl = await uploadImage(supabaseAdmin, thumbnailBase64, `${match.id}.png`);
          console.log(`Thumbnail uploaded: ${imageUrl}`);
        } else {
          imageUrl = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1280&h=720&fit=crop";
          console.log("Using default thumbnail");
        }

        // Generate and upload internal image
        let internalImageUrl: string | null = null;
        const internalImageBase64 = await generateInternalImage(matchData, GEMINI_API_KEY);
        
        if (internalImageBase64) {
          internalImageUrl = await uploadImage(supabaseAdmin, internalImageBase64, `${match.id}-internal.png`);
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
