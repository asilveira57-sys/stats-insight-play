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

type HistoryRow = {
  team_id: string;
  goals_for: number | null;
  goals_against: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
};

// Fallback FIFA-style ranking (lower = stronger)
const FALLBACK_RANK: Record<string, number> = {
  "argentina": 1, "espanha": 2, "franca": 3, "inglaterra": 4, "brasil": 5,
  "portugal": 6, "paises baixos": 7, "belgica": 8, "italia": 9, "croacia": 10,
  "alemanha": 11, "marrocos": 12, "colombia": 13, "uruguai": 14, "estados unidos": 15,
  "suica": 16, "mexico": 17, "japao": 18, "senegal": 19, "iran": 20, "ira": 20,
  "dinamarca": 21, "austria": 22, "coreia do sul": 23, "ucrania": 24, "australia": 25,
  "servia": 26, "polonia": 27, "equador": 28, "noruega": 29, "egito": 30,
  "suecia": 31, "tunisia": 32, "republica tcheca": 33, "venezuela": 34, "argelia": 35,
  "nigeria": 36, "escocia": 37, "pais de gales": 38, "turquia": 39, "peru": 40,
  "paraguai": 41, "chile": 42, "costa do marfim": 43, "romenia": 44, "panama": 45,
  "canada": 46, "catar": 47, "arabia saudita": 48, "costa rica": 49, "gana": 50,
  "camaroes": 51, "africa do sul": 52, "irlanda": 53, "grecia": 54, "eslovaquia": 55,
  "hungria": 56, "uzbequistao": 57, "jordania": 58, "nova zelandia": 59, "bolivia": 60,
  "haiti": 61, "honduras": 62, "jamaica": 63, "cabo verde": 64,
};
const normName = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
function effectiveRank(team: { fifa_ranking: number | null; name: string }): number {
  if (team.fifa_ranking != null) return team.fifa_ranking;
  return FALLBACK_RANK[normName(team.name)] ?? 90;
}

// ─────────────────────────────────────────────────────────────
// FEATURE ENGINEERING — per-team attack/defense from real data
// ─────────────────────────────────────────────────────────────
type TeamFeatures = {
  teamId: string;
  rank: number;
  attack: number;     // ratio vs global avg goals for
  defense: number;    // ratio vs global avg goals against (higher = leakier)
  formPts: number;    // 0..9 from last 3 WC2026 matches
  formGD: number;     // goal diff in last 3 WC2026 matches
  histGF: number;
  histGA: number;
  sampleSize: number; // history rows + recent matches
};

const GLOBAL_AVG_GOALS = 1.35; // typical WC team-side avg

