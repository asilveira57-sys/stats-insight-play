// Pre-match analysis generator — Statball editorial standard.
// Produces a structured JSON with all sections required by the editorial spec:
// intro, momento das seleções, jogadores, comparativo, tática, em jogo, prognóstico,
// resumo + SEO (titulo ≤60, meta desc 140-160) + image_concept.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGE_PT: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "Segunda Fase (R32)",
  round_of_16: "Oitavas de Final",
  quarter_final: "Quartas de Final",
  semi_final: "Semifinal",
  third_place: "Disputa do 3º Lugar",
  final: "Final",
};

const HOST_CITIES = [
  "Kansas City", "Dallas", "Miami", "Toronto", "Vancouver",
  "Monterrey", "Guadalajara", "Cidade do México", "Atlanta",
  "Seattle", "Los Angeles", "Houston", "Philadelphia", "Boston",
  "New York/New Jersey",
];

function pickCity(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return HOST_CITIES[Math.abs(h) % HOST_CITIES.length];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500, headers: cors });

  try {
    const { match_id, force } = await req.json();
    if (!match_id) throw new Error("match_id required");

    if (!force) {
      const { data: existing } = await supabase
        .from("world_cup_2026_ai_analyses")
        .select("id, content").eq("match_id", match_id).eq("analysis_type", "pre_match").maybeSingle();
      // Only skip if it already follows the new editorial standard (contains the comparative table header)
      if (existing?.content && /Prognóstico Statball/i.test(existing.content)) {
        return new Response(JSON.stringify({ success: true, skipped: true }), { headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    const { data: match } = await supabase
      .from("world_cup_2026_matches")
      .select(`*, home:home_team_id(id,name,slug,group_letter,coach_name,historical_summary,best_campaign,titles_count,participations_count,nickname),
        away:away_team_id(id,name,slug,group_letter,coach_name,historical_summary,best_campaign,titles_count,participations_count,nickname)`)
      .eq("id", match_id).maybeSingle();
    if (!match) throw new Error("match not found");

    const dateStr = match.match_date ? new Date(match.match_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" }) : "a confirmar";
    const stageLabel = STAGE_PT[match.stage] ?? match.stage;
    const groupLabel = match.group_letter ? `Grupo ${match.group_letter}` : stageLabel;
    const hostCity = pickCity(match_id);

    const facts = `
FATOS DA PARTIDA (use APENAS estes dados; quando faltar, escreva "Informação ainda não confirmada"):
- Competição: Copa do Mundo FIFA 2026
- Fase: ${stageLabel}${match.group_letter ? ` — Grupo ${match.group_letter}` : ""}
- Data/horário: ${dateStr} (horário de Brasília)
- Estádio: ${match.stadium ?? "Informação ainda não confirmada"}, ${match.city ?? "Informação ainda não confirmada"}

SELEÇÃO A (mandante na tabela): ${match.home?.name}
- Apelido: ${match.home?.nickname ?? "—"}
- Técnico: ${match.home?.coach_name ?? "Informação ainda não confirmada"}
- Títulos mundiais: ${match.home?.titles_count ?? "Não disponível"}
- Participações em Copas: ${match.home?.participations_count ?? "Não disponível"}
- Melhor campanha: ${match.home?.best_campaign ?? "Não disponível"}
- Histórico: ${match.home?.historical_summary?.slice(0, 900) ?? "Não disponível"}

SELEÇÃO B (visitante na tabela): ${match.away?.name}
- Apelido: ${match.away?.nickname ?? "—"}
- Técnico: ${match.away?.coach_name ?? "Informação ainda não confirmada"}
- Títulos mundiais: ${match.away?.titles_count ?? "Não disponível"}
- Participações em Copas: ${match.away?.participations_count ?? "Não disponível"}
- Melhor campanha: ${match.away?.best_campaign ?? "Não disponível"}
- Histórico: ${match.away?.historical_summary?.slice(0, 900) ?? "Não disponível"}
`.trim();

    const prompt = `${facts}

Você é editor-chefe do Statball, portal brasileiro de análise esportiva (referências de estilo: Globo Esporte, ESPN, The Athletic, Goal.com). Produza uma ANÁLISE PRÉ-JOGO completa, jornalística e densa, em português brasileiro, parágrafos curtos (máx. 4 linhas).

REGRAS DURAS:
- NUNCA escreva frases genéricas como "Cada ponto é fundamental", "Ambas querem avançar", "Será um duelo importante".
- NUNCA invente lesões, escalações, estatísticas, retrospectos diretos, mando de campo ou ranking FIFA que não estejam nos fatos.
- Quando um dado não existir, escreva literalmente "Informação ainda não confirmada" (ou "Não disponível" em tabelas).
- Não repita o título dentro do texto. Não use clichês.
- NÃO é conteúdo de aposta — é análise estatístico-editorial.

Devolva APENAS um JSON estrito com este formato (todos os campos obrigatórios):
{
  "seo_title": "título ≤60 caracteres, com 'Copa 2026', as duas seleções e o grupo se houver",
  "meta_description": "resumo entre 140 e 160 caracteres, atrativo, sem clickbait",
  "keywords": ["Copa do Mundo 2026", "${match.home?.name}", "${match.away?.name}", "${groupLabel}", "Statball"],
  "headline": "manchete jornalística curta (≤90 chars), diferente do seo_title",
  "intro": "2 a 3 parágrafos apresentando competição, ${groupLabel}, estádio, data e horário, sem repetir o título",
  "momento": "2+ parágrafos sobre o momento de cada seleção (histórico recente, últimas competições, expectativa)",
  "jogadores_home": [{"nome":"...","posicao":"...","papel":"importância tática em 1 frase"}],
  "jogadores_away": [{"nome":"...","posicao":"...","papel":"importância tática em 1 frase"}],
  "comparativo": {
    "participacoes": {"home": "valor ou 'Não disponível'", "away": "..."},
    "melhor_campanha": {"home": "...", "away": "..."},
    "ranking_fifa": {"home": "Não disponível", "away": "Não disponível"},
    "media_gols_recente": {"home": "Não disponível", "away": "Não disponível"}
  },
  "tatica": "1-2 parágrafos sobre o confronto tático com base nas escolas dos países (posse, transição, jogo físico, pressão, bolas paradas). Sem números inventados.",
  "em_jogo": "1-2 parágrafos sobre cenário do grupo/fase: impacto de vitória, empate e derrota",
  "prob_home": 0,
  "prob_draw": 0,
  "prob_away": 0,
  "predicted_home_score": 0,
  "predicted_away_score": 0,
  "confidence": "high" | "medium" | "low",
  "prognostico_text": "2 parágrafos justificando o palpite Statball, sem clichês",
  "resumo_final": "1 parágrafo de fechamento jornalístico, sem repetir o que já foi dito",
  "image_concept": "descrição curta (≤180 chars) de uma cena ÚNICA: estádio estilizado de ${hostCity} ao entardecer/noite, gramado iluminado, formas geométricas modernas com as cores das bandeiras de ${match.home?.name} e ${match.away?.name}, sem brasões/logos oficiais"
}

Os três campos prob_home + prob_draw + prob_away DEVEM somar 100 (inteiros).`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    let aiRes: Response;
    try {
      aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 3000,
          temperature: 0.75,
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI ${aiRes.status}: ${txt.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");

    // Normalize probabilities to sum 100
    let pH = Number(parsed.prob_home) || 0, pD = Number(parsed.prob_draw) || 0, pA = Number(parsed.prob_away) || 0;
    const s = pH + pD + pA;
    if (s > 0 && s !== 100) { pH = Math.round((pH / s) * 100); pD = Math.round((pD / s) * 100); pA = 100 - pH - pD; }

    const homeName = match.home?.name ?? "Seleção A";
    const awayName = match.away?.name ?? "Seleção B";

    const playersBlock = (label: string, arr: any[]) => {
      if (!arr?.length) return `**${label}:** Informação ainda não confirmada.`;
      return `**${label}:**\n` + arr.slice(0, 3).map(p => `- **${p.nome}** (${p.posicao || "—"}) — ${p.papel || ""}`).join("\n");
    };

    const c = parsed.comparativo ?? {};
    const table =
`| Item | ${homeName} | ${awayName} |
|---|---|---|
| Participações em Copas | ${c.participacoes?.home ?? "Não disponível"} | ${c.participacoes?.away ?? "Não disponível"} |
| Melhor campanha | ${c.melhor_campanha?.home ?? "Não disponível"} | ${c.melhor_campanha?.away ?? "Não disponível"} |
| Ranking FIFA | ${c.ranking_fifa?.home ?? "Não disponível"} | ${c.ranking_fifa?.away ?? "Não disponível"} |
| Média de gols recente | ${c.media_gols_recente?.home ?? "Não disponível"} | ${c.media_gols_recente?.away ?? "Não disponível"} |`;

    const fullContent =
`## ${parsed.headline ?? `${homeName} x ${awayName}`}

${parsed.intro ?? ""}

### Momento das seleções
${parsed.momento ?? ""}

### Jogadores para ficar de olho
${playersBlock(homeName, parsed.jogadores_home ?? [])}

${playersBlock(awayName, parsed.jogadores_away ?? [])}

### Comparativo das equipes
${table}

### Análise tática
${parsed.tatica ?? ""}

### O que está em jogo
${parsed.em_jogo ?? ""}

### Prognóstico Statball
**Favoritismo Statball**
- ${homeName}: **${pH}%**
- Empate: **${pD}%**
- ${awayName}: **${pA}%**

**Palpite de placar:** ${homeName} ${parsed.predicted_home_score ?? 0} x ${parsed.predicted_away_score ?? 0} ${awayName} — confiança ${parsed.confidence ?? "medium"}.

${parsed.prognostico_text ?? ""}

### Resumo final
${parsed.resumo_final ?? ""}`;

    const seoMeta = {
      seo_title: (parsed.seo_title ?? `Copa 2026 — ${homeName} x ${awayName}`).slice(0, 60),
      meta_description: (parsed.meta_description ?? "").slice(0, 160),
      keywords: parsed.keywords ?? [],
      image_concept: parsed.image_concept ?? `Estádio estilizado em ${hostCity}, cores das bandeiras de ${homeName} e ${awayName}`,
      host_city: hostCity,
      probs: { home: pH, draw: pD, away: pA },
    };

    // Stash SEO metadata at the start as an HTML comment (publish-news reads it)
    const contentWithMeta = `<!--STATBALL_META:${JSON.stringify(seoMeta)}-->\n${fullContent}`;

    const { error: upsertError } = await supabase.from("world_cup_2026_ai_analyses").upsert({
      match_id,
      analysis_type: "pre_match",
      title: seoMeta.seo_title,
      content: contentWithMeta,
      predicted_home_score: parsed.predicted_home_score ?? null,
      predicted_away_score: parsed.predicted_away_score ?? null,
      confidence_score: parsed.confidence === "high" ? 0.85 : parsed.confidence === "medium" ? 0.6 : 0.4,
      has_enough_data: (parsed.intro?.length ?? 0) + (parsed.momento?.length ?? 0) >= 600,
      model_used: "gpt-4o-mini",
      generated_at: new Date().toISOString(),
    }, { onConflict: "match_id,analysis_type" });
    if (upsertError) throw new Error(`save analysis failed: ${upsertError.message}`);

    return new Response(JSON.stringify({ success: true, length: fullContent.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
