import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isContentGenerationEnabled, disabledResponse } from "../_shared/killswitch.ts";

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

interface WeeklyData {
  weekNumber: number;
  year: number;
  league: {
    id: string;
    nome: string;
    slug: string;
  };
  totalMatches: number;
  iaStats: {
    acertosResultado: number;
    acertosPlacar: number;
    taxaResultado: number;
    taxaPlacar: number;
  };
  humanosStats: {
    totalPalpites: number;
    acertosResultado: number;
    acertosPlacar: number;
    taxaResultado: number;
    taxaPlacar: number;
  };
  keyMatches: Array<{
    timeCasa: string;
    timeFora: string;
    placar: string;
    iaAcertou: boolean;
    validationSlug: string | null;
  }>;
  startDate: string;
  endDate: string;
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getWeekDates(weekNumber: number, year: number): { start: Date; end: Date } {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (weekNumber - 1) * 7 - firstDayOfYear.getDay();
  const start = new Date(year, 0, 1 + daysOffset);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return { start, end };
}

function generateWeeklySlug(weekNumber: number, year: number, leagueSlug: string): string {
  return `validacao-semana-${weekNumber}-temporada-${year}-${leagueSlug}`;
}

async function generateWeeklyContent(weeklyData: WeeklyData, GEMINI_API_KEY: string): Promise<{ titulo: string; resumo: string; texto: string }> {
  const startDate = new Date(weeklyData.startDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const endDate = new Date(weeklyData.endDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const keyMatchesSummary = weeklyData.keyMatches
    .slice(0, 5)
    .map(m => `- ${m.timeCasa} ${m.placar} ${m.timeFora} (IA ${m.iaAcertou ? 'acertou' : 'errou'})`)
    .join('\n');

  const prompt = `Você é um editor esportivo brasileiro experiente. Escreva um BOLETIM SEMANAL DE VALIDAÇÃO, resumindo e analisando as previsões da semana.

DADOS DA SEMANA ${weeklyData.weekNumber} (${startDate} a ${endDate}):
- Campeonato: ${weeklyData.league.nome}
- Temporada: ${weeklyData.year}
- Total de jogos analisados: ${weeklyData.totalMatches}

DESEMPENHO DA IA NA SEMANA:
- Acertos de resultado: ${weeklyData.iaStats.acertosResultado} de ${weeklyData.totalMatches} (${weeklyData.iaStats.taxaResultado.toFixed(1)}%)
- Acertos de placar exato: ${weeklyData.iaStats.acertosPlacar} de ${weeklyData.totalMatches} (${weeklyData.iaStats.taxaPlacar.toFixed(1)}%)

DESEMPENHO DOS USUÁRIOS NA SEMANA:
- Total de palpites: ${weeklyData.humanosStats.totalPalpites}
- Taxa de acerto de resultado: ${weeklyData.humanosStats.taxaResultado.toFixed(1)}%
- Taxa de acerto de placar: ${weeklyData.humanosStats.taxaPlacar.toFixed(1)}%

JOGOS-CHAVE DA SEMANA:
${keyMatchesSummary}

INSTRUÇÕES:

Gere um artigo de validação semanal com EXATAMENTE esta estrutura:

1. TÍTULO SEO (máximo 70 caracteres):
Exemplo: "Validação da Semana ${weeklyData.weekNumber} — IA x Humanos na ${weeklyData.league.nome}"

2. RESUMO/META DESCRIPTION (máximo 155 caracteres):
Texto persuasivo resumindo a performance semanal

3. TEXTO PRINCIPAL (mínimo 1800 palavras) com as seguintes seções em HTML:

<h2>Introdução: A Semana ${weeklyData.weekNumber} em Perspectiva</h2>
- Contextualizar a rodada/semana no campeonato
- Explicar que este post resume a validação das previsões
- Linguagem clara, analítica e editorial
- Mínimo 200 palavras

<h2>Panorama Geral da Semana</h2>
- Quantidade de jogos analisados: ${weeklyData.totalMatches}
- Contexto geral da rodada
- Destaques esperados vs. realidade
- Mínimo 150 palavras

<!-- INSERIR AD SLOT 1 -->

<h2>Desempenho da IA: ${weeklyData.iaStats.taxaResultado.toFixed(1)}% de Acerto</h2>
- Análise detalhada dos ${weeklyData.iaStats.acertosResultado} acertos em ${weeklyData.totalMatches} jogos
- Onde a IA se destacou
- Onde teve dificuldade e por quê
- Padrões identificados
- Sempre com leitura interpretativa, não só números
- Mínimo 250 palavras

<h2>Desempenho da Comunidade: A Leitura Humana</h2>
- Análise dos ${weeklyData.humanosStats.totalPalpites} palpites da comunidade
- Taxa de acerto: ${weeklyData.humanosStats.taxaResultado.toFixed(1)}%
- Diferenças de leitura em relação à IA
- Pontos fortes da análise humana
- Mínimo 200 palavras

<h2>Comparação Direta: IA x Humanos na Semana ${weeklyData.weekNumber}</h2>
- Este é o BLOCO CENTRAL do post
- Quem teve melhor desempenho na semana
- Em quais contextos cada um se destacou
- Análise das divergências
- O que os dados mostram
- Este é o coração do conteúdo
- Mínimo 300 palavras

<!-- INSERIR CTA PREMIUM -->
<div class="premium-cta">
<p><strong>Membros do Clube Aleball</strong> acompanham análises semanais completas com métricas avançadas e histórico detalhado de performance.</p>
</div>

<h2>Jogos-Chave da Semana</h2>
- Analisar os 3-5 jogos mais relevantes
- Resumo curto de cada validação
- O que cada jogo ensinou
- Mínimo 250 palavras

<h2>Aprendizados da Semana ${weeklyData.weekNumber}</h2>
- O que os dados ensinaram
- Ajustes de leitura para próximas rodadas
- Tendências observadas
- Como IA e leitura humana se complementaram
- Bloco essencial para autoridade
- Mínimo 200 palavras

<!-- INSERIR AD SLOT 2 -->

<h2>Conclusão: Transparência em Ação</h2>
- Síntese da semana
- Reforço do compromisso com transparência
- Importância de aprender com cada rodada
- Mínimo 150 palavras

<!-- INSERIR CTA FINAL -->
<div class="premium-cta-final">
<p>Esta validação semanal é parte do compromisso do Aleball com transparência. Para análises ainda mais profundas, conheça o <strong>Clube Aleball Premium</strong> — onde dados e clareza se encontram.</p>
</div>

REGRAS IMPORTANTES:
- Este é um portal de ANÁLISE ESTATÍSTICA, não de apostas
- Nunca mencione apostas ou recomendações de apostas
- Use linguagem profissional e editorial
- Seja transparente sobre acertos e erros
- O texto deve ter pelo menos 1800 palavras
- Inclua as tags HTML corretamente

Responda APENAS em formato JSON válido:
{
  "titulo": "título SEO aqui",
  "resumo": "meta description aqui",
  "texto": "<h2>...</h2><p>...</p>..."
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GEMINI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Você é um editor esportivo brasileiro especializado em análise de performance de previsões. Gere conteúdo profissional, transparente e educativo. Responda sempre em JSON válido." 
        },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (response.status === 402) throw new Error("Credits exhausted. Add funds.");
    const errorText = await response.text();
    console.error("AI text generation error:", response.status, errorText);
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

async function generateWeeklyThumbnail(weeklyData: WeeklyData, GEMINI_API_KEY: string): Promise<string | null> {
  const scene = SCENE_VARIANTS[hashCode(`weekly-${weeklyData.weekNumber}-${weeklyData.year}-${weeklyData.league.slug}`) % SCENE_VARIANTS.length];

  const prompt = `Create a UNIQUE professional sports stadium photograph for a weekly validation report.

MANDATORY SCENE: ${scene}

VISUAL REQUIREMENTS:
- Photorealistic stadium photograph with analytical mood
- Week ${weeklyData.weekNumber} of ${weeklyData.league.nome}
- Professional broadcast quality, cinematic lighting
- 16:9 aspect ratio, ultra high resolution

CRITICAL: No text, no logos, no player faces. Pure photographic scene.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      console.log("Thumbnail generation failed:", response.status);
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

function addInternalLinks(texto: string, weeklyData: WeeklyData): string {
  let processedText = texto;
  
  const performanceLink = `<p class="internal-links"><strong>📊 Metodologia:</strong> <a href="/performance/previsoes">Entenda como validamos previsões no Aleball</a></p>`;
  const rankingLink = `<p class="internal-links"><strong>🏆 Ranking Histórico:</strong> <a href="/ranking/ia-vs-humanos">Veja o ranking completo IA vs Humanos</a></p>`;
  const leagueLink = weeklyData.league.slug 
    ? `<p class="internal-links"><strong>⚽ Campeonato:</strong> <a href="/campeonatos/${weeklyData.league.slug}">Página do ${weeklyData.league.nome}</a></p>`
    : '';
  
  const introEndIndex = processedText.indexOf('</h2>', processedText.indexOf('<h2>Panorama'));
  if (introEndIndex > -1) {
    const insertPoint = processedText.indexOf('</p>', introEndIndex) + 4;
    processedText = processedText.slice(0, insertPoint) + 
      `\n<div class="internal-links-block">${performanceLink}${rankingLink}${leagueLink}</div>\n` + 
      processedText.slice(insertPoint);
  }
  
  processedText = processedText.replace(
    '<!-- INSERIR AD SLOT 1 -->',
    '<div class="ad-slot" data-position="article-intro"></div>'
  );
  processedText = processedText.replace(
    '<!-- INSERIR AD SLOT 2 -->',
    '<div class="ad-slot" data-position="article-mid"></div>'
  );
  
  const relatedContent = `
<div class="related-content">
<h3>Conteúdos Relacionados</h3>
<ul>
<li><a href="/ranking/ia-vs-humanos">🏆 Ranking Histórico IA vs Humanos</a></li>
<li><a href="/performance/previsoes">📊 Página Pilar de Performance</a></li>
${weeklyData.league.slug ? `<li><a href="/campeonatos/${weeklyData.league.slug}">⚽ ${weeklyData.league.nome}</a></li>` : ''}
<li><a href="/palpites">🎯 Próximos Palpites da IA</a></li>
</ul>
</div>`;
  
  const finalCtaIndex = processedText.indexOf('<div class="premium-cta-final">');
  if (finalCtaIndex > -1) {
    processedText = processedText.slice(0, finalCtaIndex) + relatedContent + '\n' + processedText.slice(finalCtaIndex);
  } else {
    processedText += relatedContent;
  }
  
  return processedText;
}

// ========== SCAN MODE: find pending week/year/league combos ==========
async function findPendingWeeklyCombos(supabaseAdmin: any): Promise<{ year: number; week: number; liga_id: string; liga_nome: string; liga_slug: string; match_count: number }[]> {
  // Get all distinct (year, week_number, liga_id) from finished matches with comparativo
  // We compute week from partidas.data
  const { data: matchWeeks, error } = await supabaseAdmin.rpc('get_pending_weekly_validations');
  
  if (error) {
    console.error('Error fetching pending combos via RPC:', error);
    // Fallback: do it manually with a simpler query
    return await findPendingWeeklyCombosFallback(supabaseAdmin);
  }
  
  return matchWeeks || [];
}

async function findPendingWeeklyCombosFallback(supabaseAdmin: any): Promise<{ year: number; week: number; liga_id: string; liga_nome: string; liga_slug: string; match_count: number }[]> {
  // Get all finished matches with comparativo, grouped by liga_id and date
  // Then compute week/year and check against existing articles
  
  // Step 1: Get all existing weekly validation slugs
  const { data: existingArticles } = await supabaseAdmin
    .from('noticias')
    .select('slug')
    .like('slug', 'validacao-semana-%');
  
  const existingSlugs = new Set((existingArticles || []).map((a: any) => a.slug));
  
  // Step 2: Get distinct liga + date combos from finished matches with comparativo
  const { data: matches } = await supabaseAdmin
    .from('partidas')
    .select('data, liga_id, ligas:ligas!partidas_liga_id_fkey(id, nome, slug)')
    .eq('status', 'finished')
    .not('liga_id', 'is', null)
    .not('gols_casa', 'is', null);

  if (!matches?.length) return [];
  
  // Step 3: Group by (year, week, liga_id)
  const comboMap = new Map<string, { year: number; week: number; liga_id: string; liga_nome: string; liga_slug: string; match_count: number }>();
  
  for (const m of matches) {
    if (!m.data || !m.liga_id) continue;
    const d = new Date(m.data);
    const year = d.getFullYear();
    const week = getWeekNumber(d);
    const liga = Array.isArray(m.ligas) ? m.ligas[0] : m.ligas;
    if (!liga?.slug) continue;
    
    const key = `${year}-${week}-${m.liga_id}`;
    const slug = generateWeeklySlug(week, year, liga.slug);
    
    // Skip if article already exists
    if (existingSlugs.has(slug)) continue;
    
    const existing = comboMap.get(key);
    if (existing) {
      existing.match_count++;
    } else {
      comboMap.set(key, {
        year, week,
        liga_id: m.liga_id,
        liga_nome: liga.nome || '',
        liga_slug: liga.slug || '',
        match_count: 1,
      });
    }
  }
  
  // Sort by most recent first
  const pending = Array.from(comboMap.values());
  pending.sort((a, b) => b.year - a.year || b.week - a.week);
  
  return pending;
}

async function processOneWeeklyArticle(
  supabaseAdmin: any,
  combo: { year: number; week: number; liga_id: string; liga_nome: string; liga_slug: string },
  GEMINI_API_KEY: string,
  skipImages: boolean
): Promise<{ success: boolean; slug: string; error?: string }> {
  const weekDates = getWeekDates(combo.week, combo.year);
  const startDateStr = weekDates.start.toISOString().split('T')[0];
  const endDateStr = weekDates.end.toISOString().split('T')[0];
  const weeklySlug = generateWeeklySlug(combo.week, combo.year, combo.liga_slug);
  
  // Check if already exists (race condition guard)
  const { data: existing } = await supabaseAdmin
    .from('noticias')
    .select('id')
    .eq('slug', weeklySlug)
    .maybeSingle();
  
  if (existing) {
    return { success: true, slug: weeklySlug, error: 'already_exists' };
  }
  
  // Fetch matches
  const { data: matches, error: matchError } = await supabaseAdmin
    .from('partidas')
    .select(`
      id, data, gols_casa, gols_fora,
      time_casa:times!partidas_time_casa_id_fkey(nome),
      time_fora:times!partidas_time_fora_id_fkey(nome),
      comparativo:comparativo_resultados(
        sistema_acertou_resultado,
        sistema_acertou_placar,
        total_usuarios_palpitaram,
        usuarios_acertaram_resultado,
        usuarios_acertaram_placar
      )
    `)
    .eq('liga_id', combo.liga_id)
    .eq('status', 'finished')
    .gte('data', startDateStr)
    .lte('data', endDateStr)
    .not('gols_casa', 'is', null);
  
  if (matchError) throw new Error(`Fetch matches: ${matchError.message}`);
  
  const validMatches = (matches || []).filter(m => {
    const comp = Array.isArray(m.comparativo) ? m.comparativo[0] : m.comparativo;
    return comp !== null;
  });
  
  if (validMatches.length < 1) {
    return { success: false, slug: weeklySlug, error: 'no_matches_with_comparativo' };
  }
  
  // Calculate stats
  let iaAcertosResultado = 0;
  let iaAcertosPlacar = 0;
  let totalUsuariosPalpites = 0;
  let usuariosAcertosResultado = 0;
  let usuariosAcertosPlacar = 0;
  const keyMatches: WeeklyData['keyMatches'] = [];

  for (const match of validMatches) {
    const comp = Array.isArray(match.comparativo) ? match.comparativo[0] : match.comparativo;
    const timeCasa = Array.isArray(match.time_casa) ? match.time_casa[0] : match.time_casa;
    const timeFora = Array.isArray(match.time_fora) ? match.time_fora[0] : match.time_fora;

    if (comp.sistema_acertou_resultado) iaAcertosResultado++;
    if (comp.sistema_acertou_placar) iaAcertosPlacar++;
    totalUsuariosPalpites += comp.total_usuarios_palpitaram || 0;
    usuariosAcertosResultado += comp.usuarios_acertaram_resultado || 0;
    usuariosAcertosPlacar += comp.usuarios_acertaram_placar || 0;

    keyMatches.push({
      timeCasa: timeCasa?.nome || 'Time A',
      timeFora: timeFora?.nome || 'Time B',
      placar: `${match.gols_casa} x ${match.gols_fora}`,
      iaAcertou: comp.sistema_acertou_resultado,
      validationSlug: null,
    });
  }

  const league = { id: combo.liga_id, nome: combo.liga_nome, slug: combo.liga_slug };
  
  const weeklyData: WeeklyData = {
    weekNumber: combo.week,
    year: combo.year,
    league,
    totalMatches: validMatches.length,
    iaStats: {
      acertosResultado: iaAcertosResultado,
      acertosPlacar: iaAcertosPlacar,
      taxaResultado: (iaAcertosResultado / validMatches.length) * 100,
      taxaPlacar: (iaAcertosPlacar / validMatches.length) * 100,
    },
    humanosStats: {
      totalPalpites: totalUsuariosPalpites,
      acertosResultado: usuariosAcertosResultado,
      acertosPlacar: usuariosAcertosPlacar,
      taxaResultado: totalUsuariosPalpites > 0 ? (usuariosAcertosResultado / totalUsuariosPalpites) * 100 : 0,
      taxaPlacar: totalUsuariosPalpites > 0 ? (usuariosAcertosPlacar / totalUsuariosPalpites) * 100 : 0,
    },
    keyMatches: keyMatches.slice(0, 5),
    startDate: startDateStr,
    endDate: endDateStr,
  };

  // Generate content
  const textContent = await generateWeeklyContent(weeklyData, GEMINI_API_KEY);
  const processedText = addInternalLinks(textContent.texto, weeklyData);

  // Generate thumbnail (skip in batch mode)
  let thumbnailUrl: string | null = null;
  if (!skipImages) {
    const thumbnailBase64 = await generateWeeklyThumbnail(weeklyData, GEMINI_API_KEY);
    if (thumbnailBase64) {
      const thumbnailFileName = `weekly-validation-${weeklySlug}.png`;
      thumbnailUrl = await uploadImage(supabaseAdmin, thumbnailBase64, thumbnailFileName);
    }
  }

  // Save article
  const { error: insertError } = await supabaseAdmin
    .from('noticias')
    .insert({
      titulo: textContent.titulo,
      resumo: textContent.resumo,
      texto: processedText,
      slug: weeklySlug,
      imagem_url: thumbnailUrl,
      publicada: true,
      data_publicacao: new Date().toISOString(),
      partida_id: null,
    });

  if (insertError) {
    throw new Error(`Insert: ${insertError.message}`);
  }

  return { success: true, slug: weeklySlug };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // === KILL-SWITCH: cost control ===
  if (!(await isContentGenerationEnabled())) {
    return disabledResponse(corsHeaders, "generate-weekly-validation");
  }


  const SAFETY_TIMEOUT = 110_000; // 110s safety for 120s platform limit
  const startTime = Date.now();

  try {
    const GEMINI_API_KEY = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let targetLeagueId: string | null = null;
    let targetWeek: number | null = null;
    let targetYear: number | null = null;
    let scanMode = false;
    let skipImages = false;
    
    try {
      const body = await req.json();
      targetLeagueId = body?.league_id || null;
      targetWeek = body?.week || null;
      targetYear = body?.year || null;
      scanMode = body?.scan_mode === true;
      skipImages = body?.skip_images === true;
    } catch {
      // No body - use defaults
    }

    // ========== SCAN MODE ==========
    if (scanMode) {
      console.log('SCAN MODE: finding pending weekly validation combos...');
      
      const pending = await findPendingWeeklyCombosFallback(supabaseAdmin);
      const total = pending.length;
      
      if (total === 0) {
        return new Response(JSON.stringify({
          success: true,
          scan_mode: true,
          pending: 0,
          generated: 0,
          total: 0,
          message: 'No pending weekly validations found',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`Found ${total} pending weekly validation combos. Processing...`);
      
      let generated = 0;
      let failed = 0;
      const articles: { slug: string; liga: string; week: number; year: number }[] = [];
      
      // Process one at a time until timeout
      let circuitBreaker: string | null = null;
      for (const combo of pending) {
        if ((Date.now() - startTime) > SAFETY_TIMEOUT) break;
        
        try {
          const result = await processOneWeeklyArticle(supabaseAdmin, combo, GEMINI_API_KEY, skipImages);
          if (result.success && result.error !== 'already_exists') {
            generated++;
            articles.push({ slug: result.slug, liga: combo.liga_nome, week: combo.week, year: combo.year });
          }
          // Only process 1 per invocation in scan_mode to stay safe
          break;
        } catch (e) {
          failed++;
          const errMsg = e instanceof Error ? e.message : String(e);
          console.error(`Error processing week ${combo.week}/${combo.year} for ${combo.liga_nome}:`, e);
          // CIRCUIT BREAKER: stop on 402/429
          if (errMsg.includes('Credits exhausted') || errMsg.includes('Rate limit') || errMsg.includes('402') || errMsg.includes('429')) {
            circuitBreaker = errMsg;
            console.error(`CIRCUIT BREAKER: ${errMsg}. Stopping all processing.`);
          }
          break;
        }
      }
      
      return new Response(JSON.stringify({
        success: !circuitBreaker,
        scan_mode: true,
        pending: total - generated,
        generated,
        failed,
        total,
        articles,
        ...(circuitBreaker ? { circuit_breaker: circuitBreaker } : {}),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        ...(circuitBreaker ? { status: 503 } : {}),
      });
    }

    // ========== ORIGINAL MODE (single week) ==========
    const now = new Date();
    const currentWeek = targetWeek || getWeekNumber(now) - 1;
    const currentYear = targetYear || now.getFullYear();
    const weekDates = getWeekDates(currentWeek, currentYear);

    console.log(`Generating weekly validation for week ${currentWeek}, year ${currentYear}`);
    console.log(`Date range: ${weekDates.start.toISOString()} to ${weekDates.end.toISOString()}`);

    let leaguesQuery = supabaseAdmin
      .from('ligas')
      .select('id, nome, slug')
      .eq('ativa', true);
    
    if (targetLeagueId) {
      leaguesQuery = leaguesQuery.eq('id', targetLeagueId);
    }

    const { data: leagues, error: leaguesError } = await leaguesQuery;
    
    if (leaguesError) {
      throw new Error(`Failed to fetch leagues: ${leaguesError.message}`);
    }

    const { data: existingArticles } = await supabaseAdmin
      .from('noticias')
      .select('slug')
      .like('slug', `validacao-semana-${currentWeek}-temporada-${currentYear}%`);

    const existingSlugs = new Set(existingArticles?.map((a: any) => a.slug) || []);

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const league of (leagues || [])) {
      if ((Date.now() - startTime) > SAFETY_TIMEOUT) {
        console.log('Safety timeout reached, stopping.');
        break;
      }

      const weeklySlug = generateWeeklySlug(currentWeek, currentYear, league.slug || league.nome.toLowerCase().replace(/\s+/g, '-'));
      
      if (existingSlugs.has(weeklySlug)) {
        results.skipped++;
        continue;
      }

      const startDateStr = weekDates.start.toISOString().split('T')[0];
      const endDateStr = weekDates.end.toISOString().split('T')[0];

      const { data: matches, error: matchError } = await supabaseAdmin
        .from('partidas')
        .select(`
          id, data, gols_casa, gols_fora,
          time_casa:times!partidas_time_casa_id_fkey(nome),
          time_fora:times!partidas_time_fora_id_fkey(nome),
          comparativo:comparativo_resultados(
            sistema_acertou_resultado,
            sistema_acertou_placar,
            total_usuarios_palpitaram,
            usuarios_acertaram_resultado,
            usuarios_acertaram_placar
          )
        `)
        .eq('liga_id', league.id)
        .eq('status', 'finished')
        .gte('data', startDateStr)
        .lte('data', endDateStr)
        .not('gols_casa', 'is', null);

      if (matchError) {
        results.errors.push(`${league.nome}: ${matchError.message}`);
        continue;
      }

      const validMatches = (matches || []).filter(m => {
        const comp = Array.isArray(m.comparativo) ? m.comparativo[0] : m.comparativo;
        return comp !== null;
      });

      if (validMatches.length < 1) {
        results.skipped++;
        continue;
      }

      results.processed++;

      let iaAcertosResultado = 0;
      let iaAcertosPlacar = 0;
      let totalUsuariosPalpites = 0;
      let usuariosAcertosResultado = 0;
      let usuariosAcertosPlacar = 0;
      const keyMatches: WeeklyData['keyMatches'] = [];

      for (const match of validMatches) {
        const comp = Array.isArray(match.comparativo) ? match.comparativo[0] : match.comparativo;
        const timeCasa = Array.isArray(match.time_casa) ? match.time_casa[0] : match.time_casa;
        const timeFora = Array.isArray(match.time_fora) ? match.time_fora[0] : match.time_fora;

        if (comp.sistema_acertou_resultado) iaAcertosResultado++;
        if (comp.sistema_acertou_placar) iaAcertosPlacar++;
        totalUsuariosPalpites += comp.total_usuarios_palpitaram || 0;
        usuariosAcertosResultado += comp.usuarios_acertaram_resultado || 0;
        usuariosAcertosPlacar += comp.usuarios_acertaram_placar || 0;

        keyMatches.push({
          timeCasa: timeCasa?.nome || 'Time A',
          timeFora: timeFora?.nome || 'Time B',
          placar: `${match.gols_casa} x ${match.gols_fora}`,
          iaAcertou: comp.sistema_acertou_resultado,
          validationSlug: null,
        });
      }

      const weeklyData: WeeklyData = {
        weekNumber: currentWeek,
        year: currentYear,
        league: league,
        totalMatches: validMatches.length,
        iaStats: {
          acertosResultado: iaAcertosResultado,
          acertosPlacar: iaAcertosPlacar,
          taxaResultado: (iaAcertosResultado / validMatches.length) * 100,
          taxaPlacar: (iaAcertosPlacar / validMatches.length) * 100
        },
        humanosStats: {
          totalPalpites: totalUsuariosPalpites,
          acertosResultado: usuariosAcertosResultado,
          acertosPlacar: usuariosAcertosPlacar,
          taxaResultado: totalUsuariosPalpites > 0 ? (usuariosAcertosResultado / totalUsuariosPalpites) * 100 : 0,
          taxaPlacar: totalUsuariosPalpites > 0 ? (usuariosAcertosPlacar / totalUsuariosPalpites) * 100 : 0
        },
        keyMatches: keyMatches.slice(0, 5),
        startDate: startDateStr,
        endDate: endDateStr
      };

      try {
        console.log(`Generating weekly validation for ${league.nome} (${validMatches.length} matches)`);

        const textContent = await generateWeeklyContent(weeklyData, GEMINI_API_KEY);
        const processedText = addInternalLinks(textContent.texto, weeklyData);

        let thumbnailUrl: string | null = null;
        if (!skipImages) {
          const thumbnailBase64 = await generateWeeklyThumbnail(weeklyData, GEMINI_API_KEY);
          if (thumbnailBase64) {
            const thumbnailFileName = `weekly-validation-${weeklySlug}.png`;
            thumbnailUrl = await uploadImage(supabaseAdmin, thumbnailBase64, thumbnailFileName);
          }
        }

        const { error: insertError } = await supabaseAdmin
          .from('noticias')
          .insert({
            titulo: textContent.titulo,
            resumo: textContent.resumo,
            texto: processedText,
            slug: weeklySlug,
            imagem_url: thumbnailUrl,
            publicada: true,
            data_publicacao: new Date().toISOString(),
            partida_id: null,
          });

        if (insertError) {
          results.errors.push(`${league.nome}: ${insertError.message}`);
        } else {
          results.created++;
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        results.errors.push(`${league.nome}: ${errorMessage}`);
        // CIRCUIT BREAKER: stop on 402/429
        if (errorMessage.includes('Credits exhausted') || errorMessage.includes('Rate limit') || errorMessage.includes('402') || errorMessage.includes('429')) {
          console.error(`CIRCUIT BREAKER: ${errorMessage}. Stopping all processing.`);
          (results as any).circuit_breaker = errorMessage;
          break;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      week: currentWeek,
      year: currentYear,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Weekly validation error:", errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