function buildFeatures(
  teams: Team[],
  history: HistoryRow[],
  finishedMatches: GroupMatch[],
): Map<string, TeamFeatures> {
  const byTeam: Record<string, { gf: number; ga: number; n: number }> = {};
  for (const h of history) {
    if (!h.team_id) continue;
    const b = byTeam[h.team_id] ??= { gf: 0, ga: 0, n: 0 };
    const games = (h.wins ?? 0) + (h.draws ?? 0) + (h.losses ?? 0);
    if (games > 0) {
      b.gf += h.goals_for ?? 0;
      b.ga += h.goals_against ?? 0;
      b.n += games;
    }
  }

  // Recent form from current WC matches
  const recent: Record<string, { pts: number; gd: number; gf: number; ga: number; n: number }> = {};
  // Sort by id stability not ideal but matches are usually time-ordered by scheduled
  const finishedSorted = [...finishedMatches];
  for (const m of finishedSorted) {
    if (m.home_score == null || m.away_score == null) continue;
    const rh = recent[m.home_team_id] ??= { pts: 0, gd: 0, gf: 0, ga: 0, n: 0 };
    const ra = recent[m.away_team_id] ??= { pts: 0, gd: 0, gf: 0, ga: 0, n: 0 };
    rh.gf += m.home_score; rh.ga += m.away_score; rh.gd += m.home_score - m.away_score; rh.n++;
    ra.gf += m.away_score; ra.ga += m.home_score; ra.gd += m.away_score - m.home_score; ra.n++;
    if (m.home_score > m.away_score) { rh.pts += 3; }
    else if (m.home_score < m.away_score) { ra.pts += 3; }
    else { rh.pts += 1; ra.pts += 1; }
  }

  const out = new Map<string, TeamFeatures>();
  for (const t of teams) {
    const h = byTeam[t.id];
    const r = recent[t.id];
    const histGF = h && h.n > 0 ? h.gf / h.n : GLOBAL_AVG_GOALS;
    const histGA = h && h.n > 0 ? h.ga / h.n : GLOBAL_AVG_GOALS;
    // Blend history with rank-derived strength (so teams with no WC history aren't penalized to baseline)
    const rank = effectiveRank(t);
    const rankBoost = Math.max(0.4, Math.min(1.6, 1 + (50 - rank) / 100)); // rank 1 ≈ 1.49, rank 100 ≈ 0.5
    const attack = (histGF / GLOBAL_AVG_GOALS) * 0.55 + rankBoost * 0.45;
    const defense = (histGA / GLOBAL_AVG_GOALS) * 0.55 + (1 / rankBoost) * 0.45;
    const formPts = r ? Math.min(9, r.pts) : 0;
    const formGD = r ? r.gd : 0;
    out.set(t.id, {
      teamId: t.id,
      rank,
      attack: Math.max(0.45, Math.min(2.0, attack)),
      defense: Math.max(0.45, Math.min(2.0, defense)),
      formPts,
      formGD,
      histGF,
      histGA,
      sampleSize: (h?.n ?? 0) + (r?.n ?? 0),
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// POISSON MODEL
// ─────────────────────────────────────────────────────────────
function lambdas(home: TeamFeatures, away: TeamFeatures) {
  const base = 1.35;
  const homeAdv = 1.08; // mild home/seed advantage
  // Form factor: +/- 10% based on points in last 3 matches (3pts ≈ neutral)
  const formH = 1 + ((home.formPts - 3) / 9) * 0.12;
  const formA = 1 + ((away.formPts - 3) / 9) * 0.12;
  let lH = base * home.attack * away.defense * homeAdv * formH;
  let lA = base * away.attack * home.defense * (1 / homeAdv) * formA;
  // Rank gap nudge to avoid identical lambdas when histories are similar
  const rankDiff = (away.rank - home.rank) / 100;
  lH *= 1 + rankDiff * 0.18;
  lA *= 1 - rankDiff * 0.18;
  return { lH: Math.max(0.25, lH), lA: Math.max(0.25, lA) };
}

function poissonPmf(lambda: number, k: number) {
  // k! up to 6
  const fact = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];
  return Math.exp(-lambda) * Math.pow(lambda, k) / fact[Math.min(k, 8)];
}

function scoreDistribution(lH: number, lA: number) {
  const MAX = 6;
  const grid: { h: number; a: number; p: number }[] = [];
  let pHome = 0, pDraw = 0, pAway = 0;
  let sum = 0;
  for (let h = 0; h <= MAX; h++) {
    const ph = poissonPmf(lH, h);
    for (let a = 0; a <= MAX; a++) {
      const pa = poissonPmf(lA, a);
      const p = ph * pa;
      grid.push({ h, a, p });
      sum += p;
      if (h > a) pHome += p;
      else if (h < a) pAway += p;
      else pDraw += p;
    }
  }
  // Renormalize (mass > 6 is tiny)
  pHome /= sum; pDraw /= sum; pAway /= sum;
  grid.forEach(g => g.p /= sum);
  grid.sort((x, y) => y.p - x.p);
  return { grid, pHome, pDraw, pAway, modal: { h: grid[0].h, a: grid[0].a, p: grid[0].p } };
}

// Sample from Poisson(λ) via Knuth's algorithm (fine for λ < 10)
function samplePoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 12);
  return k - 1;
}

function confidenceFromProb(p: { pHome: number; pDraw: number; pAway: number }) {
  const max = Math.max(p.pHome, p.pAway);
  if (max >= 0.55) return "alta";
  if (max >= 0.42) return "media";
  return "baixa";
}

// ─────────────────────────────────────────────────────────────
// MONTE CARLO ENGINE
// ─────────────────────────────────────────────────────────────
type GroupStanding = { teamId: string; pts: number; gd: number; gf: number; rank: number };

function simulateGroupMatch(home: TeamFeatures, away: TeamFeatures) {
  const { lH, lA } = lambdas(home, away);
  return { hs: samplePoisson(lH), as: samplePoisson(lA) };
}

function simulateKnockoutMatch(home: TeamFeatures, away: TeamFeatures): { winnerId: string; hs: number; as: number; pens: boolean } {
  const { lH, lA } = lambdas(home, away);
  const hs = samplePoisson(lH);
  const as = samplePoisson(lA);
  if (hs !== as) {
    return { winnerId: hs > as ? home.teamId : away.teamId, hs, as, pens: false };
  }
  // Penalty shootout: Bernoulli biased by rank, capped 60/40
  const diff = (away.rank - home.rank) / 200;
  const pHomeWin = Math.max(0.4, Math.min(0.6, 0.5 + diff));
  const winnerId = Math.random() < pHomeWin ? home.teamId : away.teamId;
  return { winnerId, hs, as, pens: true };
}

type MCAggregates = {
  champion: Map<string, number>;
  final: Map<string, number>;
  semi: Map<string, number>;
  qf: Map<string, number>;
  r16: Map<string, number>;
  xGF: Map<string, number>;
  xGA: Map<string, number>;
};

function bump(m: Map<string, number>, k: string, v = 1) { m.set(k, (m.get(k) ?? 0) + v); }

function runMonteCarlo(opts: {
  teams: Team[];
  features: Map<string, TeamFeatures>;
  groupMatches: GroupMatch[];
  N: number;
}): MCAggregates {
  const { teams, features, groupMatches, N } = opts;
  const agg: MCAggregates = {
    champion: new Map(), final: new Map(), semi: new Map(),
    qf: new Map(), r16: new Map(), xGF: new Map(), xGA: new Map(),
  };
  const teamById = new Map(teams.map(t => [t.id, t]));

  for (let sim = 0; sim < N; sim++) {
    // 1) Simulate group stage
    const standings = new Map<string, Map<string, GroupStanding>>();
    const ensure = (teamId: string) => {
      const t = teamById.get(teamId);
      if (!t) return null;
      const g = t.group_letter ?? "?";
      if (!standings.has(g)) standings.set(g, new Map());
      const gm = standings.get(g)!;
      if (!gm.has(teamId)) {
        gm.set(teamId, { teamId, pts: 0, gd: 0, gf: 0, rank: features.get(teamId)?.rank ?? 90 });
      }
      return gm.get(teamId)!;
    };

    for (const m of groupMatches) {
      const home = ensure(m.home_team_id);
      const away = ensure(m.away_team_id);
      if (!home || !away) continue;
      let hs: number, as: number;
      if (m.status === "finished" && m.home_score != null && m.away_score != null) {
        hs = m.home_score; as = m.away_score;
      } else {
        const fH = features.get(m.home_team_id);
        const fA = features.get(m.away_team_id);
        if (!fH || !fA) continue;
        ({ hs, as } = simulateGroupMatch(fH, fA));
      }
      home.gf += hs; home.gd += hs - as;
      away.gf += as; away.gd += as - hs;
      if (hs > as) home.pts += 3;
      else if (hs < as) away.pts += 3;
      else { home.pts++; away.pts++; }
      // expected goals tracking
      bump(agg.xGF, m.home_team_id, hs); bump(agg.xGA, m.home_team_id, as);
      bump(agg.xGF, m.away_team_id, as); bump(agg.xGA, m.away_team_id, hs);
    }

    // 2) Pick top 2 of each group + 8 best thirds
    const top2: GroupStanding[] = [];
    const thirds: GroupStanding[] = [];
    const groupKeys = Array.from(standings.keys()).sort();
    for (const g of groupKeys) {
      const arr = Array.from(standings.get(g)!.values()).sort((a, b) =>
        b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.rank - b.rank);
      if (arr[0]) top2.push(arr[0]);
      if (arr[1]) top2.push(arr[1]);
      if (arr[2]) thirds.push(arr[2]);
    }
    thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.rank - b.rank);
    const all32 = [...top2, ...thirds.slice(0, 8)];
    if (all32.length < 4) continue;

    all32.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.rank - b.rank);

    // 3) Bracket pairing: 1 vs N, 2 vs N-1, ...
    let alive: string[] = [];
    const n = Math.min(32, all32.length);
    const pairCount = Math.floor(n / 2);
    for (let i = 0; i < pairCount; i++) {
      alive.push(all32[i].teamId);
      alive.push(all32[n - 1 - i].teamId);
    }
    // alive now ordered as [home1,away1,home2,away2,...]

    const advance = (input: string[], trackMap?: Map<string, number>): string[] => {
      const winners: string[] = [];
      for (let i = 0; i < input.length; i += 2) {
        const a = input[i]; const b = input[i + 1];
        if (!a || !b) { if (a) winners.push(a); continue; }
        const fA = features.get(a)!, fB = features.get(b)!;
        const res = simulateKnockoutMatch(fA, fB);
        winners.push(res.winnerId);
        if (trackMap) { bump(trackMap, res.winnerId, 1); }
      }
      return winners;
    };

    // Track which teams "reached" each phase (i.e., were alive entering that round)
    for (const tid of alive) bump(agg.r16, tid, 1);
    const r16w = advance(alive); // winners of R32 → reach R16
    for (const tid of r16w) bump(agg.qf, tid, 1);
    const qfw = advance(r16w);
    for (const tid of qfw) bump(agg.semi, tid, 1);
    const sfw = advance(qfw);
    for (const tid of sfw) bump(agg.final, tid, 1);
    const champ = advance(sfw);
    for (const tid of champ) bump(agg.champion, tid, 1);
  }

  return agg;
}

