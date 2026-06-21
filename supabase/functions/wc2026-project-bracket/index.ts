// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Team = {
  id: string;
  name: string;
  slug: string;
  group_letter: string | null;
  fifa_ranking: number | null;
};

type GroupMatch = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  group_letter: string | null;
};

type AIAnalysis = {
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  confidence_score: number | null;
};

// FIFA-ranking-driven probability for fallbacks
function rankingProbabilities(homeRank: number, awayRank: number) {
  // Lower rank number = stronger team. Convert to "strength" via Elo-like proxy.
  const hr = homeRank || 100;
  const ar = awayRank || 100;
  const strengthHome = 1000 - hr * 4;
  const strengthAway = 1000 - ar * 4;
  const diff = strengthHome - strengthAway;
  // Logistic
  const pHome = 1 / (1 + Math.pow(10, -diff / 400));
  const pAway = 1 - pHome;
  // Draw weight: closer teams → more draws (up to 28%)
  const closeness = 1 - Math.min(1, Math.abs(diff) / 600);
  const drawWeight = 0.18 + closeness * 0.12;
  const rawHome = pHome * (1 - drawWeight);
  const rawAway = pAway * (1 - drawWeight);
  return { pHome: rawHome, pDraw: drawWeight, pAway: rawAway };
}

function scoreFromProb(p: { pHome: number; pDraw: number; pAway: number }) {
  // Deterministic most-likely score using simple lambda mapping
  const lambdaHome = 1.1 + (p.pHome - p.pAway) * 1.4;
  const lambdaAway = 1.1 + (p.pAway - p.pHome) * 1.4;
  const h = Math.max(0, Math.round(lambdaHome));
  const a = Math.max(0, Math.round(lambdaAway));
  return { h, a };
}

function confidenceFromProb(p: { pHome: number; pDraw: number; pAway: number }) {
  const max = Math.max(p.pHome, p.pDraw, p.pAway);
  if (max >= 0.55) return "high";
  if (max >= 0.4) return "medium";
  return "low";
}

function pickWinnerOnTie(homeRank: number, awayRank: number): "home" | "away" {
  // Penalty shootout: small bias toward better-ranked team. Use deterministic pseudo-random by rank parity.
  const better = homeRank <= awayRank ? "home" : "away";
  return better;
}

