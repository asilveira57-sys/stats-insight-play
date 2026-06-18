// Batch processor: fires pre-match AI previews for ALL matches in background,
// with parallelism, retries, and persistent progress in world_cup_2026_sync_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CONCURRENCY = 5;

async function invokePreview(matchId: string, force: boolean) {
  const res = await fetch(`${PROJECT_URL}/functions/v1/wc2026-generate-match-preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({ match_id: matchId, force }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function runBatch(force: boolean, stage: string | null, onlyZeroZero: boolean, logId: string) {
  const supabase = createClient(PROJECT_URL, SERVICE_KEY);
  let q = supabase
    .from("world_cup_2026_matches")
    .select("id, stage, match_date")
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .order("match_date");
  if (stage) q = q.eq("stage", stage);
  const { data: matches } = await q;
  const list = matches ?? [];

  let pending = list;
  if (onlyZeroZero && list.length) {
    const { data: zeros } = await supabase
      .from("world_cup_2026_ai_analyses")
      .select("match_id")
      .eq("analysis_type", "pre_match")
      .eq("predicted_home_score", 0)
      .eq("predicted_away_score", 0)
      .in("match_id", list.map(m => m.id));
    const zeroSet = new Set((zeros ?? []).map((e: any) => e.match_id));
    pending = list.filter(m => zeroSet.has(m.id));
  } else if (!force && list.length) {
    const { data: existing } = await supabase
      .from("world_cup_2026_ai_analyses")
      .select("match_id")
      .eq("analysis_type", "pre_match")
      .in("match_id", list.map(m => m.id));
    const done = new Set((existing ?? []).map((e: any) => e.match_id));
    pending = list.filter(m => !done.has(m.id));
  }

  let ok = 0, fail = 0, skipped = list.length - pending.length;
  let cursor = 0;

  const tick = async () => {
    await supabase.from("world_cup_2026_sync_logs")
      .update({
        records_processed: ok,
        error_message: `pending=${pending.length} ok=${ok} fail=${fail} skipped=${skipped}`,
      }).eq("id", logId);
  };

  const worker = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= pending.length) return;
      const m = pending[idx];
      try {
        const r = await invokePreview(m.id, force);
        if ((r as any)?.skipped) skipped++; else ok++;
      } catch (e) {
        fail++;
        console.error("preview fail", m.id, e instanceof Error ? e.message : e);
      }
      if ((ok + fail) % 5 === 0) await tick();
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));

  await supabase.from("world_cup_2026_sync_logs").update({
    status: fail === 0 ? "success" : "partial",
    finished_at: new Date().toISOString(),
    records_processed: ok,
    error_message: `total=${list.length} ok=${ok} fail=${fail} skipped=${skipped}`,
  }).eq("id", logId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(PROJECT_URL, SERVICE_KEY);
    const { force = false, stage = null, only_zero_zero = false } = await req.json().catch(() => ({}));

    const { data: log } = await supabase.from("world_cup_2026_sync_logs").insert({
      sync_type: "ai_preview_batch",
      provider: "openai",
      status: "running",
      started_at: new Date().toISOString(),
    }).select("id").single();

    // Fire and forget
    // @ts-ignore EdgeRuntime is provided by Supabase runtime
    EdgeRuntime.waitUntil(runBatch(force || only_zero_zero, stage, only_zero_zero, log!.id));

    return new Response(JSON.stringify({ success: true, log_id: log!.id, message: "Batch started in background." }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
