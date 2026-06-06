import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");

  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "squads", provider: "api-football", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    if (!apiKey) throw new Error("API_FOOTBALL_KEY não configurado");
    const body = await req.json().catch(() => ({}));
    const { team_slug } = body as { team_slug?: string };

    let teamsQ = supabase.from("world_cup_2026_teams")
      .select("id,name,slug,external_team_id").not("external_team_id", "is", null);
    if (team_slug) teamsQ = teamsQ.eq("slug", team_slug);
    const { data: teams } = await teamsQ;
    if (!teams?.length) throw new Error("Nenhuma seleção com external_team_id encontrada");

    console.log(`[sync-squads] processing ${teams.length} team(s)`);
    let total = 0;

    for (const t of teams) {
      try {
        const res = await fetch(`https://v3.football.api-sports.io/players/squads?team=${t.external_team_id}`, {
          headers: { "x-apisports-key": apiKey },
        });
        if (!res.ok) {
          console.error(`[sync-squads] ${t.slug} HTTP ${res.status}`);
          continue;
        }
        const json = await res.json();
        const squad = json?.response?.[0]?.players ?? [];
        if (!squad.length) continue;

        // Replace squad
        await supabase.from("world_cup_2026_players").delete().eq("team_id", t.id);

        const rows = squad.map((p: any) => ({
          team_id: t.id,
          name: p.name,
          slug: slugify(`${p.name}-${p.id}`),
          position: p.position ?? null,
          shirt_number: p.number ?? null,
          photo_url: p.photo ?? null,
          external_player_id: p.id ?? null,
          is_called_up: true,
        }));
        const { error: insErr } = await supabase.from("world_cup_2026_players").insert(rows);
        if (insErr) { console.error(`[sync-squads] insert ${t.slug}`, insErr.message); continue; }
        total += rows.length;
        console.log(`[sync-squads] ${t.slug} +${rows.length}`);
      } catch (inner) {
        console.error(`[sync-squads] ${t.slug} error`, inner instanceof Error ? inner.message : inner);
      }
    }

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: total,
      payload_snapshot: { teams: teams.length },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, teams: teams.length, players: total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sync-squads] ERROR", msg);
    await supabase.from("world_cup_2026_sync_logs").update({
      status: "error", finished_at: new Date().toISOString(), error_message: msg,
    }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
