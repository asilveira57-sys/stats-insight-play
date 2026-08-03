// Sync pre-game / historical 1X2 odds for generic `partidas` from API-Football.
// POST { partida_id?: uuid, liga_slug?: string, season?: number, limit?: number, upcoming_only?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BET_MATCH_WINNER = 1;
const BET_GOALS_OU = 5;
const BET_BTTS = 8;
const PREFERRED = ["bet365", "betfair"];

interface OddValue { value: string; odd: string }
interface Bet { id: number; name: string; values: OddValue[] }
interface Bookmaker { id: number; name: string; bets: Bet[] }

const num = (v?: string) => {
  if (!v) return null;
  const n = parseFloat(v);
  return isFinite(n) && n > 1 ? n : null;
};

function pickBookmaker(bks: Bookmaker[]): Bookmaker | null {
  for (const want of PREFERRED) {
    const found = bks.find((b) => (b.name ?? "").toLowerCase().includes(want));
    if (found) return found;
  }
  return bks[0] ?? null;
}

function oddFrom(bk: Bookmaker, betId: number, match: (v: string) => boolean): number | null {
  const bet = bk.bets?.find((b) => b.id === betId);
  if (!bet) return null;
  for (const v of bet.values) if (match(String(v.value))) return num(v.odd);
  return null;
}

function impliedProbs(h: number | null, d: number | null, a: number | null) {
  if (!h || !d || !a) return { ph: null, pd: null, pa: null };
  const rh = 1 / h, rd = 1 / d, ra = 1 / a, s = rh + rd + ra;
  return {
    ph: +((100 * rh) / s).toFixed(2),
    pd: +((100 * rd) / s).toFixed(2),
    pa: +((100 * ra) / s).toFixed(2),
  };
}

async function apiFootball(path: string) {
  const r = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": API_KEY },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`API-Football ${r.status}`);
  const errs = j?.errors;
  if (errs && !Array.isArray(errs) && Object.keys(errs).length) {
    throw new Error(`API-Football: ${JSON.stringify(errs)}`);
  }
  return j;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(fc|ec|sc|ac|clube|club|futebol|regatas|atletico|athletico)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

async function resolveFixtureId(
  apiLeagueId: number | null,
  season: number,
  date: string,
  homeName: string,
  awayName: string,
): Promise<number | null> {
  if (!apiLeagueId) return null;
  const j = await apiFootball(`/fixtures?league=${apiLeagueId}&season=${season}&date=${date}`);
  const h = norm(homeName), a = norm(awayName);
  for (const f of j.response ?? []) {
    const fh = norm(f.teams?.home?.name ?? ""), fa = norm(f.teams?.away?.name ?? "");
    if ((fh.includes(h) || h.includes(fh)) && (fa.includes(a) || a.includes(fa))) {
      return f.fixture?.id ?? null;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!API_KEY) throw new Error("API_FOOTBALL_KEY não configurada");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const {
      partida_id,
      liga_slug = "campeonato-brasileiro-serie-a",
      season,
      limit = 30,
      upcoming_only = false,
    } = body as {
      partida_id?: string; liga_slug?: string; season?: number;
      limit?: number; upcoming_only?: boolean;
    };

    let q = supabase
      .from("partidas")
      .select("id, data, hora, status, api_id, api_source, liga_id, ligas!inner(slug, api_id), casa:times!partidas_time_casa_id_fkey(nome), fora:times!partidas_time_fora_id_fkey(nome)")
      .order("data", { ascending: false })
      .limit(Math.min(limit, 100));

    if (partida_id) q = q.eq("id", partida_id);
    else {
      q = q.eq("ligas.slug", liga_slug);
      const year = season ?? new Date().getUTCFullYear();
      q = q.gte("data", `${year}-01-01`).lte("data", `${year}-12-31`);
      if (upcoming_only) q = q.eq("status", "scheduled");
    }

    const { data: matches, error } = await q;
    if (error) throw error;

    const results: Array<{ partida_id: string; ok: boolean; fixture?: number; bookmaker?: string; error?: string }> = [];
    let succeeded = 0, failed = 0;

    for (const m of (matches ?? []) as any[]) {
      try {
        // Do not overwrite a pre-game snapshot once the match has started.
        const { data: existing } = await supabase
          .from("match_odds")
          .select("id, is_pregame")
          .eq("partida_id", m.id)
          .maybeSingle();
        const started = m.status !== "scheduled";
        if (existing && started) {
          results.push({ partida_id: m.id, ok: true, bookmaker: "kept_pregame_snapshot" });
          succeeded++;
          continue;
        }

        const seasonYear = Number(String(m.data).slice(0, 4));
        let fixtureId: number | null =
          m.api_source === "api-football" && m.api_id ? Number(m.api_id) : null;
        if (!fixtureId) {
          fixtureId = await resolveFixtureId(
            m.ligas?.api_id ?? null,
            seasonYear,
            String(m.data).slice(0, 10),
            m.casa?.nome ?? "",
            m.fora?.nome ?? "",
          );
        }
        if (!fixtureId) {
          results.push({ partida_id: m.id, ok: false, error: "fixture_not_found" });
          failed++;
          continue;
        }

        const oddsJson = await apiFootball(`/odds?fixture=${fixtureId}`);
        const bks = (oddsJson.response?.[0]?.bookmakers ?? []) as Bookmaker[];
        const bk = pickBookmaker(bks);
        if (!bk) {
          results.push({ partida_id: m.id, ok: false, fixture: fixtureId, error: "no_odds" });
          failed++;
          continue;
        }

        const home = oddFrom(bk, BET_MATCH_WINNER, (v) => v === "Home");
        const draw = oddFrom(bk, BET_MATCH_WINNER, (v) => v === "Draw");
        const away = oddFrom(bk, BET_MATCH_WINNER, (v) => v === "Away");
        if (!home && !draw && !away) {
          results.push({ partida_id: m.id, ok: false, fixture: fixtureId, error: "no_1x2" });
          failed++;
          continue;
        }
        const { ph, pd, pa } = impliedProbs(home, draw, away);

        const { error: upErr } = await supabase.from("match_odds").upsert(
          {
            partida_id: m.id,
            bookmaker: bk.name ?? "average",
            home_win: home,
            draw,
            away_win: away,
            over_2_5: oddFrom(bk, BET_GOALS_OU, (v) => v === "Over 2.5"),
            under_2_5: oddFrom(bk, BET_GOALS_OU, (v) => v === "Under 2.5"),
            btts_yes: oddFrom(bk, BET_BTTS, (v) => v.toLowerCase() === "yes"),
            btts_no: oddFrom(bk, BET_BTTS, (v) => v.toLowerCase() === "no"),
            implied_prob_home: ph,
            implied_prob_draw: pd,
            implied_prob_away: pa,
            is_pregame: !started,
            external_fixture_id: fixtureId,
            source: "api-football",
            raw: { bookmaker_count: bks.length },
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "partida_id,bookmaker" },
        );
        if (upErr) throw upErr;

        results.push({ partida_id: m.id, ok: true, fixture: fixtureId, bookmaker: bk.name });
        succeeded++;
      } catch (e) {
        results.push({ partida_id: m.id, ok: false, error: (e as Error).message });
        failed++;
      } finally {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    return new Response(JSON.stringify({ processed: (matches ?? []).length, succeeded, failed, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
