import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    // 1) Fill group_letter on matches where stage='group' from team group letters
    const { data: matches } = await supabase
      .from("world_cup_2026_matches")
      .select("id, home_team_id, away_team_id, stage, match_date, group_letter, match_round")
      .eq("stage", "group");

    const { data: teams } = await supabase
      .from("world_cup_2026_teams")
      .select("id, group_letter");
    const teamGroup = new Map<string, string | null>((teams ?? []).map((t: any) => [t.id, t.group_letter]));

    let updated = 0;
    // Sort by date to compute match_round per group (1..3)
    const sorted = [...(matches ?? [])].sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
    const groupCounters: Record<string, Map<string, number>> = {};
    for (const m of sorted) {
      const hg = teamGroup.get(m.home_team_id) ?? null;
      const ag = teamGroup.get(m.away_team_id) ?? null;
      // In group stage, both teams must be in same group. If only one known, use it (the other is likely a still-unassigned add-on team — admin should fix later).
      const letter = (hg && ag && hg === ag) ? hg : (hg ?? ag ?? null);
      if (!letter) continue;
      // round: per team, count appearances
      groupCounters[letter] ??= new Map();
      const counter = groupCounters[letter];
      const homeCount = (counter.get(m.home_team_id) ?? 0) + 1;
      const awayCount = (counter.get(m.away_team_id) ?? 0) + 1;
      counter.set(m.home_team_id, homeCount);
      counter.set(m.away_team_id, awayCount);
      const round = Math.max(homeCount, awayCount);
      const { error } = await supabase
        .from("world_cup_2026_matches")
        .update({ group_letter: letter, match_round: round })
        .eq("id", m.id);
      if (!error) updated++;
    }

    // 2) Seed standings (zeroed) for each team with a group_letter
    let standingsCreated = 0;
    for (const t of teams ?? []) {
      if (!t.group_letter) continue;
      const { error } = await supabase.from("world_cup_2026_standings").upsert(
        {
          team_id: t.id,
          group_letter: t.group_letter,
          played: 0, wins: 0, draws: 0, losses: 0,
          goals_for: 0, goals_against: 0, goal_difference: 0,
          points: 0, position: 0,
        },
        { onConflict: "team_id,group_letter" },
      );
      if (error) console.error("standings", t.id, error.message);
      else standingsCreated++;
    }

    return new Response(JSON.stringify({ success: true, matches_updated: updated, standings_seeded: standingsCreated }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