// ─────────────────────────────────────────────────────────────
// DETERMINISTIC "REPRESENTATIVE" BRACKET (modal scores)
// ─────────────────────────────────────────────────────────────
async function fetchAll<T>(_supabase: any, _table: string, _q: any): Promise<T[]> { return []; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const version = "live";
    const SIMS = 3000;

    const [teamsRes, matchesRes, analysesRes, standingsRes, historyRes] = await Promise.all([
      supabase.from("world_cup_2026_teams").select("id,name,slug,group_letter,fifa_ranking"),
      supabase.from("world_cup_2026_matches").select("id,stage,home_team_id,away_team_id,status,home_score,away_score,winner_team_id,group_letter").eq("stage", "group"),
      supabase.from("world_cup_2026_ai_analyses").select("match_id,predicted_home_score,predicted_away_score,confidence_score"),
      supabase.from("world_cup_2026_standings").select("team_id,group_letter"),
      supabase.from("world_cup_2026_team_history").select("team_id,goals_for,goals_against,wins,draws,losses"),
    ]);
    if (teamsRes.error) throw teamsRes.error;
    if (matchesRes.error) throw matchesRes.error;
    if (analysesRes.error) throw analysesRes.error;
    if (standingsRes.error) throw standingsRes.error;
    if (historyRes.error) throw historyRes.error;

    const allTeams = (teamsRes.data ?? []) as Team[];
    const groupByTeam = new Map<string, string>();
    for (const s of (standingsRes.data ?? []) as any[]) {
      if (s.team_id && s.group_letter) groupByTeam.set(s.team_id, s.group_letter);
    }
    for (const t of allTeams) {
      if (!t.group_letter && groupByTeam.has(t.id)) t.group_letter = groupByTeam.get(t.id)!;
    }

    // Canonical dedup (same logic as before)
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const canonicalByName = new Map<string, Team>();
    for (const t of allTeams) {
      const key = norm(t.name);
      const existing = canonicalByName.get(key);
      if (!existing) canonicalByName.set(key, t);
      else if (!existing.group_letter && t.group_letter) canonicalByName.set(key, t);
    }
    const aliasPairs: [string, string][] = [
      ["spain","espanha"],["france","franca"],["england","inglaterra"],["germany","alemanha"],
      ["italy","italia"],["netherlands","paises baixos"],["holland","paises baixos"],
      ["belgium","belgica"],["switzerland","suica"],["denmark","dinamarca"],
      ["croatia","croacia"],["serbia","servia"],["turkey","turquia"],["ukraine","ucrania"],
      ["poland","polonia"],["portugal","portugal"],["scotland","escocia"],["wales","pais de gales"],
      ["norway","noruega"],["sweden","suecia"],["ireland","irlanda"],["czech republic","republica tcheca"],
      ["czechia","republica tcheca"],["greece","grecia"],["hungary","hungria"],["romania","romenia"],
      ["finland","finlandia"],["iceland","islandia"],["slovakia","eslovaquia"],["slovenia","eslovenia"],
      ["argentina","argentina"],["brazil","brasil"],["uruguay","uruguai"],["colombia","colombia"],
      ["chile","chile"],["peru","peru"],["ecuador","equador"],["paraguay","paraguai"],
      ["venezuela","venezuela"],["bolivia","bolivia"],["mexico","mexico"],["united states","estados unidos"],
      ["usa","estados unidos"],["canada","canada"],["panama","panama"],["costa rica","costa rica"],
      ["jamaica","jamaica"],["honduras","honduras"],["haiti","haiti"],["japan","japao"],
      ["south korea","coreia do sul"],["korea republic","coreia do sul"],["iran","ira"],
      ["saudi arabia","arabia saudita"],["iraq","iraque"],["qatar","catar"],["australia","australia"],
      ["new zealand","nova zelandia"],["uzbekistan","uzbequistao"],["jordan","jordania"],
      ["morocco","marrocos"],["senegal","senegal"],["nigeria","nigeria"],["egypt","egito"],
      ["algeria","argelia"],["tunisia","tunisia"],["cameroon","camaroes"],["ghana","gana"],
      ["ivory coast","costa do marfim"],["cote d'ivoire","costa do marfim"],
      ["south africa","africa do sul"],["cape verde","cabo verde"],
    ];
    for (const [en, pt] of aliasPairs) {
      const ent = canonicalByName.get(en);
      const ptt = canonicalByName.get(pt);
      if (ent && ptt) {
        const canon = ptt.group_letter ? ptt : ent.group_letter ? ent : ptt;
        canonicalByName.set(en, canon); canonicalByName.set(pt, canon);
      } else if (ent && !ptt) canonicalByName.set(pt, ent);
      else if (!ent && ptt) canonicalByName.set(en, ptt);
    }
    const canonicalIdByTeamId = new Map<string, string>();
    for (const t of allTeams) {
      const canon = canonicalByName.get(norm(t.name)) ?? t;
      canonicalIdByTeamId.set(t.id, canon.id);
    }
    const teams: Team[] = Array.from(new Set(canonicalIdByTeamId.values()))
      .map(id => allTeams.find(t => t.id === id)!).filter(Boolean);
    const teamById = new Map(teams.map(t => [t.id, t]));

    const groupMatchesRaw = ((matchesRes.data ?? []) as GroupMatch[]).filter(m => m.home_team_id && m.away_team_id);
    const groupMatches: GroupMatch[] = groupMatchesRaw.map(m => ({
      ...m,
      home_team_id: canonicalIdByTeamId.get(m.home_team_id) ?? m.home_team_id,
      away_team_id: canonicalIdByTeamId.get(m.away_team_id) ?? m.away_team_id,
    }));

    // Remap history team ids → canonical too
    const historyCanon: HistoryRow[] = ((historyRes.data ?? []) as HistoryRow[]).map(h => ({
      ...h, team_id: canonicalIdByTeamId.get(h.team_id) ?? h.team_id,
    }));

    const finishedGroup = groupMatches.filter(m => m.status === "finished" && m.home_score != null && m.away_score != null);
    const features = buildFeatures(teams, historyCanon, finishedGroup);

    const aiMap = new Map<string, AIAnalysis>();
    for (const a of (analysesRes.data ?? []) as AIAnalysis[]) aiMap.set(a.match_id, a);

    // ─── Deterministic "representative" bracket using MODAL scores ────────
    const rows: any[] = [];

    // Group standings via expected/modal goals
    const standings = new Map<string, Map<string, any>>();
    const initS = (teamId: string) => {
      const t = teamById.get(teamId); if (!t) return null;
      const g = t.group_letter ?? "?";
      if (!standings.has(g)) standings.set(g, new Map());
      const gm = standings.get(g)!;
      if (!gm.has(teamId)) gm.set(teamId, { teamId, team: t, pts: 0, gd: 0, gf: 0 });
      return gm.get(teamId)!;
    };

    for (const m of groupMatches) {
      const homeS = initS(m.home_team_id);
      const awayS = initS(m.away_team_id);
      if (!homeS || !awayS) continue;
      const fH = features.get(m.home_team_id);
      const fA = features.get(m.away_team_id);
      let hs: number, as: number;
      let basis: any = {};

      if (m.status === "finished" && m.home_score != null && m.away_score != null) {
        hs = m.home_score; as = m.away_score;
        basis = { source: "official" };
      } else if (fH && fA) {
        const { lH, lA } = lambdas(fH, fA);
        const dist = scoreDistribution(lH, lA);
        const ai = aiMap.get(m.id);
        if (ai?.predicted_home_score != null && ai?.predicted_away_score != null) {
          hs = ai.predicted_home_score; as = ai.predicted_away_score;
          basis = { source: "ai_analysis", confidence: ai.confidence_score, lambdas: { lH, lA }, probs: { pHome: dist.pHome, pDraw: dist.pDraw, pAway: dist.pAway } };
        } else {
          hs = dist.modal.h; as = dist.modal.a;
          basis = {
            source: "poisson_model",
            lambdas: { lH: +lH.toFixed(3), lA: +lA.toFixed(3) },
            probs: { pHome: +dist.pHome.toFixed(3), pDraw: +dist.pDraw.toFixed(3), pAway: +dist.pAway.toFixed(3) },
            modal_prob: +dist.modal.p.toFixed(3),
            top_scores: dist.grid.slice(0, 6).map(g => ({ h: g.h, a: g.a, prob: +g.p.toFixed(3) })),
            features: {
              home: { attack: +fH.attack.toFixed(2), defense: +fH.defense.toFixed(2), form_pts: fH.formPts, hist_gf: +fH.histGF.toFixed(2), hist_ga: +fH.histGA.toFixed(2), rank: fH.rank, samples: fH.sampleSize },
              away: { attack: +fA.attack.toFixed(2), defense: +fA.defense.toFixed(2), form_pts: fA.formPts, hist_gf: +fA.histGF.toFixed(2), hist_ga: +fA.histGA.toFixed(2), rank: fA.rank, samples: fA.sampleSize },
            },
          };
        }
        rows.push({
          match_id: m.id, phase: "group",
          slot_code: `G-${m.group_letter}-${m.id.slice(0, 8)}`,
          group_letter: m.group_letter,
          home_team_id: m.home_team_id, away_team_id: m.away_team_id,
          home_score: hs, away_score: as,
          winner_team_id: hs > as ? m.home_team_id : hs < as ? m.away_team_id : null,
          confidence: confidenceFromProb(basis.probs ?? { pHome: 0.33, pDraw: 0.33, pAway: 0.33 }),
          prob_home: basis.probs?.pHome, prob_draw: basis.probs?.pDraw, prob_away: basis.probs?.pAway,
          went_to_penalties: false,
          basis,
        });
      } else {
        continue;
      }

      homeS.gf += hs; homeS.gd += hs - as;
      awayS.gf += as; awayS.gd += as - hs;
      if (hs > as) homeS.pts += 3;
      else if (hs < as) awayS.pts += 3;
      else { homeS.pts++; awayS.pts++; }
    }

    // Build advancers
    const top2: any[] = []; const thirds: any[] = [];
    for (const letter of Array.from(standings.keys()).sort()) {
      const arr = Array.from(standings.get(letter)!.values()).sort((a, b) =>
        b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || (features.get(a.teamId)?.rank ?? 99) - (features.get(b.teamId)?.rank ?? 99));
      if (arr[0]) top2.push(arr[0]); if (arr[1]) top2.push(arr[1]); if (arr[2]) thirds.push(arr[2]);
    }
    thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    const all32 = [...top2, ...thirds.slice(0, 8)];
    all32.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    // Deterministic KO using modal scores
    const koRow = (phase: string, slot: string, home: Team, away: Team) => {
      const fH = features.get(home.id)!; const fA = features.get(away.id)!;
      const { lH, lA } = lambdas(fH, fA);
      const dist = scoreDistribution(lH, lA);
      let hs = dist.modal.h, as = dist.modal.a;
      let pens = false, hp: number | null = null, ap: number | null = null;
      let winnerId = hs > as ? home.id : hs < as ? away.id : null;
      if (winnerId == null) {
        pens = true;
        if (dist.pHome >= dist.pAway) { winnerId = home.id; hp = 4; ap = 3; }
        else { winnerId = away.id; hp = 3; ap = 4; }
      }
      const row = {
        phase, slot_code: slot,
        home_team_id: home.id, away_team_id: away.id,
        home_score: hs, away_score: as,
        home_pens: hp, away_pens: ap, went_to_penalties: pens,
        winner_team_id: winnerId,
        prob_home: +dist.pHome.toFixed(3),
        prob_draw: +dist.pDraw.toFixed(3),
        prob_away: +dist.pAway.toFixed(3),
        confidence: confidenceFromProb({ pHome: dist.pHome, pDraw: dist.pDraw, pAway: dist.pAway }),
        basis: {
          source: "poisson_model",
          lambdas: { lH: +lH.toFixed(3), lA: +lA.toFixed(3) },
          probs: { pHome: +dist.pHome.toFixed(3), pDraw: +dist.pDraw.toFixed(3), pAway: +dist.pAway.toFixed(3) },
          modal_prob: +dist.modal.p.toFixed(3),
          top_scores: dist.grid.slice(0, 6).map(g => ({ h: g.h, a: g.a, prob: +g.p.toFixed(3) })),
          features: {
            home: { attack: +fH.attack.toFixed(2), defense: +fH.defense.toFixed(2), form_pts: fH.formPts, hist_gf: +fH.histGF.toFixed(2), hist_ga: +fH.histGA.toFixed(2), rank: fH.rank, samples: fH.sampleSize },
            away: { attack: +fA.attack.toFixed(2), defense: +fA.defense.toFixed(2), form_pts: fA.formPts, hist_gf: +fA.histGF.toFixed(2), hist_ga: +fA.histGA.toFixed(2), rank: fA.rank, samples: fA.sampleSize },
          },
        },
        winnerTeam: teamById.get(winnerId)!,
      };
      rows.push(row);
      return row;
    };

    // R32
    const n = Math.min(32, all32.length);
    const pairs = Math.floor(n / 2);
    const r32winners: Team[] = [];
    for (let i = 0; i < pairs; i++) {
      const home = teamById.get(all32[i].teamId)!;
      const away = teamById.get(all32[n - 1 - i].teamId)!;
      const r = koRow("round_of_32", `R32-${i + 1}`, home, away);
      r32winners.push(r.winnerTeam);
    }

    const runRound = (input: Team[], phase: string, prefix: string) => {
      const winners: Team[] = []; const losers: Team[] = [];
      for (let i = 0; i < Math.floor(input.length / 2); i++) {
        const home = input[i * 2]; const away = input[i * 2 + 1];
        if (!home || !away) continue;
        const r = koRow(phase, `${prefix}-${i + 1}`, home, away);
        winners.push(r.winnerTeam);
        losers.push(r.winnerTeam.id === home.id ? away : home);
      }
      return { winners, losers };
    };

    const r16w = runRound(r32winners, "round_of_16", "R16").winners;
    const qfw = runRound(r16w, "quarter_final", "QF").winners;
    const sf = runRound(qfw, "semi_final", "SF");

    let championName: string | undefined; let thirdName: string | undefined;
    if (sf.winners.length >= 2) {
      const f = koRow("final", "F-1", sf.winners[0], sf.winners[1]);
      championName = f.winnerTeam.name;
    }
    if (sf.losers.length >= 2) {
      const t = koRow("third_place", "TP-1", sf.losers[0], sf.losers[1]);
      thirdName = t.winnerTeam.name;
    }

    // Strip helper field before insert
    const cleanRows = rows.map(({ winnerTeam, ...r }) => ({ ...r, projection_version: version }));

    const { error: delErr } = await supabase
      .from("wc2026_bracket_projections").delete()
      .eq("projection_version", version).eq("is_official_version", false);
    if (delErr) throw delErr;

    for (let i = 0; i < cleanRows.length; i += 200) {
      const chunk = cleanRows.slice(i, i + 200);
      const { error } = await supabase.from("wc2026_bracket_projections").insert(chunk);
      if (error) throw error;
    }

    // ─── MONTE CARLO ──────────────────────────────────────────────
    console.log(`Running Monte Carlo with ${SIMS} simulations...`);
    const t0 = Date.now();
    const mc = runMonteCarlo({ teams, features, groupMatches, N: SIMS });
    console.log(`MC done in ${Date.now() - t0}ms`);

    // Compute xG averages per team (sum across sims / SIMS / matches per team in groups)
    // Just store totals divided by SIMS to keep it interpretable as expected goals per team across the group stage
    const mcRows = teams.map(t => {
      const champ = (mc.champion.get(t.id) ?? 0) / SIMS;
      const finalP = (mc.final.get(t.id) ?? 0) / SIMS;
      const semiP = (mc.semi.get(t.id) ?? 0) / SIMS;
      const qfP = (mc.qf.get(t.id) ?? 0) / SIMS;
      const r16P = (mc.r16.get(t.id) ?? 0) / SIMS;
      const xgf = (mc.xGF.get(t.id) ?? 0) / SIMS;
      const xga = (mc.xGA.get(t.id) ?? 0) / SIMS;
      return {
        projection_version: version,
        team_id: t.id,
        p_champion: +champ.toFixed(4),
        p_final: +finalP.toFixed(4),
        p_semi: +semiP.toFixed(4),
        p_qf: +qfP.toFixed(4),
        p_r16: +r16P.toFixed(4),
        expected_goals_for: +xgf.toFixed(2),
        expected_goals_against: +xga.toFixed(2),
        simulations: SIMS,
        is_official_version: false,
        generated_at: new Date().toISOString(),
      };
    });

    // Delete prior live rows and insert fresh
    await supabase.from("wc2026_monte_carlo_results").delete()
      .eq("projection_version", version).eq("is_official_version", false);
    for (let i = 0; i < mcRows.length; i += 200) {
      const chunk = mcRows.slice(i, i + 200);
      const { error } = await supabase.from("wc2026_monte_carlo_results").insert(chunk);
      if (error) throw error;
    }

    // Top 5 champions for the response
    const top = [...mcRows].sort((a, b) => b.p_champion - a.p_champion).slice(0, 5)
      .map(r => ({ team: teamById.get(r.team_id)?.name, p_champion: r.p_champion }));

    return new Response(JSON.stringify({
      ok: true, version,
      counts: { total: cleanRows.length, monte_carlo_rows: mcRows.length, simulations: SIMS },
      champion: championName, third: thirdName,
      monte_carlo_top: top,
      mc_time_ms: Date.now() - t0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("project-bracket error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
