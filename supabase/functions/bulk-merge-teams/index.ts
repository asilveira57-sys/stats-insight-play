import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { merges } = await req.json() as {
      merges: { source_slug: string; target_slug: string }[];
    };

    if (!merges || !Array.isArray(merges)) {
      return new Response(JSON.stringify({ error: "merges array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{
      source_slug: string;
      target_slug: string;
      status: string;
      detail?: string;
    }> = [];

    for (const { source_slug, target_slug } of merges) {
      try {
        // Look up source team
        const { data: source } = await supabase
          .from("times")
          .select("id, nome, slug")
          .eq("slug", source_slug)
          .maybeSingle();

        if (!source) {
          results.push({ source_slug, target_slug, status: "skipped", detail: `Source slug '${source_slug}' not found` });
          continue;
        }

        // Look up target team
        const { data: target } = await supabase
          .from("times")
          .select("id, nome, slug")
          .eq("slug", target_slug)
          .maybeSingle();

        if (!target) {
          results.push({ source_slug, target_slug, status: "skipped", detail: `Target slug '${target_slug}' not found` });
          continue;
        }

        if (source.id === target.id) {
          results.push({ source_slug, target_slug, status: "skipped", detail: "Same team" });
          continue;
        }

        // Call merge_teams RPC
        const { data, error } = await supabase.rpc("merge_teams", {
          p_target_id: target.id,
          p_source_id: source.id,
        });

        if (error) {
          results.push({ source_slug, target_slug, status: "error", detail: error.message });
        } else {
          results.push({ source_slug, target_slug, status: "merged", detail: JSON.stringify(data) });
        }
      } catch (e) {
        results.push({ source_slug, target_slug, status: "error", detail: String(e) });
      }
    }

    const merged = results.filter((r) => r.status === "merged").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({ merged, skipped, errors, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
