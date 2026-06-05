import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "post_generation", provider: "internal", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    const { analysis_id, post_type = "preview", publish = true } = await req.json();
    if (!analysis_id) throw new Error("analysis_id obrigatório");

    const { data: an } = await supabase.from("world_cup_2026_ai_analyses")
      .select("*").eq("id", analysis_id).maybeSingle();
    if (!an) throw new Error("Análise não encontrada");

    const baseTitle = an.title ?? "Copa 2026";
    const title = post_type === "recap" ? `Resumo: ${baseTitle}`
      : post_type === "qualification" ? `Classificada: ${baseTitle}`
      : post_type === "elimination" ? `Eliminada: ${baseTitle}`
      : `Pré-jogo: ${baseTitle}`;

    const slug = slugify(`${title}-${Date.now()}`);
    const excerpt = (an.content ?? "").slice(0, 240);

    const { data: post } = await supabase.from("world_cup_2026_posts").insert({
      related_match_id: an.match_id, related_team_id: an.team_id,
      post_type, title, slug, excerpt, content: an.content,
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
    }).select().single();

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: 1,
      payload_snapshot: { post_id: post?.id },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("world_cup_2026_sync_logs").update({
      status: "error", finished_at: new Date().toISOString(), error_message: msg,
    }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
