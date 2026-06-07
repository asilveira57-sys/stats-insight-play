import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-pro";
const MIN_CHARS = 900;
const MAX_CHARS = 1800;

const SYSTEM_PROMPT = `Você é um redator esportivo do Statball especializado em SEO e enciclopédia futebolística.
REGRAS RÍGIDAS:
- Use APENAS os fatos numerados fornecidos pelo usuário.
- NUNCA invente jogadores, gols, frases, narrativas ou estatísticas que não estejam nos fatos.
- NUNCA use linguagem de apostas, "favorita", "certamente buscará", "promete" — texto enciclopédico, factual.
- Escreva em português brasileiro, tom jornalístico/enciclopédico, claro e fluido.
- Se um dado não estiver presente, omita silenciosamente — não escreva "não há informação".
- Saída em JSON estrito, sem markdown.`;

async function callAI(messages: any[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit IA. Tente em instantes.");
    if (res.status === 402) throw new Error("Créditos IA esgotados.");
    throw new Error(`AI ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "{}";
}

function buildFacts(team: any, history: any[]) {
  const last3 = [...history].sort((a, b) => b.year - a.year).slice(0, 3);
  return [
    `Nome oficial: ${team.name}`,
    team.nickname ? `Apelido: ${team.nickname}` : "",
    team.confederation_full ? `Confederação: ${team.confederation_full}` : "",
    team.group_letter ? `Grupo na Copa 2026: ${team.group_letter}` : "",
    `Total de participações em Copas: ${team.participations_count ?? history.length}`,
    team.titles_count != null ? `Títulos mundiais: ${team.titles_count}` : "",
    team.first_participation_year ? `Primeira Copa: ${team.first_participation_year}` : "",
    team.best_campaign ? `Melhor campanha: ${team.best_campaign}` : "",
    team.coach_name ? `Técnico atual (2026): ${team.coach_name}${team.coach_nationality ? ` (${team.coach_nationality})` : ""}` : "",
    "",
    "Edições em Copas do Mundo (lista FACTUAL, use apenas isto):",
    ...history.map((h: any) => `- ${h.year} (${h.host_country ?? "sede n/d"}): ${h.stage_reached ?? "—"}${h.final_position ? `, posição ${h.final_position}` : ""}${h.coach_name ? `, técnico ${h.coach_name}` : ""}`),
    "",
    "Últimas 3 edições (em ordem cronológica decrescente):",
    ...last3.map((h: any) => `- ${h.year}: ${h.stage_reached ?? "—"}`),
  ].filter(Boolean).join("\n");
}

function buildUserMsg(facts: string, expand = false) {
  const extra = expand
    ? `\n\nIMPORTANTE: A versão anterior ficou curta demais. Expanda o "historical_summary" para no MÍNIMO ${MIN_CHARS} caracteres, distribuídos em 4 parágrafos. Mantenha a regra de usar APENAS os fatos acima — não invente nada novo. Aprofunde com mais detalhes das edições já listadas (técnicos, sedes, posições finais), comparações entre ciclos e contextualização objetiva.`
    : "";
  return `${facts}

Gere um JSON com a seguinte estrutura:
{
  "historical_summary": "Texto entre ${MIN_CHARS} e ${MAX_CHARS} caracteres, EXATAMENTE 4 parágrafos separados por uma linha em branco, cobrindo: (1) trajetória geral (participações, primeira Copa, padrão de desempenho); (2) maiores conquistas e momentos marcantes — anos de título, finais, técnicos vencedores, melhores campanhas — sempre extraídos dos fatos acima; (3) o desempenho nas últimas três edições com anos e fases reais; (4) cenário objetivo para a Copa 2026 (grupo, técnico atual quando informado) sem qualquer linguagem especulativa.",
  "meta_description": "Texto único, máximo 155 caracteres, com palavras-chave: nome da seleção, Copa do Mundo 2026, histórico, elenco.",
  "seo_keywords": ["array de 8 a 12 expressões em pt-BR"],
  "faqs": [
    { "q": "pergunta", "a": "resposta curta baseada estritamente nos fatos" }
  ]
}
Inclua 4 a 6 FAQs factuais (ex.: quantos títulos, primeira Copa, melhor campanha, técnico atual, grupo em 2026, últimas edições).${extra}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "team_seo", provider: "lovable-ai", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    const body = await req.json();
    const { slug } = body as { slug?: string };
    if (!slug) throw new Error("slug é obrigatório");

    const { data: team } = await supabase.from("world_cup_2026_teams")
      .select("*").eq("slug", slug).maybeSingle();
    if (!team) throw new Error(`Seleção ${slug} não encontrada`);
    const { data: history } = await supabase.from("world_cup_2026_team_history")
      .select("year,host_country,stage_reached,final_position,coach_name")
      .eq("team_id", team.id).order("year", { ascending: true });

    if (!history?.length) throw new Error("Histórico ausente. Rode o seed antes.");

    const facts = buildFacts(team, history);

    console.log(`[generate-team-seo] ${slug} facts=${facts.length}ch history=${history.length}`);

    // First attempt
    let raw = await callAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMsg(facts, false) },
    ]);
    let parsed = JSON.parse(raw);
    let summary: string = parsed.historical_summary ?? "";
    let status = summary.length >= MIN_CHARS ? "ok" : "short";

    // Retry once if too short
    if (status === "short") {
      console.warn(`[generate-team-seo] ${slug} short (${summary.length}ch), retrying`);
      raw = await callAI([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMsg(facts, true) },
      ]);
      const parsed2 = JSON.parse(raw);
      if ((parsed2.historical_summary ?? "").length >= MIN_CHARS) {
        parsed = parsed2;
        summary = parsed.historical_summary;
        status = "ok";
      } else {
        // keep longer of the two
        if ((parsed2.historical_summary ?? "").length > summary.length) {
          parsed = parsed2;
          summary = parsed.historical_summary;
        }
      }
    }

    const updates: Record<string, any> = {
      historical_summary: summary || null,
      historical_summary_status: status,
      meta_description: parsed.meta_description ?? null,
      seo_keywords: Array.isArray(parsed.seo_keywords) ? parsed.seo_keywords : null,
    };
    await supabase.from("world_cup_2026_teams").update(updates).eq("id", team.id);

    // Replace existing FAQ for this team to avoid duplicates
    if (Array.isArray(parsed.faqs) && parsed.faqs.length) {
      await supabase.from("world_cup_2026_ai_analyses")
        .delete().eq("team_id", team.id).eq("analysis_type", "team_faq");
      await supabase.from("world_cup_2026_ai_analyses").insert({
        team_id: team.id,
        analysis_type: "team_faq",
        title: `FAQ — ${team.name} na Copa 2026`,
        content: JSON.stringify(parsed.faqs),
        confidence_score: 0.9,
        has_enough_data: true,
        model_used: MODEL,
      });
    }

    console.log(`[generate-team-seo] ${slug} OK status=${status} chars=${summary.length}`);

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: 1,
      payload_snapshot: { slug, chars: summary.length, status },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, slug, chars: summary.length, status, ...updates, faqs: parsed.faqs ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-team-seo] ERROR", msg);
    await supabase.from("world_cup_2026_sync_logs").update({
      status: "error", finished_at: new Date().toISOString(), error_message: msg,
    }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
