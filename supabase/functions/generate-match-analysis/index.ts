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

async function generateTextContent(matchData: MatchData, LOVABLE_API_KEY: string): Promise<{ titulo: string; resumo: string; texto: string }> {
  const palpite = matchData.palpite;
  
  const prompt = `Você é um analista esportivo brasileiro especializado em análise estatística de futebol.

DADOS DA PARTIDA:
- Competição: ${matchData.liga.nome}
- Data: ${new Date(matchData.data).toLocaleDateString('pt-BR')} às ${matchData.hora?.substring(0, 5) || '00:00'}
- Mandante: ${matchData.time_casa.nome} (Força: ${palpite?.forca_time_casa?.toFixed(0) || 50}/100)
- Visitante: ${matchData.time_fora.nome} (Força: ${palpite?.forca_time_fora?.toFixed(0) || 50}/100)

PREVISÃO DO SISTEMA:
- Vitória ${matchData.time_casa.nome}: ${palpite?.prob_casa?.toFixed(1) || 33}%
- Empate: ${palpite?.prob_empate?.toFixed(1) || 33}%
- Vitória ${matchData.time_fora.nome}: ${palpite?.prob_fora?.toFixed(1) || 33}%
- Placar previsto: ${palpite?.placar_casa_estimado || 0} x ${palpite?.placar_fora_estimado || 0}
- Confiança: ${palpite?.confianca?.toFixed(0) || 50}%

TAREFA:
Gere um artigo de análise pré-jogo com:
1. Título SEO (máx 70 chars) - inclua nomes dos times e competição
2. Resumo (máx 160 chars) - meta description otimizada
3. Texto (300-500 palavras) em HTML básico explicando:
   - Contexto do confronto
   - Análise estatística dos times
   - Justificativa matemática para a previsão
   - Fatores que influenciam o placar previsto

IMPORTANTE: Este é um portal de ANÁLISE ESTATÍSTICA, não de apostas.
Foque na matemática e nos dados, sem recomendações de apostas.

Responda APENAS em formato JSON válido:
{
  "titulo": "título aqui",
  "resumo": "resumo aqui",
  "texto": "<h2>...</h2><p>...</p>..."
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é um analista esportivo brasileiro. Responda sempre em JSON válido." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Text generation error:", response.status, errorText);
    throw new Error(`Text generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse JSON from response - handle markdown code blocks
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

async function generateThumbnail(matchData: MatchData, LOVABLE_API_KEY: string): Promise<string | null> {
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
- Ultra high resolution`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          { role: "user", content: prompt }
        ],
        modalities: ["image", "text"]
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

    return imageUrl;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

async function uploadThumbnail(
  supabaseAdmin: any,
  imageBase64: string,
  matchId: string
): Promise<string | null> {
  try {
    // Extract base64 data from data URL
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `${matchId}.png`;
    
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
    console.error("Error uploading thumbnail:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get optional match_id from request body
    let targetMatchId: string | null = null;
    try {
      const body = await req.json();
      targetMatchId = body?.match_id || null;
    } catch {
      // No body, process all scheduled matches
    }

    // Fetch scheduled matches that don't have news yet
    let matchQuery = supabaseAdmin
      .from('partidas')
      .select(`
        id,
        data,
        hora,
        time_casa:times!partidas_time_casa_id_fkey(id, nome, cores),
        time_fora:times!partidas_time_fora_id_fkey(id, nome, cores),
        liga:ligas(nome),
        palpite:palpites(prob_casa, prob_empate, prob_fora, placar_casa_estimado, placar_fora_estimado, forca_time_casa, forca_time_fora, confianca)
      `)
      .eq('status', 'scheduled')
      .gte('data', new Date().toISOString().split('T')[0]);

    if (targetMatchId) {
      matchQuery = matchQuery.eq('id', targetMatchId);
    } else {
      // Get matches for next 3 days
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      matchQuery = matchQuery.lte('data', threeDaysLater.toISOString().split('T')[0]);
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

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const match of (matches || [])) {
      results.processed++;

      // Skip if news already exists for this match
      if (existingMatchIds.has(match.id)) {
        console.log(`Skipping match ${match.id} - news already exists`);
        results.skipped++;
        continue;
      }

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

        // Generate text content
        const textContent = await generateTextContent(matchData, LOVABLE_API_KEY);
        console.log(`Text generated: ${textContent.titulo}`);

        // Generate and upload thumbnail
        let imageUrl: string | null = null;
        const thumbnailBase64 = await generateThumbnail(matchData, LOVABLE_API_KEY);
        
        if (thumbnailBase64) {
          imageUrl = await uploadThumbnail(supabaseAdmin, thumbnailBase64, match.id);
          console.log(`Thumbnail uploaded: ${imageUrl}`);
        } else {
          // Use default stadium image if thumbnail generation fails
          imageUrl = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1280&h=720&fit=crop";
          console.log("Using default thumbnail");
        }

        // Insert news article
        const { error: insertError } = await supabaseAdmin
          .from('noticias')
          .insert({
            titulo: textContent.titulo,
            resumo: textContent.resumo,
            texto: textContent.texto,
            imagem_url: imageUrl,
            partida_id: match.id,
            publicada: true,
            data_publicacao: new Date().toISOString()
          });

        if (insertError) {
          console.error(`Error inserting news for match ${match.id}:`, insertError);
          results.errors.push(`Match ${match.id}: ${insertError.message}`);
        } else {
          console.log(`News created for match ${match.id}`);
          results.created++;
        }

      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error);
        results.errors.push(`Match ${match.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
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
