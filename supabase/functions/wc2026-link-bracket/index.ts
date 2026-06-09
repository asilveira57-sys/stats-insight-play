import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function positionFromRound(stage: string, round: string | null, idx: number): string | null {
  // round examples: "Round of 32 - 1", "Round of 16 - 3", "Quarter-finals - 2", "Semi-finals - 1", "Final - 1", "3rd Place Final - 1"
  const m = round?.match(/-\s*(\d+)/);
  const n = m ? parseInt(m[1], 10) : idx + 1;
  switch (stage) {
    case "round_of_32": return `R32-${n}`;
    case "round_of_16": return `R16-${n}`;
    case "quarter_final": return `QF-${n}`;
    case "semi_final": return `SF-${n}`;
    case "third_place": return `TP`;
    case "final": return `F`;
    default: return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data: matches } = await supabase
      .from("world_cup_2026_matches")
      .select("id, stage, round, bracket_position, match_date")
      .neq("stage", "group")
      .order("match_date");

    const byStage: Record<string, any[]> = {};
    for (const m of matches ?? []) {
      byStage[m.stage] ??= [];
      byStage[m.stage].push(m);
    }

    let updated = 0;
    for (const [stage, arr] of Object.entries(byStage)) {
      arr.forEach((m, idx) => {
        const pos = positionFromRound(stage, m.round, idx);
        if (pos && pos !== m.bracket_position) {
          supabase.from("world_cup_2026_matches").update({ bracket_position: pos }).eq("id", m.id).then(({ error }) => {
            if (!error) updated++;
          });
        }
      });
    }
    // wait for async updates
    await new Promise(r => setTimeout(r, 1500));

    return new Response(JSON.stringify({ success: true, processed: (matches ?? []).length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
