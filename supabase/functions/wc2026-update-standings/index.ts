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

  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "standings", provider: "internal", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    const { data: matches } = await supabase.from("world_cup_2026_matches")
      .select("home_team_id,away_team_id,group_letter,home_score,away_score,status")
      .eq("stage", "group").eq("status", "finished");

    const { data: teams } = await supabase.from("world_cup_2026_teams")
      .select("id,group_letter").not("group_letter", "is", null);

    const acc = new Map<string, any>();
    for (const t of teams ?? []) {
      acc.set(t.id, {
        team_id: t.id, group_letter: t.group_letter,
        played: 0, wins: 0, draws: 0, losses: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
      });
    }

    for (const m of matches ?? []) {
      if (m.home_score == null || m.away_score == null) continue;
      for (const [side, opp] of [["home", "away"], ["away", "home"]] as const) {
        const teamId = side === "home" ? m.home_team_id : m.away_team_id;
        if (!teamId || !acc.has(teamId)) continue;
        const gs = side === "home" ? m.home_score : m.away_score;
        const ga = side === "home" ? m.away_score : m.home_score;
        const row = acc.get(teamId);
        row.played++;
        row.goals_for += gs; row.goals_against += ga;
        row.goal_difference = row.goals_for - row.goals_against;
        if (gs > ga) { row.wins++; row.points += 3; }
        else if (gs === ga) { row.draws++; row.points += 1; }
        else row.losses++;
      }
    }

    // Rank within group
    const byGroup = new Map<string, any[]>();
    for (const r of acc.values()) {
      if (!byGroup.has(r.group_letter)) byGroup.set(r.group_letter, []);
      byGroup.get(r.group_letter)!.push(r);
    }
    const rows: any[] = [];
    for (const [, list] of byGroup) {
      list.sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_for - a.goals_for);
      list.forEach((r, i) => { r.position = i + 1; rows.push(r); });
    }

    for (const r of rows) {
      await supabase.from("world_cup_2026_standings").upsert(r, { onConflict: "team_id,group_letter" });
    }

    // Mark eliminated / qualified (top 2 qualify when all 3 group games played)
    for (const [, list] of byGroup) {
      const allDone = list.every(r => r.played >= 3);
      if (!allDone) continue;
      for (let i = 0; i < list.length; i++) {
        const status = i < 2 ? "qualified" : "eliminated";
        await supabase.from("world_cup_2026_teams").update({ status }).eq("id", list[i].team_id);
      }
    }

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: rows.length,
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, rows: rows.length }), {
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
