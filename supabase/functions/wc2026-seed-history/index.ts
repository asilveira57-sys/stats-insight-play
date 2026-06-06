import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Receives { slug, payload } where payload is the parsed wc-history JSON.
// Writes editions to world_cup_2026_team_history and aggregate fields to world_cup_2026_teams.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "seed_history", provider: "internal_static", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    const body = await req.json();
    const { slug, payload } = body;
    if (!slug || !payload || !Array.isArray(payload.editions)) {
      throw new Error("slug e payload.editions[] são obrigatórios");
    }

    console.log(`[seed-history] starting slug=${slug} editions=${payload.editions.length}`);

    const { data: team, error: teamErr } = await supabase
      .from("world_cup_2026_teams").select("id,name").eq("slug", slug).maybeSingle();
    if (teamErr) throw teamErr;
    if (!team) throw new Error(`Seleção ${slug} não existe na tabela world_cup_2026_teams`);

    // Clear and re-seed history for this team (idempotent)
    const { error: delErr } = await supabase
      .from("world_cup_2026_team_history").delete().eq("team_id", team.id);
    if (delErr) throw delErr;

    const rows = payload.editions.map((e: any) => ({
      team_id: team.id,
      year: e.year,
      host_country: e.host ?? null,
      stage_reached: e.stage_reached ?? null,
      final_position: e.final_position ?? null,
      wins: e.wins ?? null,
      draws: e.draws ?? null,
      losses: e.losses ?? null,
      goals_for: e.goals_for ?? null,
      goals_against: e.goals_against ?? null,
      coach_name: e.coach ?? null,
      notes: e.notes ?? null,
      source: payload.source ?? "static-curated",
    }));

    const { error: insErr } = await supabase
      .from("world_cup_2026_team_history").insert(rows);
    if (insErr) throw insErr;

    // Aggregate fields
    const updates: Record<string, any> = {
      participations_count: payload.editions.length,
      first_participation_year: payload.first_participation_year ?? null,
      titles_count: payload.titles_count ?? null,
      best_campaign: payload.best_campaign ?? null,
      nickname: payload.nickname ?? null,
      confederation_full: payload.confederation_full ?? null,
    };
    Object.keys(updates).forEach(k => updates[k] === null && delete updates[k]);

    const { error: updErr } = await supabase
      .from("world_cup_2026_teams").update(updates).eq("id", team.id);
    if (updErr) throw updErr;

    console.log(`[seed-history] OK slug=${slug} editions=${rows.length}`);

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: rows.length,
      payload_snapshot: { slug, team_id: team.id, editions: rows.length },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, slug, editions: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[seed-history] ERROR", msg);
    await supabase.from("world_cup_2026_sync_logs").update({
      status: "error", finished_at: new Date().toISOString(), error_message: msg,
    }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
