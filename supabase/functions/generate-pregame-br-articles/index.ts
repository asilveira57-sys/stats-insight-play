// Gera artigos PRÉ-JOGO somente para partidas brasileiras agendadas nos próximos N dias.
// - Garante palpite do sistema antes de gerar o artigo (gerar_palpite_sistema).
// - Bypassa o kill-switch global usando o whitelist `pre_game_br_only`.
// - Limite seguro por execução para controlar custo.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isFeatureAllowed, disabledResponse } from "../_shared/killswitch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEATURE_KEY = "pre_game_br_only";
const FN_NAME = "generate-pregame-br-articles";

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

function formatDateForDisplay(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}
function formatDateForSlug(d: string) {
  return new Date(d).toISOString().split("T")[0];
}
function countWords(text: string) {
  return text.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
}

async function generateArticleContent(match: any, apiKey: string) {
  const timeCasa = match.time_casa?.nome || "Time Casa";
  const timeFora = match.time_fora?.nome || "Time Fora";
  const liga = match.liga?.nome || "Campeonato";
  const matchDate = formatDateForDisplay(match.data);
  const p = match.palpite || {};
  const probCasa = p.prob_casa ?? 33;
  const probEmpate = p.prob_empate ?? 34;
  const probFora = p.prob_fora ?? 33;
  const placarCasa = p.placar_casa_estimado ?? 1;
  const placarFora = p.placar_fora_estimado ?? 1;
  const forcaCasa = p.forca_time_casa ?? 50;
  const forcaFora = p.forca_time_fora ?? 50;

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const systemPrompt = `Você é um analista esportivo de elite escrevendo em ${today}.

CONTEXTO TEMPORAL CRÍTICO:
- Estamos ANTES da partida acontecer
- NÃO revele resultado, NÃO mencione nada após esta data
- Use verbos no futuro ao se referir ao jogo

REGRAS ABSOLUTAS:
- Mínimo 1200 palavras, ideal 1500-1800
- Português brasileiro, jornalístico e analítico
- NÃO referenciar apostas, odds ou casas de apostas
- Interprete dados; não repita números
- Proibido: "jogo equilibrado", "duas equipes fortes", "qualquer coisa pode acontecer"
- HTML com h2, h3, p, ul, li, strong, em`;

  const userPrompt = `Análise pré-jogo para o Statball:

CONFRONTO:
- ${timeCasa} x ${timeFora}
- Competição: ${liga}
- Data: ${matchDate}
${match.rodada ? `- Rodada: ${match.rodada}` : ""}
- Força ${timeCasa}: ${forcaCasa}/100 | Força ${timeFora}: ${forcaFora}/100
- Probabilidades: ${timeCasa} ${probCasa.toFixed(1)}% | Empate ${probEmpate.toFixed(1)}% | ${timeFora} ${probFora.toFixed(1)}%
- Placar estimado: ${placarCasa} x ${placarFora}

ESTRUTURA (mínimo 1200 palavras):
<h2>Introdução: Contexto do Confronto</h2>
<h2>Momento das Equipes no ${liga}</h2>
<h2>Análise Tática e Fatores Decisivos</h2>
<h2>Fator Casa/Fora e Histórico</h2>
<h2>Tendência e Placar Estimado (${placarCasa} x ${placarFora})</h2>
<h2>Leitura de Cenário Statball</h2>

REGRAS: toda afirmação justificada com dados; comparar lado a lado; sem revelar resultado.`;

  const model = "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 8000 },
      }),
    },
  );

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`AI ${response.status}: ${txt.slice(0, 200)}`);
  }
  const data = await response.json();
  const content =
    data?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).filter(Boolean).join("") || "";
  const title = `${timeCasa} x ${timeFora}: Análise - ${liga}`.slice(0, 60);
  const summary = `Análise completa de ${timeCasa} x ${timeFora} pela ${liga} em ${matchDate}.`.slice(0, 155);
  return { content, title, summary };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Feature-gate: precisa estar no whitelist mesmo se kill-switch global estiver off
  if (!(await isFeatureAllowed(FEATURE_KEY))) {
    return disabledResponse(corsHeaders, FN_NAME);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

  if (!geminiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Parâmetros
  let limit = 3;
  let daysAhead = 7;
  try {
    const body = await req.json();
    limit = Math.min(10, Math.max(1, Number(body?.limit ?? 3)));
    daysAhead = Math.min(14, Math.max(1, Number(body?.days_ahead ?? 7)));
  } catch { /* defaults */ }

  const startTime = Date.now();
  const SAFETY_MS = 280_000;
  const hasTimeLeft = () => Date.now() - startTime < SAFETY_MS;

  try {
    const today = new Date().toISOString().split("T")[0];
    const until = new Date();
    until.setDate(until.getDate() + daysAhead);
    const untilStr = until.toISOString().split("T")[0];

    // 1) IDs de partidas BR já com artigo (evita refazer)
    const existingIds = new Set<string>();
    let off = 0;
    while (true) {
      const { data } = await supabase
        .from("noticias")
        .select("partida_id")
        .not("partida_id", "is", null)
        .range(off, off + 999);
      if (!data || data.length === 0) break;
      data.forEach((r: any) => existingIds.add(r.partida_id));
      if (data.length < 1000) break;
      off += 1000;
    }

    // 2) Buscar próximas partidas BR (scheduled, próximos N dias)
    const { data: matches, error: mErr } = await supabase
      .from("partidas")
      .select(`
        id, data, hora, rodada, status,
        time_casa:times!partidas_time_casa_id_fkey(id, nome, slug),
        time_fora:times!partidas_time_fora_id_fkey(id, nome, slug),
        liga:ligas!partidas_liga_id_fkey(id, nome, slug, pais),
        palpite:palpites(
          prob_casa, prob_empate, prob_fora,
          placar_casa_estimado, placar_fora_estimado,
          forca_time_casa, forca_time_fora, confianca
        )
      `)
      .eq("status", "scheduled")
      .gte("data", today)
      .lte("data", untilStr)
      .order("data", { ascending: true })
      .limit(200);

    if (mErr) throw new Error(`Fetch matches: ${mErr.message}`);

    const brMatches = (matches || []).filter((m: any) => {
      const pais = (m.liga?.pais || "").toLowerCase();
      return (pais === "brasil" || pais === "brazil") && !existingIds.has(m.id);
    });

    console.log(`[${FN_NAME}] candidatas BR próximas: ${brMatches.length}`);

    const results: any[] = [];
    let processed = 0;

    for (const match of brMatches) {
      if (processed >= limit || !hasTimeLeft()) break;

      const timeCasa = (match as any).time_casa?.nome || "Casa";
      const timeFora = (match as any).time_fora?.nome || "Fora";

      try {
        // Garantir palpite do sistema
        let palpite = Array.isArray((match as any).palpite) ? (match as any).palpite[0] : (match as any).palpite;
        if (!palpite) {
          const { error: gerErr } = await supabase.rpc("gerar_palpite_sistema", {
            p_partida_id: (match as any).id,
          });
          if (gerErr) throw new Error(`gerar_palpite_sistema: ${gerErr.message}`);
          const { data: pData } = await supabase
            .from("palpites")
            .select("prob_casa, prob_empate, prob_fora, placar_casa_estimado, placar_fora_estimado, forca_time_casa, forca_time_fora, confianca")
            .eq("partida_id", (match as any).id)
            .maybeSingle();
          palpite = pData;
        }

        const enriched = { ...(match as any), palpite };
        const { content, title, summary } = await generateArticleContent(enriched, geminiKey);
        const wordCount = countWords(content);

        const baseSlug = `${slugify(timeCasa)}-x-${slugify(timeFora)}-${formatDateForSlug((match as any).data)}-analise-pre-jogo`;
        const slug = `${baseSlug}-${(match as any).id.slice(0, 12)}`;

        const { data: insData, error: insErr } = await supabase.from("noticias").insert({
          titulo: title,
          resumo: summary,
          texto: content,
          imagem_url: null,
          slug,
          data_publicacao: new Date().toISOString(),
          partida_id: (match as any).id,
          publicada: true,
        }).select("id").maybeSingle();

        if (insErr && !(insErr.message?.includes("duplicate") || insErr.code === "23505")) {
          throw new Error(`Insert: ${insErr.message}`);
        }

        // Gera thumbnail SVG imediatamente — sem isso o card cai no placeholder verde compartilhado.
        if (insData?.id) {
          try {
            await supabase.functions.invoke("generate-article-card-svg", {
              body: { article_ids: [insData.id], limit: 1, mode: "execute" },
            });
          } catch (svgErr) {
            console.error(`[${FN_NAME}] svg thumb falhou ${insData.id}:`, svgErr);
          }
        }

        existingIds.add((match as any).id);
        processed++;
        results.push({ partida_id: (match as any).id, slug, word_count: wordCount, success: true });

        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`[${FN_NAME}] erro ${(match as any).id}:`, err);
        results.push({
          partida_id: (match as any).id,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
        if (err instanceof Error && (err.message.includes("429") || err.message.includes("402"))) {
          break; // circuit breaker
        }
      }
    }

    await supabase.from("sync_logs").insert({
      entity_type: "pregame_br_articles",
      status: "completed",
      items_processed: results.length,
      items_created: results.filter((r) => r.success).length,
      items_failed: results.filter((r) => !r.success).length,
      details: { results, candidates: brMatches.length, days_ahead: daysAhead },
    });

    return new Response(
      JSON.stringify({
        success: true,
        candidates: brMatches.length,
        created: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(`[${FN_NAME}] fatal:`, err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
