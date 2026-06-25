// Sync odds (1X2, O/U 2.5, BTTS, Correct Score) for WC2026 matches from API-Football.
// POST { match_id?: uuid, all?: boolean, limit?: number }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// API-Football bet IDs
const BET_MATCH_WINNER = 1;     // 1X2 -> values: "Home" / "Draw" / "Away"
const BET_GOALS_OU = 5;          // values: "Over 2.5" / "Under 2.5"
const BET_BTTS = 8;              // values: "Yes" / "No"
const BET_CORRECT_SCORE = 10;    // values: "1:0", "2:1", ...

interface OddValue { value: string; odd: string }
interface Bet { id: number; name: string; values: OddValue[] }
interface Bookmaker { id: number; name: string; bets: Bet[] }

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return isFinite(n) ? n : null;
}

function avgOdd(bookmakers: Bookmaker[], betId: number, valueMatch: (v: string) => boolean): number | null {
  const odds: number[] = [];
  for (const bk of bookmakers) {
    const bet = bk.bets?.find(b => b.id === betId);
    if (!bet) continue;
    for (const v of bet.values) {
      if (valueMatch(String(v.value))) {
        const n = num(v.odd);
        if (n && n > 1) odds.push(n);
      }
    }
  }
  if (!odds.length) return null;
  return +(odds.reduce((a, b) => a + b, 0) / odds.length).toFixed(2);
}

function buildExactScores(bookmakers: Bookmaker[]): Record<string, number> {
  const acc: Record<string, number[]> = {};
  for (const bk of bookmakers) {
    const bet = bk.bets?.find(b => b.id === BET_CORRECT_SCORE);
    if (!bet) continue;
    for (const v of bet.values) {
      const key = String(v.value).replace(":", "-");
      const n = num(v.odd);
      if (n && n > 1) (acc[key] ||= []).push(n);
    }
  }
  const out: Record<string, number> = {};
  for (const [k, arr] of Object.entries(acc)) {
    out[k] = +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
  }
  return out;
}

async function fetchOdds(fixtureId: number) {
  const url = `https://v3.football.api-sports.io/odds?fixture=${fixtureId}`;
  const r = await fetch(url, { headers: { "x-apisports-key": API_FOOTBALL_KEY } });
  if (!r.ok) throw new Error(`API-Football ${r.status}`);
  const j = await r.json();
  return (j.response?.[0]?.bookmakers ?? []) as Bookmaker[];
}

function impliedProbs(h: number | null, d: number | null, a: number | null) {
  if (!h || !d || !a) return { ph: null, pd: null, pa: null };
  const rh = 1 / h, rd = 1 / d, ra = 1 / a;
  const s = rh + rd + ra;
  return {
    ph: +(100 * rh / s).toFixed(2),
    pd: +(100 * rd / s).toFixed(2),
    pa: +(100 * ra / s).toFixed(2),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const { match_id, all, limit = 50 } = body as { match_id?: string; all?: boolean; limit?: number };

    let q = supabase
      .from("world_cup_2026_matches")
      .select("id, external_fixture_id, match_date")
      .not("external_fixture_id", "is", null)
      .order("match_date", { ascending: true });

    if (match_id) q = q.eq("id", match_id);
    else if (!all) q = q.gte("match_date", new Date().toISOString()).limit(Math.min(limit, 100));
    else q = q.limit(Math.min(limit, 500));

    const { data: matches, error } = await q;
    if (error) throw error;

    const results: Array<{ match_id: string; ok: boolean; bookmakers?: number; error?: string }> = [];
    let processed = 0, succeeded = 0, failed = 0;

    for (const m of matches ?? []) {
      try {
        const bookmakers = await fetchOdds(m.external_fixture_id!);
        if (!bookmakers.length) {
          results.push({ match_id: m.id, ok: false, error: "no_odds" });
          failed++; processed++;
          continue;
        }
        const home = avgOdd(bookmakers, BET_MATCH_WINNER, v => v === "Home");
        const draw = avgOdd(bookmakers, BET_MATCH_WINNER, v => v === "Draw");
        const away = avgOdd(bookmakers, BET_MATCH_WINNER, v => v === "Away");
        const over = avgOdd(bookmakers, BET_GOALS_OU, v => v === "Over 2.5");
        const under = avgOdd(bookmakers, BET_GOALS_OU, v => v === "Under 2.5");
        const btts_y = avgOdd(bookmakers, BET_BTTS, v => v.toLowerCase() === "yes");
        const btts_n = avgOdd(bookmakers, BET_BTTS, v => v.toLowerCase() === "no");
        const exact = buildExactScores(bookmakers);
        const { ph, pd, pa } = impliedProbs(home, draw, away);

        const { error: upErr } = await supabase.from("wc2026_match_odds").upsert({
          match_id: m.id,
          external_fixture_id: m.external_fixture_id,
          bookmaker: "average",
          home_win: home, draw, away_win: away,
          over_2_5: over, under_2_5: under,
          btts_yes: btts_y, btts_no: btts_n,
          exact_scores: exact,
          implied_prob_home: ph, implied_prob_draw: pd, implied_prob_away: pa,
          source: "api-football",
          raw: { bookmaker_count: bookmakers.length },
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "match_id,bookmaker" });
        if (upErr) throw upErr;

        results.push({ match_id: m.id, ok: true, bookmakers: bookmakers.length });
        succeeded++;
      } catch (e) {
        results.push({ match_id: m.id, ok: false, error: (e as Error).message });
        failed++;
      } finally {
        processed++;
        // Polite delay to respect API-Football rate limits
        await new Promise(r => setTimeout(r, 250));
      }
    }

    return new Response(JSON.stringify({ processed, succeeded, failed, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
