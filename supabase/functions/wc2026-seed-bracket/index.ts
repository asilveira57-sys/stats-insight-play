import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bracket map for FIFA 2026 (48-team format):
// 32 R32 → 16 R16 → 8 QF → 4 SF → Final + 3P
// Position naming: R32-1..16, R16-1..8, QF-1..4, SF-1..2, F, 3P
// Standard bracket pairing: R32-(2k-1) and R32-(2k) feed R16-k as home/away.
function buildPlaceholders() {
  const matches: any[] = [];
  const make = (stage: string, pos: string, next?: string, slot?: "home" | "away", date?: string) =>
    matches.push({ stage, bracket_position: pos, status: "scheduled", _next: next, _slot: slot, match_date: date });

  // R32
  for (let i = 1; i <= 16; i++) {
    make("round_of_32", `R32-${i}`, `R16-${Math.ceil(i / 2)}`, i % 2 === 1 ? "home" : "away");
  }
  // R16
  for (let i = 1; i <= 8; i++) {
    make("round_of_16", `R16-${i}`, `QF-${Math.ceil(i / 2)}`, i % 2 === 1 ? "home" : "away");
  }
  // QF
  for (let i = 1; i <= 4; i++) {
    make("quarter_final", `QF-${i}`, `SF-${Math.ceil(i / 2)}`, i % 2 === 1 ? "home" : "away");
  }
  // SF
  for (let i = 1; i <= 2; i++) {
    make("semi_final", `SF-${i}`, "F", i === 1 ? "home" : "away");
    // Losers go to 3rd-place match
    matches[matches.length - 1]._loser_next = "3P";
    matches[matches.length - 1]._loser_slot = i === 1 ? "home" : "away";
  }
  // 3rd place + Final
  make("third_place", "3P");
  make("final", "F");
  return matches;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const placeholders = buildPlaceholders();
  let created = 0, skipped = 0;

  // First pass: upsert each match by bracket_position (idempotent)
  const idByPos: Record<string, string> = {};
  for (const m of placeholders) {
    const { data: existing } = await supabase
      .from("world_cup_2026_matches")
      .select("id")
      .eq("bracket_position", m.bracket_position)
      .maybeSingle();
    if (existing) {
      idByPos[m.bracket_position] = existing.id;
      skipped++;
      continue;
    }
    const { data, error } = await supabase
      .from("world_cup_2026_matches")
      .insert({
        stage: m.stage,
        bracket_position: m.bracket_position,
        status: "scheduled",
      })
      .select("id")
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message, at: m.bracket_position }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    idByPos[m.bracket_position] = data.id;
    created++;
  }

  // Second pass: link next_match_id + next_match_slot
  for (const m of placeholders) {
    if (!m._next) continue;
    const nextId = idByPos[m._next];
    if (!nextId) continue;
    await supabase
      .from("world_cup_2026_matches")
      .update({ next_match_id: nextId, next_match_slot: m._slot })
      .eq("bracket_position", m.bracket_position);
  }

  return new Response(JSON.stringify({ created, skipped, total: placeholders.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
