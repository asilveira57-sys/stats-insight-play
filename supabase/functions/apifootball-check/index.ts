// Consulta leve à API-Football para diagnóstico (sem gravar nada além da cota do dia).
// Body: { leagueIds?: number[], country?: string }
// - sempre: /status (plano, cota) — 1 chamada
// - leagueIds: /leagues?id=X para cada id (máx. 12)
// - country: /leagues?country=X (1 chamada) — lista resumida das ligas do país
// - fixtures: {league, season} — /fixtures (1 chamada), devolve só contagem, erros e amostra (não grava)
// Recusa rodar se a cota do dia já passou de 80% (para não esgotar o plano grátis).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const BASE = 'https://v3.football.api-sports.io';

async function af(path: string, key: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': key } });
  const j = await r.json().catch(() => ({}));
  return { http: r.status, ...j };
}

function summarizeLeague(item: any) {
  const seasons = (item?.seasons ?? []) as any[];
  const current = seasons.find((s) => s.current);
  return {
    id: item?.league?.id,
    name: item?.league?.name,
    type: item?.league?.type,
    country: item?.country?.name,
    first_season: seasons.length ? Math.min(...seasons.map((s) => s.year)) : null,
    last_season: seasons.length ? Math.max(...seasons.map((s) => s.year)) : null,
    current_season: current?.year ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const key = Deno.env.get('API_FOOTBALL_KEY');
  if (!key) return json({ ok: false, error: 'API_FOOTBALL_KEY not configured' }, 500);
  const body = await req.json().catch(() => ({}));
  const leagueIds: number[] = Array.isArray(body.leagueIds) ? body.leagueIds.map(Number).filter(Boolean).slice(0, 12) : [];
  const country: string | null = typeof body.country === 'string' ? body.country : null;
  const fx = body.fixtures && body.fixtures.league && body.fixtures.season ? body.fixtures : null;

  const status = await af('/status', key);
  const acc = status?.response ?? {};
  const used = acc?.requests?.current ?? null;
  const limit = acc?.requests?.limit_day ?? null;
  const out: any = {
    ok: true,
    status_http: status.http,
    errors: status.errors,
    plan: acc?.subscription?.plan ?? null,
    active: acc?.subscription?.active ?? null,
    used,
    limit,
  };

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (used != null && limit != null) {
    await supabase.from('api_football_quota_log').upsert(
      { day: new Date().toISOString().slice(0, 10), requests_used: used, daily_limit: limit, last_check: new Date().toISOString() },
      { onConflict: 'day' },
    );
  }
  if (limit && used != null && used + leagueIds.length + (country ? 1 : 0) + (fx ? 1 : 0) > limit * 0.8) {
    out.skipped = 'quota above 80%';
    return json(out);
  }

  if (leagueIds.length) {
    out.leagues = [];
    for (const id of leagueIds) {
      const r = await af(`/leagues?id=${id}`, key);
      out.leagues.push(r.response?.[0] ? summarizeLeague(r.response[0]) : { id, error: r.errors ?? 'not found' });
    }
  }
  if (country) {
    const r = await af(`/leagues?country=${encodeURIComponent(country)}`, key);
    out.country_leagues = (r.response ?? []).map(summarizeLeague);
    if (!r.response) out.country_errors = r.errors;
  }
  if (fx) {
    const r = await af(`/fixtures?league=${Number(fx.league)}&season=${Number(fx.season)}`, key);
    const list = (r.response ?? []) as any[];
    const finished = list.filter((f) => f.goals?.home != null && f.goals?.away != null);
    out.fixtures = {
      league: Number(fx.league),
      season: Number(fx.season),
      errors: r.errors,
      total: list.length,
      com_placar: finished.length,
      ultimo_com_placar: finished.map((f) => f.fixture?.date?.slice(0, 10)).sort().pop() ?? null,
      amostra: finished.slice(-3).map((f) => `${f.fixture?.date?.slice(0, 10)} ${f.teams?.home?.name} ${f.goals?.home}x${f.goals?.away} ${f.teams?.away?.name}`),
    };
  }
  return json(out);
});
