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

// Padrões de arquivos relacionados a partidas/jogos (PT + EN)
const MATCH_FILE_PATTERNS =
  /match|result|game|score|fixture|partida|jogo|rodada|brasileir|campeonato|serie|copa|estadual|libertadores|sul-?americana/i;

const DEFAULT_QUERIES = [
  "brasileirao",
  "campeonato brasileiro",
  "serie a brasil",
  "serie b brasil",
  "copa do brasil",
  "libertadores",
  "copa sul americana",
  "campeonato paulista",
  "campeonato carioca",
  "campeonato mineiro",
  "campeonato gaucho",
  "estaduais brasil",
  "futebol brasileiro",
  "brazilian football",
  "brazilian soccer",
];

async function listDatasetFiles(auth: string, slug: string): Promise<any[]> {
  // Endpoint gRPC-gateway oficial usado pelo CLI Kaggle
  const [owner_slug, dataset_slug] = slug.split("/");
  if (!owner_slug || !dataset_slug) return [];
  try {
    const resp = await fetch(
      "https://api.kaggle.com/v1/datasets.DatasetApiService/ListDatasetFiles",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ owner_slug, dataset_slug, page_size: 200 }),
      },
    );
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.datasetFiles || json.dataset_files || [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { queries, max_files, include_imported } = body || {};
    const auth = getKaggleAuth();
    const limit = Math.min(max_files || 15, 50);

    // Datasets já registrados (apenas para informação - não bloqueia)
    const { data: existingJobs } = await supabase
      .from("kaggle_import_jobs")
      .select(
        "status, kaggle_datasets(dataset_slug), kaggle_dataset_files(file_name)",
      )
      .in("status", [
        "completed",
        "completed_with_alerts",
        "pending",
        "downloading",
        "extracting",
        "profiling",
        "mapping",
        "staging",
        "awaiting_review",
      ]);

    const importedFileKeys = new Set(
      (existingJobs || []).map(
        (j: any) =>
          `${(j as any).kaggle_datasets?.dataset_slug}::${(j as any).kaggle_dataset_files?.file_name}`,
      ),
    );

    const searchQueries: string[] =
      Array.isArray(queries) && queries.length > 0 ? queries : DEFAULT_QUERIES;

    interface Candidate {
      dataset_slug: string;
      dataset_title: string;
      file_name: string;
      file_size: number;
      dataset_downloads: number;
      already_imported: boolean;
      status: "waiting";
    }

    const candidates: Candidate[] = [];
    const seenFiles = new Set<string>();
    let datasetsScanned = 0;
    let datasetsWithFiles = 0;

    for (const query of searchQueries) {
      if (candidates.length >= limit) break;

      const searchUrl =
        `https://www.kaggle.com/api/v1/datasets/list?search=${encodeURIComponent(query)}&sortBy=hottest&group=public`;
      const resp = await fetch(searchUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!resp.ok) {
        console.log(`[autodiscover] search failed q="${query}" status=${resp.status}`);
        continue;
      }

      const datasets = await resp.json();
      console.log(`[autodiscover] q="${query}" datasets=${(datasets || []).length}`);

      for (const ds of datasets || []) {
        if (candidates.length >= limit) break;
        const slug = ds.ref;
        if (!slug) continue;

        datasetsScanned++;

        const files = await listDatasetFiles(auth, slug);
        if (files.length > 0) datasetsWithFiles++;

        for (const f of files) {
          if (candidates.length >= limit) break;
          const fileName = f.name || f.fileName;
          if (!fileName) continue;
          if (!fileName.toLowerCase().endsWith(".csv")) continue;
          if (!MATCH_FILE_PATTERNS.test(fileName)) continue;

          const fileKey = `${slug}::${fileName}`;
          if (seenFiles.has(fileKey)) continue;
          const already = importedFileKeys.has(fileKey);
          if (already && !include_imported) continue;
          seenFiles.add(fileKey);

          candidates.push({
            dataset_slug: slug,
            dataset_title: ds.title || slug,
            file_name: fileName,
            file_size: f.totalBytes || f.total_bytes || 0,
            dataset_downloads: ds.downloadCount || 0,
            already_imported: already,
            status: "waiting",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        candidates,
        total: candidates.length,
        queries_searched: searchQueries.length,
        datasets_scanned: datasetsScanned,
        datasets_with_files: datasetsWithFiles,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[autodiscover] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
