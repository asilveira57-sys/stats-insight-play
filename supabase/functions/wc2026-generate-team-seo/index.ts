import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um redator esportivo do Statball especializado em SEO.
Use APENAS os fatos numerados fornecidos abaixo. NUNCA invente posições, anos, técnicos ou jogadores.
Se um dado não estiver presente, omita silenciosamente — não diga "não há informação".
Escreva em português brasileiro, tom jornalístico/enciclopédico, claro e objetivo.
NUNCA use linguagem de apostas. Saídas em JSON estrito.`;

async function callAI(messages: any[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
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

    const facts = [
      `Nome: ${team.name}`,
      team.nickname ? `Apelido: ${team.nickname}` : "",
      team.confederation_full ? `Confederação: ${team.confederation_full}` : "",
      team.group_letter ? `Grupo na Copa 2026: ${team.group_letter}` : "",
      `Total de participações: ${team.participations_count ?? history.length}`,
      team.titles_count != null ? `Títulos mundiais: ${team.titles_count}` : "",
      team.first_participation_year ? `Primeira Copa: ${team.first_participation_year}` : "",
      team.best_campaign ? `Melhor campanha: ${team.best_campaign}` : "",
      team.coach_name ? `Técnico atual (2026): ${team.coach_name}${team.coach_nationality ? ` (${team.coach_nationality})` : ""}` : "",
      "",
      "Edições em Copas do Mundo (somente fatos abaixo):",
      ...history.map(h => `- ${h.year} (${h.host_country ?? "sede n/d"}): ${h.stage_reached ?? "—"}${h.final_position ? `, ${h.final_position}` : ""}${h.coach_name ? `, técnico ${h.coach_name}` : ""}`),
    ].filter(Boolean).join("\n");

    const userMsg = `${facts}

Gere um JSON com:
{
  "historical_summary": "3 parágrafos (300-450 palavras) cobrindo: 1) trajetória geral em Copas, 2) maiores conquistas/momentos, 3) cenário para a Copa 2026. Use apenas os fatos acima.",
  "meta_description": "Texto único, máximo 155 caracteres, com palavras-chave: nome da seleção, Copa do Mundo 2026, histórico, elenco.",
  "seo_keywords": ["array de 8-12 palavras/expressões em pt-BR"],
  "faqs": [
    { "q": "pergunta", "a": "resposta curta baseada nos fatos" }
  ]
}
Inclua 4 a 6 FAQs úteis e factuais (ex.: quantos títulos, primeira Copa, melhor campanha, técnico atual, grupo em 2026).`;

    const raw = await callAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ]);
    const parsed = JSON.parse(raw);

    const updates: Record<string, any> = {
      historical_summary: parsed.historical_summary ?? null,
      meta_description: parsed.meta_description ?? null,
      seo_keywords: Array.isArray(parsed.seo_keywords) ? parsed.seo_keywords : null,
    };
    await supabase.from("world_cup_2026_teams").update(updates).eq("id", team.id);

    // Save FAQs as an ai_analysis row so the page can render them
    if (Array.isArray(parsed.faqs) && parsed.faqs.length) {
      await supabase.from("world_cup_2026_ai_analyses").insert({
        team_id: team.id,
        analysis_type: "team_faq",
        title: `FAQ — ${team.name} na Copa 2026`,
        content: JSON.stringify(parsed.faqs),
        confidence_score: 0.9,
        has_enough_data: true,
        model_used: "google/gemini-2.5-flash",
      });
    }

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: 1,
      payload_snapshot: { slug },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, slug, ...updates, faqs: parsed.faqs ?? [] }), {
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
