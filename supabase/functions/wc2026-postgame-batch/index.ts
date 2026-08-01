// Batch pós-jogo da Copa 2026: para cada partida finalizada SEM análise `postgame`,
// invoca `wc2026-generate-postgame` (crônica + imagem + notícia com SEO).
// Roda em background, respeita um orçamento de tempo e se re-invoca até concluir.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function pending(supabase: any, stage?: string) {
  let q = supabase
    .from("world_cup_2026_matches")
    .select("id, stage, match_date, home:home_team_id(name), away:away_team_id(name)")
    .eq("status", "finished")
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .order("match_date");
  if (stage) q = q.eq("stage", stage);
  const { data: matches } = await q;
  const { data: done } = await supabase
    .from("world_cup_2026_ai_analyses")
    .select("match_id")
    .eq("analysis_type", "postgame");
  const doneSet = new Set((done ?? []).map((d: any) => d.match_id));
  return (matches ?? []).filter((m: any) => !doneSet.has(m.id));
}

async function generateOne(matchId: string) {
  const res = await fetch(`${PROJECT_URL}/functions/v1/wc2026-generate-postgame`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    body: JSON.stringify({ match_id: matchId }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  return text;
}

async function runBatch(opts: { stage?: string; budgetMs: number; logId: string; chain: boolean }) {
  const supabase = createClient(PROJECT_URL, SERVICE_KEY);
  const started = Date.now();
  let ok = 0, fail = 0;
  const errors: string[] = [];

  const list = await pending(supabase, opts.stage);

  for (const m of list) {
    if (Date.now() - started > opts.budgetMs) break;
    const label = `${m.home?.name} x ${m.away?.name} (${m.stage})`;
    try {
      await generateOne(m.id);
      ok++;
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${label}: ${msg}`);
      console.error("postgame fail", label, msg);
    }
    await supabase.from("world_cup_2026_sync_logs").update({
      records_processed: ok,
      error_message: `pendentes=${list.length} ok=${ok} fail=${fail} · último: ${label}`,
    }).eq("id", opts.logId);
  }

  const remaining = (await pending(supabase, opts.stage)).length;

  await supabase.from("world_cup_2026_sync_logs").update({
    status: remaining === 0 ? (fail === 0 ? "success" : "partial") : "partial",
    finished_at: new Date().toISOString(),
    records_processed: ok,
    error_message: `ok=${ok} fail=${fail} restantes=${remaining}${errors.length ? ` · ${errors.slice(0, 3).join(" | ")}` : ""}`,
  }).eq("id", opts.logId);

  // Re-invoca para continuar de onde parou (evita timeout da edge function)
  if (remaining > 0 && ok > 0 && opts.chain) {
    await fetch(`${PROJECT_URL}/functions/v1/wc2026-postgame-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      body: JSON.stringify({ stage: opts.stage, chain: true }),
    }).catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(PROJECT_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const stage: string | undefined = body.stage || undefined;
    const budgetMs: number = Math.min(Number(body.budget_ms) || 240000, 300000);
    const chain: boolean = body.chain !== false;

    if (body.status_only) {
      const list = await pending(supabase, stage);
      return new Response(JSON.stringify({ success: true, pending: list.length }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: log } = await supabase.from("world_cup_2026_sync_logs").insert({
      sync_type: "postgame_batch",
      provider: "openai",
      status: "running",
      started_at: new Date().toISOString(),
    }).select("id").single();

    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(runBatch({ stage, budgetMs, logId: log!.id, chain }));

    return new Response(JSON.stringify({ success: true, log_id: log!.id, message: "Gerando crônicas pós-jogo em background." }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
