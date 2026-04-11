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
    const body = await req.json();
    const { action, batch_size, batch_id } = body;
    const shouldStop = () => Date.now() - startTime > SAFETY_TIMEOUT;
    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callFn = async (fnName: string, body: any): Promise<{ ok: boolean; data: any }> => {
      const resp = await fetch(`${baseUrl}/functions/v1/${fnName}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!resp.ok) {
        return { ok: false, data: { error: data?.error || `HTTP ${resp.status}: ${text.substring(0, 200)}` } };
      }
      if (data?.success === false) {
        return { ok: false, data };
      }
      return { ok: true, data };
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
            results.push({ job_id: job.id, step: "profile", ...profileResult });
            if (!profileResult.ok) {
              await supabase.from("kaggle_import_jobs").update({ 
                status: "failed", error_summary: `Profile failed: ${profileResult.data?.error}` 
              }).eq("id", job.id);
              await supabase.from("kaggle_import_logs").insert({
                job_id: job.id, stage: "batch-profile", level: "error", message: profileResult.data?.error || "Profile failed",
              });
              continue;
            }

            if (shouldStop()) break;

            // Stage
            const stageResult = await callFn("kaggle-process", { action: "stage", job_id: job.id });
            results.push({ job_id: job.id, step: "stage", ...stageResult });
            if (!stageResult.ok) {
              await supabase.from("kaggle_import_jobs").update({ 
                status: "failed", error_summary: `Stage failed: ${stageResult.data?.error}` 
              }).eq("id", job.id);
              await supabase.from("kaggle_import_logs").insert({
                job_id: job.id, stage: "batch-stage", level: "error", message: stageResult.data?.error || "Stage failed",
              });
              continue;
            }

            if (shouldStop()) break;

            // Resolve
            const resolveResult = await callFn("kaggle-resolve", { job_id: job.id });
            results.push({ job_id: job.id, step: "resolve", ...resolveResult });
            if (!resolveResult.ok) {
              await supabase.from("kaggle_import_jobs").update({ 
                status: "failed", error_summary: `Resolve failed: ${resolveResult.data?.error}` 
              }).eq("id", job.id);
              await supabase.from("kaggle_import_logs").insert({
                job_id: job.id, stage: "batch-resolve", level: "error", message: resolveResult.data?.error || "Resolve failed",
              });
              continue;
            }

          } else if (job.status === "mapping") {
            const stageResult = await callFn("kaggle-process", { action: "stage", job_id: job.id });
            results.push({ job_id: job.id, step: "stage", ...stageResult });
            if (!stageResult.ok) {
              await supabase.from("kaggle_import_jobs").update({ 
                status: "failed", error_summary: `Stage failed: ${stageResult.data?.error}` 
              }).eq("id", job.id);
              continue;
            }

            if (shouldStop()) break;

            const resolveResult = await callFn("kaggle-resolve", { job_id: job.id });
            results.push({ job_id: job.id, step: "resolve", ...resolveResult });
            if (!resolveResult.ok) {
              await supabase.from("kaggle_import_jobs").update({ 
                status: "failed", error_summary: `Resolve failed: ${resolveResult.data?.error}` 
              }).eq("id", job.id);
              continue;
            }

          } else if (job.status === "awaiting_review") {
            const resolveResult = await callFn("kaggle-resolve", { job_id: job.id });
            results.push({ job_id: job.id, step: "resolve", ...resolveResult });
            if (!resolveResult.ok) {
              await supabase.from("kaggle_import_jobs").update({ 
                status: "failed", error_summary: `Resolve failed: ${resolveResult.data?.error}` 
              }).eq("id", job.id);
              continue;
            }
          }
        } catch (err) {
          const errMsg = err.message || "Unknown error";
          results.push({ job_id: job.id, error: errMsg });
          await supabase.from("kaggle_import_jobs").update({ 
            status: "failed", error_summary: errMsg 
          }).eq("id", job.id);
          await supabase.from("kaggle_import_logs").insert({
            job_id: job.id, stage: "batch", level: "error", message: errMsg,
          });
        }
      }

      const hasErrors = results.some(r => !r.ok || r.error);
      return new Response(JSON.stringify({ 
        success: true, 
        processed: results.length, 
        errors: results.filter(r => !r.ok || r.error).length,
        results 
      }), {
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
        results.push({ job_id: job.id, ...result });
        if (!result.ok) {
          await supabase.from("kaggle_import_jobs").update({ 
            status: "failed", error_summary: `Promote failed: ${result.data?.error}` 
          }).eq("id", job.id);
        }
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

    // ========== AUTO PIPELINE ==========
    if (action === "auto_pipeline") {
      const files = body?.files;
      if (!Array.isArray(files) || files.length === 0) {
        return new Response(JSON.stringify({ error: "files array is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const items: { dataset_slug: string; dataset_title: string; file_name: string }[] = files;
      const results: any[] = [];

      for (const item of items) {
        if (shouldStop()) {
          results.push({ ...item, status: "skipped", reason: "timeout" });
          break;
        }

        try {
          // Step 1: Quick import (download)
          const dlResult = await callFn("kaggle-import", {
            action: "quick_import",
            dataset_slug: item.dataset_slug,
            dataset_title: item.dataset_title,
            file_name: item.file_name,
          });
          if (!dlResult.ok) {
            // Circuit breaker on 402/429
            const errMsg = dlResult.data?.error || "";
            if (errMsg.includes("402") || errMsg.includes("429") || errMsg.includes("Credits")) {
              results.push({ ...item, status: "circuit_breaker", error: errMsg });
              break;
            }
            results.push({ ...item, status: "failed", step: "download", error: errMsg });
            continue;
          }

          const jobId = dlResult.data?.job_id;
          if (!jobId) {
            results.push({ ...item, status: "failed", step: "download", error: "No job_id returned" });
            continue;
          }

          if (shouldStop()) { results.push({ ...item, status: "partial", step: "downloaded", job_id: jobId }); break; }

          // Step 2: Profile
          const profResult = await callFn("kaggle-process", { action: "profile", job_id: jobId });
          if (!profResult.ok) { results.push({ ...item, status: "failed", step: "profile", job_id: jobId, error: profResult.data?.error }); continue; }

          if (shouldStop()) { results.push({ ...item, status: "partial", step: "profiled", job_id: jobId }); break; }

          // Step 3: Stage
          const stageResult = await callFn("kaggle-process", { action: "stage", job_id: jobId });
          if (!stageResult.ok) { results.push({ ...item, status: "failed", step: "stage", job_id: jobId, error: stageResult.data?.error }); continue; }

          if (shouldStop()) { results.push({ ...item, status: "partial", step: "staged", job_id: jobId }); break; }

          // Step 4: Resolve (loop)
          let resolveComplete = false;
          for (let pass = 0; pass < 10; pass++) {
            if (shouldStop()) break;
            const rr = await callFn("kaggle-resolve", { job_id: jobId });
            if (!rr.ok) break;
            if (rr.data?.complete) { resolveComplete = true; break; }
          }

          if (shouldStop()) { results.push({ ...item, status: "partial", step: "resolving", job_id: jobId }); break; }

          // Step 5: Promote
          const promResult = await callFn("kaggle-promote", { job_id: jobId, promote_mode: "all_resolved" });
          results.push({
            ...item,
            status: promResult.ok ? "completed" : "failed",
            step: "promote",
            job_id: jobId,
            promoted: promResult.data?.promoted || 0,
            updated: promResult.data?.updated || 0,
            resolve_complete: resolveComplete,
          });
        } catch (err) {
          results.push({ ...item, status: "failed", error: err.message });
        }
      }

      const completed = results.filter(r => r.status === "completed").length;
      const totalPromoted = results.reduce((s, r) => s + (r.promoted || 0), 0);
      const hasCircuitBreaker = results.some(r => r.status === "circuit_breaker");
      const remaining = items.filter(item => !results.some(r => r.dataset_slug === item.dataset_slug && r.file_name === item.file_name));

      return new Response(JSON.stringify({
        success: true,
        complete: remaining.length === 0 && !hasCircuitBreaker,
        completed,
        total_promoted: totalPromoted,
        circuit_breaker: hasCircuitBreaker,
        results,
        remaining,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
