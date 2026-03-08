import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const SAFETY_TIMEOUT = 110_000;
  const startTime = Date.now();

  try {
    const { action, batch_size, batch_id } = await req.json();
    const shouldStop = () => Date.now() - startTime > SAFETY_TIMEOUT;
    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callFn = async (fnName: string, body: any) => {
      const resp = await fetch(`${baseUrl}/functions/v1/${fnName}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return resp.json();
    };

    // ========== PROCESS PENDING JOBS ==========
    if (action === "process_pending") {
      const limit = batch_size || 3;

      const { data: pendingJobs } = await supabase.from("kaggle_import_jobs")
        .select("id, dataset_id, dataset_file_id, status")
        .in("status", ["pending", "downloading", "extracting", "mapping", "awaiting_review"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(limit);

      const results: any[] = [];

      for (const job of pendingJobs || []) {
        if (shouldStop()) break;

        try {
          if (job.status === "pending" || job.status === "extracting") {
            // Profile
            const profileResult = await callFn("kaggle-process", { action: "profile", job_id: job.id });
            results.push({ job_id: job.id, step: "profile", result: profileResult });

            if (shouldStop()) break;

            // Stage
            const stageResult = await callFn("kaggle-process", { action: "stage", job_id: job.id });
            results.push({ job_id: job.id, step: "stage", result: stageResult });

            if (shouldStop()) break;

            // Resolve
            const resolveResult = await callFn("kaggle-resolve", { job_id: job.id });
            results.push({ job_id: job.id, step: "resolve", result: resolveResult });

          } else if (job.status === "mapping") {
            // Stage then resolve
            const stageResult = await callFn("kaggle-process", { action: "stage", job_id: job.id });
            results.push({ job_id: job.id, step: "stage", result: stageResult });

            if (shouldStop()) break;

            const resolveResult = await callFn("kaggle-resolve", { job_id: job.id });
            results.push({ job_id: job.id, step: "resolve", result: resolveResult });

          } else if (job.status === "awaiting_review") {
            // Resolve only
            const resolveResult = await callFn("kaggle-resolve", { job_id: job.id });
            results.push({ job_id: job.id, step: "resolve", result: resolveResult });
          }
        } catch (err) {
          results.push({ job_id: job.id, error: err.message });
          await supabase.from("kaggle_import_logs").insert({
            job_id: job.id, stage: "batch", level: "error", message: err.message,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== BATCH PROMOTE ==========
    if (action === "batch_promote") {
      const { data: readyJobs } = await supabase.from("kaggle_import_jobs")
        .select("id")
        .eq("status", "awaiting_review")
        .order("priority", { ascending: false })
        .limit(batch_size || 5);

      const results: any[] = [];

      for (const job of readyJobs || []) {
        if (shouldStop()) break;
        const result = await callFn("kaggle-promote", { job_id: job.id, promote_mode: "new_only" });
        results.push({ job_id: job.id, result });
      }

      return new Response(JSON.stringify({ success: true, promoted: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== RETRY FAILED ==========
    if (action === "retry_failed") {
      const { data: retries } = await supabase.from("kaggle_retry_queue")
        .select("*").eq("retry_status", "pending")
        .lte("next_retry_at", new Date().toISOString())
        .limit(batch_size || 3);

      const results: any[] = [];

      for (const r of retries || []) {
        if (shouldStop()) break;
        await supabase.from("kaggle_import_jobs").update({ status: "pending", retry_count: r.retry_count || 0 }).eq("id", r.job_id);
        await supabase.from("kaggle_retry_queue").update({ retry_status: "retried" }).eq("id", r.id);
        results.push({ retry_id: r.id, job_id: r.job_id });
      }

      return new Response(JSON.stringify({ success: true, retried: results.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
