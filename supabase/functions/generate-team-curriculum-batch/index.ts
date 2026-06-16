import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ITEMS_PER_INVOCATION = 8; // ~8 * (chamada OpenAI ~15s + sleep) cabe nos 150s
const SLEEP_MS = 1500;

async function getTeamIdsFromLeague(supabase: any, liga_id: string): Promise<string[]> {
  // distinct times que jogaram nesta liga nos últimos 36 meses
  const since = new Date();
  since.setMonth(since.getMonth() - 36);
  const isoSince = since.toISOString().slice(0, 10);

  const ids = new Set<string>();
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("partidas")
      .select("time_casa_id, time_fora_id")
      .eq("liga_id", liga_id)
      .gte("data", isoSince)
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.time_casa_id) ids.add(r.time_casa_id);
      if (r.time_fora_id) ids.add(r.time_fora_id);
    }
    if (data.length < pageSize) break;
    page++;
    if (page > 20) break;
  }
  return Array.from(ids);
}

async function teamHasCurriculum(supabase: any, team_id: string): Promise<boolean> {
  const { count: titleCount } = await supabase
    .from("team_titles")
    .select("id", { count: "exact", head: true })
    .eq("team_id", team_id);
  if ((titleCount ?? 0) > 0) return true;
  const { count: partCount } = await supabase
    .from("team_participations")
    .select("id", { count: "exact", head: true })
    .eq("team_id", team_id);
  return (partCount ?? 0) > 0;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    let { job_id, liga_id, team_ids, only_empty = true, model = "gpt-4o", created_by, liga_nome } = body;

    // 1) Cria job se não veio job_id (primeira invocação)
    if (!job_id) {
      let resolvedTeamIds: string[] = team_ids || [];
      if ((!resolvedTeamIds || resolvedTeamIds.length === 0) && liga_id) {
        resolvedTeamIds = await getTeamIdsFromLeague(supabase, liga_id);
      }
      if (resolvedTeamIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "Nenhum time encontrado para o lote" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newJob, error: insErr } = await supabase
        .from("team_curriculum_jobs")
        .insert({
          liga_id: liga_id ?? null,
          liga_nome: liga_nome ?? null,
          team_ids: resolvedTeamIds,
          only_empty,
          total: resolvedTeamIds.length,
          status: "running",
          started_at: new Date().toISOString(),
          created_by: created_by ?? null,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      job_id = newJob.id;

      // dispara self com job_id e responde imediatamente ao cliente
      fetch(`${SUPABASE_URL}/functions/v1/generate-team-curriculum-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ job_id, model }),
      }).catch((e) => console.error("self-invoke failed", e));

      return new Response(JSON.stringify({ success: true, job_id, total: resolvedTeamIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Processa um chunk
    const { data: job, error: jobErr } = await supabase
      .from("team_curriculum_jobs")
      .select("*")
      .eq("id", job_id)
      .maybeSingle();
    if (jobErr || !job) throw jobErr || new Error("Job não encontrado");

    if (job.status === "done" || job.status === "failed") {
      return new Response(JSON.stringify({ success: true, status: job.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remaining = (job.team_ids as string[]).slice(job.processed);
    const chunk = remaining.slice(0, ITEMS_PER_INVOCATION);
    const errorLog = Array.isArray(job.error_log) ? [...job.error_log] : [];
    let processed = job.processed;
    let succeeded = job.succeeded;
    let skippedExisting = job.skipped_existing;
    let skippedLowConf = job.skipped_low_conf;
    let failed = job.failed;

    for (const tid of chunk) {
      // buscar nome para UI
      const { data: t } = await supabase.from("times").select("nome").eq("id", tid).maybeSingle();
      await supabase.from("team_curriculum_jobs").update({
        current_team_id: tid,
        current_team_nome: t?.nome ?? null,
      }).eq("id", job_id);

      try {
        if (job.only_empty && (await teamHasCurriculum(supabase, tid))) {
          skippedExisting++;
        } else {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-team-curriculum`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
              apikey: ANON_KEY,
            },
            body: JSON.stringify({ team_id: tid, model }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            failed++;
            errorLog.push({ team_id: tid, nome: t?.nome, error: json.error || `HTTP ${res.status}` });
          } else if (json.confidence === "low") {
            skippedLowConf++;
            errorLog.push({ team_id: tid, nome: t?.nome, info: "low_confidence", identified_as: json.identified_as });
          } else {
            succeeded++;
          }
        }
      } catch (e: any) {
        failed++;
        errorLog.push({ team_id: tid, nome: t?.nome, error: String(e.message || e) });
      }

      processed++;
      await supabase.from("team_curriculum_jobs").update({
        processed, succeeded, skipped_existing: skippedExisting,
        skipped_low_conf: skippedLowConf, failed,
        error_log: errorLog.slice(-200),
      }).eq("id", job_id);

      await sleep(SLEEP_MS);
    }

    const isDone = processed >= (job.team_ids as string[]).length;
    await supabase.from("team_curriculum_jobs").update({
      status: isDone ? "done" : "running",
      finished_at: isDone ? new Date().toISOString() : null,
      current_team_id: null,
      current_team_nome: null,
    }).eq("id", job_id);

    if (!isDone) {
      // re-invoke
      fetch(`${SUPABASE_URL}/functions/v1/generate-team-curriculum-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ job_id, model }),
      }).catch((e) => console.error("self-reinvoke failed", e));
    }

    return new Response(JSON.stringify({ success: true, job_id, processed, total: (job.team_ids as string[]).length, done: isDone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("batch error", err);
    return new Response(JSON.stringify({ success: false, error: String((err as Error).message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