async function fetchAll<T>(supabase: any, table: string, query: (q: any) => any): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const out: T[] = [];
  while (true) {
    const { data, error } = await query(supabase.from(table).select("*").range(from, from + pageSize - 1));
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function projectGroups(supabase: any, teams: Team[], matches: GroupMatch[], analyses: Map<string, AIAnalysis>) {
  // Returns standings per group: {groupLetter: [{teamId, points, gd, gf, ...}]}
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const standings = new Map<string, Map<string, any>>();

  const init = (teamId: string) => {
    const t = teamById.get(teamId);
    if (!t) return null;
    const g = t.group_letter ?? "?";
    if (!standings.has(g)) standings.set(g, new Map());
    const gm = standings.get(g)!;
    if (!gm.has(teamId)) {
      gm.set(teamId, { teamId, team: t, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
    }
    return gm.get(teamId)!;
  };

  const groupProjections: any[] = [];

  for (const m of matches) {
    const home = init(m.home_team_id);
    const away = init(m.away_team_id);
    if (!home || !away) continue;
    let hs: number, as: number;
    let basis: any = {};

    if (m.status === "finished" && m.home_score !== null && m.away_score !== null) {
      hs = m.home_score;
      as = m.away_score;
      basis = { source: "official" };
    } else {
      const ai = analyses.get(m.id);
      const ht = teamById.get(m.home_team_id);
      const at = teamById.get(m.away_team_id);
      if (!ht || !at) continue;
      const probs = rankingProbabilities(ht.fifa_ranking ?? 100, at.fifa_ranking ?? 100);
      if (ai?.predicted_home_score != null && ai?.predicted_away_score != null) {
        hs = ai.predicted_home_score;
        as = ai.predicted_away_score;
        basis = { source: "ai_analysis", confidence: ai.confidence_score, probs };
      } else {
        const s = scoreFromProb(probs);
        hs = s.h;
        as = s.a;
        basis = { source: "fifa_ranking_fallback", probs, home_fifa: ht.fifa_ranking, away_fifa: at.fifa_ranking };
      }
      groupProjections.push({
        match_id: m.id,
        phase: "group",
        slot_code: `G-${m.group_letter}-${m.id.slice(0, 8)}`,
        group_letter: m.group_letter,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_score: hs,
        away_score: as,
        winner_team_id: hs > as ? m.home_team_id : hs < as ? m.away_team_id : null,
        confidence: confidenceFromProb(basis.probs ?? { pHome: 0.33, pDraw: 0.33, pAway: 0.33 }),
        prob_home: basis.probs?.pHome,
        prob_draw: basis.probs?.pDraw,
        prob_away: basis.probs?.pAway,
        basis,
      });
    }

    home.played++; away.played++;
    home.gf += hs; home.ga += as; home.gd = home.gf - home.ga;
    away.gf += as; away.ga += hs; away.gd = away.gf - away.ga;
    if (hs > as) { home.w++; home.pts += 3; away.l++; }
    else if (hs < as) { away.w++; away.pts += 3; home.l++; }
    else { home.d++; away.d++; home.pts++; away.pts++; }
  }

  // Sort each group by FIFA tiebreakers: pts → gd → gf → fifa_ranking
  const groupTable: Record<string, any[]> = {};
  for (const [letter, gm] of standings.entries()) {
    const arr = Array.from(gm.values()).sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || (a.team.fifa_ranking ?? 999) - (b.team.fifa_ranking ?? 999),
    );
    groupTable[letter] = arr;
  }
  return { groupTable, groupProjections };
}

// Build the 32 teams that advance: top 2 of each group (24) + 8 best 3rds
function pickAdvancers(groupTable: Record<string, any[]>) {
  const top2: any[] = [];
  const thirds: any[] = [];
  for (const letter of Object.keys(groupTable).sort()) {
    const arr = groupTable[letter];
    if (arr[0]) top2.push({ ...arr[0], gpos: 1, gletter: letter });
    if (arr[1]) top2.push({ ...arr[1], gpos: 2, gletter: letter });
    if (arr[2]) thirds.push({ ...arr[2], gpos: 3, gletter: letter });
  }
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || (a.team.fifa_ranking ?? 999) - (b.team.fifa_ranking ?? 999));
  const best8thirds = thirds.slice(0, 8);
  return { top2, best8thirds };
}

// Build R32 pairings using a deterministic standard bracket
function buildR32Pairings(top2: any[], best8thirds: any[]) {
  const all32 = [...top2, ...best8thirds].filter((x) => x && x.teamId);
  all32.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || (a.team.fifa_ranking ?? 999) - (b.team.fifa_ranking ?? 999));
  const pairs: { home: any; away: any; slot: string }[] = [];
  const n = Math.min(32, all32.length);
  const pairCount = Math.floor(n / 2);
  for (let i = 0; i < pairCount; i++) {
    pairs.push({ home: all32[i], away: all32[n - 1 - i], slot: `R32-${i + 1}` });
  }
  return pairs;
}

