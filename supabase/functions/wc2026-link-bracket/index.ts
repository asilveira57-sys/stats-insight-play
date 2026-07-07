import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// stage -> { prefix, count, next: (n) => nextPos, slot: (n) => 'home'|'away' }
const STAGE_ORDER: Array<{
  stage: string;
  prefix: string;
  count: number;
  nextStage?: string;
  nextPrefix?: string;
  nextCount?: number;
}> = [
  { stage: "round_of_32",   prefix: "R32", count: 16, nextStage: "round_of_16",  nextPrefix: "R16", nextCount: 8 },
  { stage: "round_of_16",   prefix: "R16", count: 8,  nextStage: "quarter_final", nextPrefix: "QF", nextCount: 4 },
  { stage: "quarter_final", prefix: "QF",  count: 4,  nextStage: "semi_final",    nextPrefix: "SF", nextCount: 2 },
  { stage: "semi_final",    prefix: "SF",  count: 2,  nextStage: "final",         nextPrefix: "F",  nextCount: 1 },
  { stage: "final",         prefix: "F",   count: 1 },
  { stage: "third_place",   prefix: "TP",  count: 1 },
];

function positionFromRound(prefix: string, round: string | null, idx: number): string {
  const m = round?.match(/-\s*(\d+)/);
  const n = m ? parseInt(m[1], 10) : idx + 1;
  return prefix === "F" ? "F-1" : prefix === "TP" ? "TP-1" : `${prefix}-${n}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data: matches, error } = await supabase
      .from("world_cup_2026_matches")
      .select("id, stage, round, bracket_position, match_date")
      .neq("stage", "group")
      .order("match_date", { nullsFirst: false });
    if (error) throw error;

    // 1. Assign bracket_position per stage (based on round parse, else chronological index)
    const byStage: Record<string, any[]> = {};
    for (const m of matches ?? []) {
      byStage[m.stage] ??= [];
      byStage[m.stage].push(m);
    }

    const updates: Promise<any>[] = [];
    const posById = new Map<string, string>();

    for (const cfg of STAGE_ORDER) {
      const arr = byStage[cfg.stage] ?? [];
      arr.forEach((m, idx) => {
        const pos = positionFromRound(cfg.prefix, m.round, idx);
        posById.set(m.id, pos);
        if (pos !== m.bracket_position) {
          updates.push(
            supabase.from("world_cup_2026_matches").update({ bracket_position: pos }).eq("id", m.id),
          );
        }
      });
    }
    await Promise.allSettled(updates);

    // 2. Link next_match_id / next_match_slot from stage N -> stage N+1
    // Standard knockout: winner of match #k advances to next-round match #ceil(k/2), slot = k odd -> home, k even -> away.
    const idByStageSlot = new Map<string, string>();
    for (const [id, pos] of posById) {
      const stage = matches!.find(x => x.id === id)!.stage;
      idByStageSlot.set(`${stage}:${pos}`, id);
    }

    const linkUpdates: Promise<any>[] = [];
    for (const cfg of STAGE_ORDER) {
      if (!cfg.nextStage || !cfg.nextPrefix || !cfg.nextCount) continue;
      for (let k = 1; k <= cfg.count; k++) {
        const fromId = idByStageSlot.get(`${cfg.stage}:${cfg.prefix}-${k}`);
        if (!fromId) continue;
        const nextK = Math.ceil(k / 2);
        const nextPos = cfg.nextPrefix === "F" ? "F-1" : `${cfg.nextPrefix}-${nextK}`;
        const nextId = idByStageSlot.get(`${cfg.nextStage}:${nextPos}`);
        if (!nextId) continue;
        const slot: "home" | "away" = k % 2 === 1 ? "home" : "away";
        linkUpdates.push(
          supabase.from("world_cup_2026_matches")
            .update({ next_match_id: nextId, next_match_slot: slot })
            .eq("id", fromId),
        );
      }
    }
    await Promise.allSettled(linkUpdates);

    return new Response(JSON.stringify({
      success: true,
      processed: (matches ?? []).length,
      positions_written: updates.length,
      links_written: linkUpdates.length,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
