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

  try {
    const body = await req.json();
    const { action, ...params } = body;

    const log = async (jobId: string | null, stage: string, level: string, message: string, payload?: any) => {
      await supabase.from("kaggle_import_logs").insert({
        job_id: jobId, stage, level, message,
        payload: payload ? JSON.stringify(payload) : null,
        dataset_file_id: params.dataset_file_id || null,
      });
    };

    // ========== REGISTER DATASET ==========
    if (action === "register_dataset") {
      const { dataset_slug, dataset_title, dataset_owner, dataset_url, dataset_description, dataset_category, country_scope, competition_scope, data_scope, priority } = params;

      const { data, error } = await supabase.from("kaggle_datasets").upsert({
        dataset_slug, dataset_title, dataset_owner: dataset_owner || dataset_slug.split("/")[0],
        dataset_url: dataset_url || `https://www.kaggle.com/datasets/${dataset_slug}`,
        dataset_description, dataset_category, country_scope, competition_scope, data_scope,
        priority: priority || 50, updated_at: new Date().toISOString(),
      }, { onConflict: "provider_slug,dataset_slug" }).select().single();

      if (error) throw error;
      await log(null, "register", "info", `Dataset registered: ${dataset_slug}`, { dataset_id: data.id });

      return new Response(JSON.stringify({ success: true, dataset: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== REGISTER FILES ==========
    if (action === "register_files") {
      const { dataset_id, files } = params;

      const inserts = files.map((f: any) => ({
        dataset_id,
        file_name: f.file_name,
        file_type: f.file_type || "csv",
        content_format: f.content_format,
        inferred_entity_type: f.inferred_entity_type || "unknown",
        file_size_bytes: f.file_size_bytes,
      }));

      const { data, error } = await supabase.from("kaggle_dataset_files")
        .upsert(inserts, { onConflict: "dataset_id,file_name" }).select();

      if (error) throw error;
      await log(null, "register_files", "info", `${inserts.length} files registered`, { dataset_id });

      return new Response(JSON.stringify({ success: true, files: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== CREATE JOB ==========
    if (action === "create_job") {
      const { dataset_id, dataset_file_id, job_type, priority, requested_by } = params;

      const { data: job, error } = await supabase.from("kaggle_import_jobs").insert({
        dataset_id, dataset_file_id, job_type: job_type || "full_import",
        priority: priority || 50, requested_by, status: "pending",
      }).select().single();

      if (error) throw error;
      await log(job.id, "create_job", "info", `Job created for dataset_file ${dataset_file_id}`);

      return new Response(JSON.stringify({ success: true, job }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== UPLOAD RAW DATA (manual upload) ==========
    if (action === "upload_raw") {
      const { job_id, dataset_file_id, raw_text, content_hash, asset_type } = params;

      // Check hash to avoid reprocessing
      if (content_hash) {
        const { data: existing } = await supabase.from("kaggle_raw_assets")
          .select("id").eq("content_hash", content_hash).limit(1);
        if (existing?.length) {
          await log(job_id, "upload", "info", `Skipped: identical hash ${content_hash}`);
          return new Response(JSON.stringify({ success: true, skipped: true, existing_id: existing[0].id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      const { data, error } = await supabase.from("kaggle_raw_assets").insert({
        job_id, dataset_file_id, asset_type: asset_type || "csv",
        raw_text, content_hash,
      }).select().single();

      if (error) throw error;

      // Update job status
      await supabase.from("kaggle_import_jobs").update({ status: "extracting", started_at: new Date().toISOString() }).eq("id", job_id);
      await log(job_id, "upload", "info", `Raw asset stored, hash: ${content_hash}`);

      return new Response(JSON.stringify({ success: true, asset: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== DOWNLOAD FROM KAGGLE API ==========
    if (action === "download_kaggle") {
      const { job_id, dataset_file_id, dataset_slug, file_name } = params;

      await supabase.from("kaggle_import_jobs").update({ status: "downloading" }).eq("id", job_id);
      await log(job_id, "download", "info", `Starting download: ${dataset_slug}/${file_name}`);

      // Check rate limits
      const { data: rl } = await supabase.from("kaggle_rate_limit_controls")
        .select("*").eq("provider_slug", "kaggle").eq("is_active", true).limit(1);

      if (rl?.length) {
        const { data: activeJobs } = await supabase.from("kaggle_import_jobs")
          .select("id").in("status", ["downloading", "extracting", "profiling"]);
        if (activeJobs && activeJobs.length >= rl[0].max_concurrent_jobs) {
          await supabase.from("kaggle_import_jobs").update({ status: "queued" }).eq("id", job_id);
          await log(job_id, "download", "warn", "Queued: max concurrent jobs reached");
          return new Response(JSON.stringify({ success: false, queued: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Get Kaggle credentials
      const { data: kaggleUser } = await supabase.from("kaggle_provider_configs")
        .select("config_value").eq("config_key", "kaggle_username").limit(1).single();
      const { data: kaggleKey } = await supabase.from("kaggle_provider_configs")
        .select("config_value").eq("config_key", "kaggle_key").limit(1).single();

      if (!kaggleUser?.config_value || !kaggleKey?.config_value) {
        await log(job_id, "download", "error", "Kaggle API credentials not configured");
        await supabase.from("kaggle_import_jobs").update({ status: "failed", error_summary: "Missing Kaggle credentials" }).eq("id", job_id);
        return new Response(JSON.stringify({ success: false, error: "Missing Kaggle credentials" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const auth = btoa(`${kaggleUser.config_value}:${kaggleKey.config_value}`);
      const apiUrl = `https://www.kaggle.com/api/v1/datasets/download/${dataset_slug}/${file_name}`;

      const resp = await fetch(apiUrl, { headers: { Authorization: `Basic ${auth}` } });

      if (!resp.ok) {
        const errText = await resp.text();
        await log(job_id, "download", "error", `Download failed: ${resp.status}`, { error: errText });
        await supabase.from("kaggle_import_jobs").update({ status: "failed", error_summary: `Download failed: ${resp.status}` }).eq("id", job_id);

        // Queue retry
        await supabase.from("kaggle_retry_queue").insert({
          job_id, reason: `HTTP ${resp.status}`,
          next_retry_at: new Date(Date.now() + 60000).toISOString(),
        });

        return new Response(JSON.stringify({ success: false, error: errText }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const rawText = await resp.text();
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawText));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      // Check hash
      const { data: existingAsset } = await supabase.from("kaggle_raw_assets")
        .select("id").eq("content_hash", hashHex).limit(1);
      if (existingAsset?.length) {
        await log(job_id, "download", "info", `Skipped: hash match ${hashHex}`);
        await supabase.from("kaggle_import_jobs").update({ status: "extracting" }).eq("id", job_id);
        return new Response(JSON.stringify({ success: true, skipped: true, hash: hashHex }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Determine if ZIP
      const isZip = file_name.endsWith(".zip") || resp.headers.get("content-type")?.includes("zip");

      const { data: asset } = await supabase.from("kaggle_raw_assets").insert({
        job_id, dataset_file_id, asset_type: isZip ? "zip" : "csv",
        raw_text: isZip ? null : rawText, content_hash: hashHex,
      }).select().single();

      await supabase.from("kaggle_import_jobs").update({ status: "extracting" }).eq("id", job_id);
      await log(job_id, "download", "info", `Downloaded ${rawText.length} bytes, hash: ${hashHex}`);

      return new Response(JSON.stringify({ success: true, asset, hash: hashHex }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