function simulateKnockout(home: Team, away: Team) {
  const probs = rankingProbabilities(home.fifa_ranking ?? 100, away.fifa_ranking ?? 100);
  const s = scoreFromProb(probs);
  let h = s.h;
  let a = s.a;
  let wentToPens = false;
  let hp = 0, ap = 0;
  let winner: Team;
  if (h === a) {
    wentToPens = true;
    const w = pickWinnerOnTie(home.fifa_ranking ?? 100, away.fifa_ranking ?? 100);
    if (w === "home") { hp = 4; ap = 3; winner = home; } else { hp = 3; ap = 4; winner = away; }
  } else if (h > a) {
    winner = home;
  } else {
    winner = away;
  }
  return {
    home_score: h, away_score: a,
    home_pens: wentToPens ? hp : null,
    away_pens: wentToPens ? ap : null,
    went_to_penalties: wentToPens,
    winner_team_id: winner.id,
    prob_home: probs.pHome, prob_draw: probs.pDraw, prob_away: probs.pAway,
    confidence: confidenceFromProb(probs),
    basis: { source: "ranking_model", home_fifa: home.fifa_ranking, away_fifa: away.fifa_ranking, probs },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const version = "live";

    const [teamsRes, matchesRes, analysesRes] = await Promise.all([
      supabase.from("world_cup_2026_teams").select("id,name,slug,group_letter,fifa_ranking"),
      supabase.from("world_cup_2026_matches").select("id,stage,home_team_id,away_team_id,status,home_score,away_score,winner_team_id,group_letter").eq("stage", "group"),
      supabase.from("world_cup_2026_ai_analyses").select("match_id,predicted_home_score,predicted_away_score,confidence_score"),
    ]);

    if (teamsRes.error) throw teamsRes.error;
    if (matchesRes.error) throw matchesRes.error;
    if (analysesRes.error) throw analysesRes.error;

    const teams = (teamsRes.data ?? []) as Team[];
    const groupMatches = ((matchesRes.data ?? []) as GroupMatch[]).filter((m) => m.home_team_id && m.away_team_id);
    const aiMap = new Map<string, AIAnalysis>();
    for (const a of (analysesRes.data ?? []) as AIAnalysis[]) aiMap.set(a.match_id, a);

    const teamById = new Map(teams.map((t) => [t.id, t]));
    const { groupTable, groupProjections } = await projectGroups(supabase, teams, groupMatches, aiMap);
    const { top2, best8thirds } = pickAdvancers(groupTable);
    const r32Pairs = buildR32Pairings(top2, best8thirds);

    const rows: any[] = [...groupProjections];

    // R32
    const r32Winners: { team: Team; slot: string }[] = [];
    r32Pairs.forEach((p, i) => {
      const home = teamById.get(p.home.teamId)!;
      const away = teamById.get(p.away.teamId)!;
      const sim = simulateKnockout(home, away);
      rows.push({
        phase: "round_of_32",
        slot_code: p.slot,
        home_team_id: home.id, away_team_id: away.id,
        ...sim,
      });
      r32Winners.push({ team: teamById.get(sim.winner_team_id)!, slot: p.slot });
    });

    const pairAndRun = (
      input: { team: Team; slot: string }[],
      phase: string,
      prefix: string,
    ) => {
      const winners: { team: Team; slot: string }[] = [];
      const losers: { team: Team; slot: string }[] = [];
      const pairs = Math.floor(input.length / 2);
      for (let i = 0; i < pairs; i++) {
        const home = input[i * 2].team;
        const away = input[i * 2 + 1].team;
        if (!home || !away) continue;
        const sim = simulateKnockout(home, away);
        const slot = `${prefix}-${i + 1}`;
        rows.push({ phase, slot_code: slot, home_team_id: home.id, away_team_id: away.id, ...sim });
        const winner = teamById.get(sim.winner_team_id);
        if (!winner) continue;
        winners.push({ team: winner, slot });
        const loser = winner.id === home.id ? away : home;
        losers.push({ team: loser, slot });
      }
      return { winners, losers };
    };

    const r16 = pairAndRun(r32Winners, "round_of_16", "R16").winners;
    const qf = pairAndRun(r16, "quarter_final", "QF").winners;
    const sf = pairAndRun(qf, "semi_final", "SF");
    const sfWinners = sf.winners;
    const sfLosers = sf.losers;

    let championName: string | undefined;
    let thirdName: string | undefined;

    if (sfWinners.length >= 2) {
      const finalSim = simulateKnockout(sfWinners[0].team, sfWinners[1].team);
      rows.push({
        phase: "final", slot_code: "F-1",
        home_team_id: sfWinners[0].team.id, away_team_id: sfWinners[1].team.id, ...finalSim,
      });
      championName = teamById.get(finalSim.winner_team_id!)?.name;
    }
    if (sfLosers.length >= 2) {
      const thirdSim = simulateKnockout(sfLosers[0].team, sfLosers[1].team);
      rows.push({
        phase: "third_place", slot_code: "TP-1",
        home_team_id: sfLosers[0].team.id, away_team_id: sfLosers[1].team.id, ...thirdSim,
      });
      thirdName = teamById.get(thirdSim.winner_team_id!)?.name;
    }

    // Delete existing live rows, insert fresh
    const { error: delErr } = await supabase
      .from("wc2026_bracket_projections")
      .delete()
      .eq("projection_version", version)
      .eq("is_official_version", false);
    if (delErr) throw delErr;

    const toInsert = rows.map((r) => ({ ...r, projection_version: version }));
    // Chunk insert
    const chunkSize = 200;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { error } = await supabase.from("wc2026_bracket_projections").insert(chunk);
      if (error) throw error;
    }

    return new Response(JSON.stringify({
      ok: true,
      version,
      counts: {
        group: groupProjections.length,
        r32: 16, r16: 8, qf: 4, sf: 2, final: 1, third: 1,
        total: toInsert.length,
      },
      champion: teamById.get(finalSim.winner_team_id!)?.name,
      third: teamById.get(thirdSim.winner_team_id!)?.name,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("project-bracket error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
