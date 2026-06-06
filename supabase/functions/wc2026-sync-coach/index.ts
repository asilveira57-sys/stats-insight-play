import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");

  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "coach", provider: "api-football", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    if (!apiKey) throw new Error("API_FOOTBALL_KEY não configurado");
    const { data: teams } = await supabase.from("world_cup_2026_teams")
      .select("id,slug,external_team_id").not("external_team_id", "is", null);
    if (!teams?.length) throw new Error("Nenhuma seleção com external_team_id");

    console.log(`[sync-coach] processing ${teams.length}`);
    let updated = 0;
    for (const t of teams) {
      try {
        const res = await fetch(`https://v3.football.api-sports.io/coachs?team=${t.external_team_id}`, {
          headers: { "x-apisports-key": apiKey },
        });
        if (!res.ok) continue;
        const json = await res.json();
        const current = (json?.response ?? []).find((c: any) => !c?.career?.[0]?.end) ?? json?.response?.[0];
        if (!current) continue;
        const coachName = `${current.firstname ?? ""} ${current.lastname ?? ""}`.trim() || current.name;
        const nationality = current.nationality ?? null;
        await supabase.from("world_cup_2026_teams").update({
          coach_name: coachName, coach_nationality: nationality,
        }).eq("id", t.id);
        updated++;
        console.log(`[sync-coach] ${t.slug} -> ${coachName}`);
      } catch (inner) {
        console.error(`[sync-coach] ${t.slug}`, inner instanceof Error ? inner.message : inner);
      }
    }

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: updated,
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sync-coach] ERROR", msg);
    await supabase.from("world_cup_2026_sync_logs").update({
      status: "error", finished_at: new Date().toISOString(), error_message: msg,
    }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
