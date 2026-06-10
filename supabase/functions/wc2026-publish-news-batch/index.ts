// Background batch: for every WC2026 match in a given stage (default: group/phase 1),
// ensure a pre_match AI analysis exists, then upsert a published noticia linked to it.
// Resilient: retries on failure, idempotent, resumable.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STAGE_PT: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "Segunda Fase",
  round_of_16: "Oitavas de Final",
  quarter_final: "Quartas de Final",
  semi_final: "Semifinal",
  third_place: "Disputa do 3º Lugar",
  final: "Final",
};

function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, label = ""): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      console.error(`[retry ${i}/${attempts}] ${label}:`, e instanceof Error ? e.message : e);
      await new Promise(r => setTimeout(r, 1500 * i));
    }
  }
  throw lastErr;
}

async function invokePreview(matchId: string, force: boolean) {
  const res = await fetch(`${PROJECT_URL}/functions/v1/wc2026-generate-match-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    body: JSON.stringify({ match_id: matchId, force }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`preview ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function publishOne(supabase: any, match: any, force: boolean) {
  // 1) Ensure pre_match analysis
  let analysis: any = null;
  if (!force) {
    const { data } = await supabase.from("world_cup_2026_ai_analyses")
      .select("*").eq("match_id", match.id).eq("analysis_type", "pre_match").maybeSingle();
    analysis = data;
  }
  if (!analysis) {
    await withRetry(() => invokePreview(match.id, !!force), 3, `preview ${match.id}`);
    const { data } = await supabase.from("world_cup_2026_ai_analyses")
      .select("*").eq("match_id", match.id).eq("analysis_type", "pre_match").maybeSingle();
    analysis = data;
  }
  if (!analysis) throw new Error("analysis missing after generation");

  const stageLabel = STAGE_PT[match.stage] ?? match.stage;
  const groupSuffix = match.group_letter ? ` (Grupo ${match.group_letter})` : "";
  const titulo = `Copa 2026 — ${match.home?.name} x ${match.away?.name}: análise pré-jogo${groupSuffix}`;
  const slug = `copa-2026-${slugify(match.home?.slug || match.home?.name)}-x-${slugify(match.away?.slug || match.away?.name)}-${match.stage}${match.group_letter ? `-grupo-${match.group_letter.toLowerCase()}` : ""}`;

  const dateStr = match.match_date
    ? new Date(match.match_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" })
    : "";

  const intro = `**${stageLabel}${groupSuffix}** · ${dateStr} (horário de Brasília)${match.stadium ? ` · ${match.stadium}${match.city ? ` — ${match.city}` : ""}` : ""}.\n\n`;
  const placar = (analysis.predicted_home_score != null && analysis.predicted_away_score != null)
    ? `\n\n### Palpite Statball\n**${match.home?.name} ${analysis.predicted_home_score} x ${analysis.predicted_away_score} ${match.away?.name}** — confiança: ${analysis.confidence_score >= 0.8 ? "alta" : analysis.confidence_score >= 0.55 ? "média" : "baixa"}.\n`
    : "";
  const cta = `\n\n---\n[Ver detalhes da partida, palpite do usuário e escalações](/copa-2026/jogos/${match.id})`;

  const texto = intro + (analysis.content ?? "") + placar + cta;
  const resumo = (analysis.content ?? "").replace(/[#*_`>-]/g, "").replace(/\s+/g, " ").trim().slice(0, 240);

  // 2) Upsert noticia by slug (idempotent / resumable)
  const { data: existing } = await supabase.from("noticias").select("id").eq("slug", slug).maybeSingle();
  const payload = {
    titulo,
    resumo,
    texto,
    slug,
    publicada: true,
    data_publicacao: new Date().toISOString(),
    world_cup_2026_match_id: match.id,
  };
  if (existing?.id) {
    const { error } = await supabase.from("noticias").update(payload).eq("id", existing.id);
    if (error) throw new Error(`noticia update: ${error.message}`);
    return { updated: true, slug };
  } else {
    const { error } = await supabase.from("noticias").insert(payload);
    if (error) throw new Error(`noticia insert: ${error.message}`);
    return { created: true, slug };
  }
}

async function runBatch(stage: string, force: boolean, logId: string) {
  const supabase = createClient(PROJECT_URL, SERVICE_KEY);

  const { data: matches } = await supabase
    .from("world_cup_2026_matches")
    .select(`id, stage, group_letter, match_date, stadium, city,
      home:home_team_id(id,name,slug),
      away:away_team_id(id,name,slug)`)
    .eq("stage", stage)
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .order("match_date");

  const list = matches ?? [];
  let ok = 0, fail = 0;
  const errors: string[] = [];

  const tick = async (extra?: string) => {
    await supabase.from("world_cup_2026_sync_logs").update({
      records_processed: ok,
      error_message: `total=${list.length} ok=${ok} fail=${fail}${extra ? ` · ${extra}` : ""}`,
    }).eq("id", logId);
  };

  for (const m of list) {
    const label = `${(m as any).home?.name} x ${(m as any).away?.name}`;
    try {
      await withRetry(() => publishOne(supabase, m, force), 3, label);
      ok++;
      await tick(`último: ${label}`);
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${label}: ${msg}`);
      console.error("publish fail", label, msg);
      await tick(`falha em ${label}`);
    }
  }

  await supabase.from("world_cup_2026_sync_logs").update({
    status: fail === 0 ? "success" : "partial",
    finished_at: new Date().toISOString(),
    records_processed: ok,
    error_message: `total=${list.length} ok=${ok} fail=${fail}${errors.length ? ` · ${errors.slice(0,3).join(" | ")}` : ""}`,
  }).eq("id", logId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(PROJECT_URL, SERVICE_KEY);
    const { stage = "group", force = false } = await req.json().catch(() => ({}));

    const { data: log } = await supabase.from("world_cup_2026_sync_logs").insert({
      sync_type: "news_publish_batch",
      provider: "openai",
      status: "running",
      started_at: new Date().toISOString(),
    }).select("id").single();

    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(runBatch(stage, !!force, log!.id));

    return new Response(JSON.stringify({ success: true, log_id: log!.id, message: `Publicando notícias da fase ${stage} em background.` }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
