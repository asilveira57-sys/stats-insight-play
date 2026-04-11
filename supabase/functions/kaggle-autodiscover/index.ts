import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getKaggleAuth() {
  const user = Deno.env.get("KAGGLE_USERNAME");
  const key = Deno.env.get("KAGGLE_KEY");
  if (!user || !key) throw new Error("KAGGLE_USERNAME ou KAGGLE_KEY não configurados");
  return btoa(`${user}:${key}`);
}

const MATCH_FILE_PATTERNS = /match|result|game|score|fixture|partida|jogo/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { queries, max_files } = await req.json();
    const auth = getKaggleAuth();
    const limit = Math.min(max_files || 5, 20);

    // Get already-imported dataset slugs to skip
    const { data: existingDatasets } = await supabase
      .from("kaggle_datasets")
      .select("dataset_slug");
    const importedSlugs = new Set((existingDatasets || []).map((d: any) => d.dataset_slug));

    // Get already-imported file hashes to skip
    const { data: existingJobs } = await supabase
      .from("kaggle_import_jobs")
      .select("dataset_id, dataset_file_id, status, kaggle_datasets(dataset_slug), kaggle_dataset_files(file_name)")
      .in("status", ["completed", "completed_with_alerts", "pending", "downloading", "extracting", "profiling", "mapping", "staging", "awaiting_review"]);
    
    const importedFileKeys = new Set(
      (existingJobs || []).map((j: any) => 
        `${(j as any).kaggle_datasets?.dataset_slug}::${(j as any).kaggle_dataset_files?.file_name}`
      )
    );

    const searchQueries = queries || [
      "football results", "soccer matches", "fifa world cup",
      "brasileirao", "premier league", "champions league",
      "international football", "football statistics",
    ];

    interface Candidate {
      dataset_slug: string;
      dataset_title: string;
      file_name: string;
      file_size: number;
      dataset_downloads: number;
      status: "waiting";
    }

    const candidates: Candidate[] = [];
    const seenFiles = new Set<string>();

    for (const query of searchQueries) {
      if (candidates.length >= limit) break;

      const searchUrl = `https://www.kaggle.com/api/v1/datasets/list?search=${encodeURIComponent(query)}&sortBy=hottest&maxSize=52428800&group=public`;
      const resp = await fetch(searchUrl, { headers: { Authorization: `Basic ${auth}` } });
      if (!resp.ok) continue;

      const datasets = await resp.json();

      for (const ds of datasets || []) {
        if (candidates.length >= limit) break;
        const slug = ds.ref;
        if (!slug) continue;

        // Try to get files
        try {
          const filesUrl = `https://www.kaggle.com/api/v1/datasets/view/${slug}`;
          const fResp = await fetch(filesUrl, { headers: { Authorization: `Basic ${auth}` } });
          if (!fResp.ok) continue;

          const meta = await fResp.json();
          const rawFiles = meta.datasetFiles || meta.files || meta.currentDatasetVersionFiles || [];

          for (const f of rawFiles) {
            if (candidates.length >= limit) break;
            const fileName = f.name || f.fileName;
            if (!fileName) continue;

            // Only CSV files
            if (!fileName.toLowerCase().endsWith(".csv")) continue;

            // Only match-related files
            if (!MATCH_FILE_PATTERNS.test(fileName)) continue;

            const fileKey = `${slug}::${fileName}`;
            if (seenFiles.has(fileKey) || importedFileKeys.has(fileKey)) continue;
            seenFiles.add(fileKey);

            candidates.push({
              dataset_slug: slug,
              dataset_title: ds.title || slug,
              file_name: fileName,
              file_size: f.totalBytes || 0,
              dataset_downloads: ds.downloadCount || 0,
              status: "waiting",
            });
          }
        } catch {
          // skip dataset on error
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      candidates,
      total: candidates.length,
      queries_searched: searchQueries.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
