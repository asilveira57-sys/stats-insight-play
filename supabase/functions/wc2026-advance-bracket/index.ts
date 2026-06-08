import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reads finished knockout matches and propagates winner (and SF loser → 3P) to next slot.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: finished, error } = await supabase
    .from("world_cup_2026_matches")
    .select("id, stage, bracket_position, winner_team_id, home_team_id, away_team_id, next_match_id, next_match_slot")
    .neq("stage", "group")
    .eq("status", "finished")
    .not("winner_team_id", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let advanced = 0;
  for (const m of finished ?? []) {
    if (m.next_match_id && m.next_match_slot) {
      const field = m.next_match_slot === "home" ? "home_team_id" : "away_team_id";
      await supabase
        .from("world_cup_2026_matches")
        .update({ [field]: m.winner_team_id })
        .eq("id", m.next_match_id);
      advanced++;
    }
    // SF loser → 3P
    if (m.stage === "semi_final") {
      const loser = m.winner_team_id === m.home_team_id ? m.away_team_id : m.home_team_id;
      if (loser) {
        const { data: third } = await supabase
          .from("world_cup_2026_matches")
          .select("id, home_team_id, away_team_id")
          .eq("bracket_position", "3P")
          .maybeSingle();
        if (third) {
          // First SF result writes home; second writes away
          const slot = third.home_team_id ? "away_team_id" : "home_team_id";
          await supabase
            .from("world_cup_2026_matches")
            .update({ [slot]: loser })
            .eq("id", third.id);
        }
      }
    }
  }

  return new Response(JSON.stringify({ advanced }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
