import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getKaggleAuth() {
  const user = Deno.env.get("KAGGLE_USERNAME");
  const key = Deno.env.get("KAGGLE_KEY");
  if (!user || !key) throw new Error("KAGGLE_USERNAME ou KAGGLE_KEY não configurados nos secrets");
  return btoa(`${user}:${key}`);
}

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

    // ========== SEARCH DATASETS ==========
    if (action === "search_datasets") {
      const { query } = params;
      const auth = getKaggleAuth();
      const searchUrl = `https://www.kaggle.com/api/v1/datasets/list?search=${encodeURIComponent(query || "football")}&sortBy=hottest&maxSize=52428800&group=public`;

      const resp = await fetch(searchUrl, { headers: { Authorization: `Basic ${auth}` } });
      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ success: false, error: `Kaggle API: ${resp.status} - ${errText}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const datasets = await resp.json();
      // Filter to football-related datasets
      const filtered = (datasets || []).map((ds: any) => ({
        ref: ds.ref,
        title: ds.title,
        subtitle: ds.subtitle,
        creator: ds.creatorName,
        totalBytes: ds.totalBytes,
        lastUpdated: ds.lastUpdated,
        downloadCount: ds.downloadCount,
        voteCount: ds.voteCount,
        usabilityRating: ds.usabilityRating,
        url: ds.url ? `https://www.kaggle.com${ds.url}` : `https://www.kaggle.com/datasets/${ds.ref}`,
      }));

      return new Response(JSON.stringify({ success: true, datasets: filtered }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== LIST FILES OF A DATASET ==========
    if (action === "list_dataset_files") {
      const { dataset_slug } = params;
      if (!dataset_slug) throw new Error("dataset_slug é obrigatório");
      
      const auth = getKaggleAuth();
      const url = `https://www.kaggle.com/api/v1/datasets/view/${dataset_slug}`;
      const resp = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
      
      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ success: false, error: `Kaggle API: ${resp.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const meta = await resp.json();
      const files = (meta.datasetFiles || []).map((f: any) => ({
        name: f.name,
        totalBytes: f.totalBytes,
        columns: f.columns,
        description: f.description,
      }));

      return new Response(JSON.stringify({ success: true, files, datasetInfo: { title: meta.title, subtitle: meta.subtitle, description: meta.description } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== QUICK IMPORT (register + download + process) ==========
    if (action === "quick_import") {
      const { dataset_slug, dataset_title, file_name } = params;
      if (!dataset_slug || !file_name) throw new Error("dataset_slug e file_name são obrigatórios");

      // 1. Register dataset
      const { data: ds, error: dsErr } = await supabase.from("kaggle_datasets").upsert({
        dataset_slug,
        dataset_title: dataset_title || dataset_slug.split("/")[1],
        dataset_owner: dataset_slug.split("/")[0],
        dataset_url: `https://www.kaggle.com/datasets/${dataset_slug}`,
        dataset_category: "football",
        priority: 50,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider_slug,dataset_slug" }).select().single();

      if (dsErr) throw dsErr;

      // 2. Register file
      const { data: fileRec, error: fileErr } = await supabase.from("kaggle_dataset_files").upsert({
        dataset_id: ds.id,
        file_name,
        file_type: file_name.endsWith(".json") ? "json" : "csv",
        inferred_entity_type: file_name.toLowerCase().includes("match") || file_name.toLowerCase().includes("result") ? "matches" :
          file_name.toLowerCase().includes("team") ? "teams" :
          file_name.toLowerCase().includes("goal") || file_name.toLowerCase().includes("scorer") ? "scorers" : "unknown",
      }, { onConflict: "dataset_id,file_name" }).select().single();

      if (fileErr) throw fileErr;

      // 3. Create job
      const { data: job, error: jobErr } = await supabase.from("kaggle_import_jobs").insert({
        dataset_id: ds.id,
        dataset_file_id: fileRec.id,
        job_type: "full_import",
        priority: 50,
        status: "downloading",
      }).select().single();

      if (jobErr) throw jobErr;
      await log(job.id, "quick_import", "info", `Quick import started: ${dataset_slug}/${file_name}`);

      // 4. Download file from Kaggle
      const auth = getKaggleAuth();
      const apiUrl = `https://www.kaggle.com/api/v1/datasets/download/${dataset_slug}/${file_name}`;
      const resp = await fetch(apiUrl, { headers: { Authorization: `Basic ${auth}` } });

      if (!resp.ok) {
        const errText = await resp.text();
        await log(job.id, "download", "error", `Download failed: ${resp.status}`, { error: errText });
        await supabase.from("kaggle_import_jobs").update({ status: "failed", error_summary: `Download: ${resp.status}` }).eq("id", job.id);
        return new Response(JSON.stringify({ success: false, error: errText, job_id: job.id }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const rawText = await resp.text();
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawText));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      // 5. Store raw asset
      const { error: rawErr } = await supabase.from("kaggle_raw_assets").insert({
        job_id: job.id,
        dataset_file_id: fileRec.id,
        asset_type: file_name.endsWith(".json") ? "json" : "csv",
        raw_text: rawText,
        content_hash: hashHex,
      });

      if (rawErr) throw rawErr;

      // 6. Update job
      await supabase.from("kaggle_import_jobs").update({
        status: "extracting",
        started_at: new Date().toISOString(),
        total_rows_read: rawText.split("\n").length - 1,
      }).eq("id", job.id);

      await log(job.id, "download", "info", `Downloaded ${rawText.length} bytes, ${rawText.split("\n").length - 1} rows, hash: ${hashHex.substring(0, 12)}`);

      return new Response(JSON.stringify({
        success: true,
        job_id: job.id,
        dataset_id: ds.id,
        file_id: fileRec.id,
        rows: rawText.split("\n").length - 1,
        bytes: rawText.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
      await supabase.from("kaggle_import_jobs").update({ status: "extracting", started_at: new Date().toISOString() }).eq("id", job_id);
      await log(job_id, "upload", "info", `Raw asset stored, hash: ${content_hash}`);

      return new Response(JSON.stringify({ success: true, asset: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
