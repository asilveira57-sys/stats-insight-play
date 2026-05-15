import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = 'https://v3.football.api-sports.io';
const QUOTA_BUFFER = 5000; // não passar de (limit - 5000) para deixar folga
const MAX_JOBS_PER_INVOCATION = 8; // número de jobs (não fixtures) por chamada
const TIME_BUDGET_MS = 110_000; // sai antes do idle timeout de 150s

type Job = {
  id: string;
  league_id: number;
  league_name: string | null;
  season: number;
  depth: 'fixtures' | 'events' | 'lineups' | 'stats';
  fixtures_total: number | null;
  requests_used: number | null;
};

const STATUS_MAP: Record<string, string> = {
  TBD: 'scheduled', NS: 'scheduled', '1H': 'live', HT: 'live', '2H': 'live',
  ET: 'live', BT: 'live', P: 'live', SUSP: 'live', INT: 'live',
  FT: 'finished', AET: 'finished', PEN: 'finished',
  PST: 'postponed', CANC: 'cancelled', ABD: 'cancelled',
  AWD: 'finished', WO: 'finished', LIVE: 'live',
};

async function fetchAF(path: string, key: string) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': 'v3.football.api-sports.io' },
  });
  if (!r.ok) throw new Error(`AF ${path} -> ${r.status}`);
  const j = await r.json();
  if (j.errors && Object.keys(j.errors).length && !Array.isArray(j.errors)) {
    throw new Error(`AF errors ${path}: ${JSON.stringify(j.errors)}`);
  }
  return j;
}

async function syncQuota(supabase: any, key: string) {
  const today = new Date().toISOString().slice(0, 10);
  const status = await fetchAF('/status', key);
  const used = status.response?.requests?.current ?? 0;
  const limit = status.response?.requests?.limit_day ?? 75000;
  await supabase.from('api_football_quota_log').upsert(
    { day: today, requests_used: used, daily_limit: limit, last_check: new Date().toISOString() },
    { onConflict: 'day' },
  );
  return { used, limit };
}

async function ensureLeague(supabase: any, job: Job, leagueMeta?: any) {
  // Procura liga existente por api_id
  const { data: existing } = await supabase
    .from('ligas').select('id').eq('api_id', job.league_id).maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from('ligas')
    .insert({
      nome: job.league_name ?? leagueMeta?.name ?? `League ${job.league_id}`,
      pais: leagueMeta?.country ?? null,
      logo_url: leagueMeta?.logo ?? null,
      api_id: job.league_id,
      api_source: 'api-football',
      ativa: true,
    })
    .select('id').single();
  if (error) throw error;
  return created.id as string;
}

async function processFixtures(supabase: any, key: string, job: Job) {
  const data = await fetchAF(`/fixtures?league=${job.league_id}&season=${job.season}`, key);
  const fixtures = data.response ?? [];
  if (fixtures.length === 0) {
    return { fixtures_total: 0, requests_used: 1, message: 'no fixtures' };
  }

  const ligaId = await ensureLeague(supabase, job, fixtures[0]?.league);
  let processed = 0;

  for (const f of fixtures) {
    try {
      const homeName = f.teams?.home?.name;
      const awayName = f.teams?.away?.name;
      const dateStr = f.fixture?.date?.slice(0, 10);
      if (!homeName || !awayName || !dateStr) continue;

      const { data: homeId } = await supabase.rpc('resolve_or_create_team', {
        p_nome: homeName, p_external_id: String(f.teams.home.id),
        p_escudo_url: f.teams.home.logo, p_api_id: f.teams.home.id,
      });
      const { data: awayId } = await supabase.rpc('resolve_or_create_team', {
        p_nome: awayName, p_external_id: String(f.teams.away.id),
        p_escudo_url: f.teams.away.logo, p_api_id: f.teams.away.id,
      });

      const round = f.league?.round?.match(/(\d+)/)?.[1];
      const { data: matchId } = await supabase.rpc('resolve_or_create_match', {
        p_time_casa_id: homeId,
        p_time_fora_id: awayId,
        p_data: dateStr,
        p_hora: f.fixture.date.slice(11, 19),
        p_liga_id: ligaId,
        p_api_id: f.fixture.id,
        p_status: STATUS_MAP[f.fixture.status?.short] ?? 'scheduled',
        p_rodada: round ? parseInt(round, 10) : null,
      });

      // Atualiza placar se finished
      if (matchId && f.goals?.home != null && f.goals?.away != null) {
        await supabase.from('partidas').update({
          gols_casa: f.goals.home,
          gols_fora: f.goals.away,
          api_source: 'api-football',
        }).eq('id', matchId);
      }
      processed++;
    } catch (e) {
      console.warn('fixture row error', e);
    }
  }

  return { fixtures_total: fixtures.length, requests_used: 1, processed };
}

async function processFixtureDetail(
  supabase: any, key: string, job: Job, endpoint: 'events' | 'lineups' | 'statistics',
) {
  // Busca partidas dessa liga/temporada já no banco com api_id
  const { data: liga } = await supabase
    .from('ligas').select('id').eq('api_id', job.league_id).maybeSingle();
  if (!liga) return { fixtures_total: 0, requests_used: 0, message: 'liga not found - run fixtures first' };

  const yearStart = `${job.season}-01-01`;
  const yearEnd = `${job.season + 1}-07-31`; // temporadas europeias atravessam ano
  const { data: matches } = await supabase
    .from('partidas')
    .select('id, api_id')
    .eq('liga_id', liga.id)
    .not('api_id', 'is', null)
    .gte('data', yearStart)
    .lte('data', yearEnd);

  const list = matches ?? [];
  let used = 0;
  let processed = 0;

  // Faz em paralelo, 8 por vez
  const batchSize = 8;
  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    await Promise.all(batch.map(async (m: any) => {
      try {
        const data = await fetchAF(`/fixtures/${endpoint}?fixture=${m.api_id}`, key);
        used++;
        if (endpoint === 'events') {
          const events = data.response ?? [];
          if (events.length > 0) {
            await supabase.from('partidas').update({
              api_events: events,
              updated_at: new Date().toISOString(),
            }).eq('id', m.id);
          }
        } else if (endpoint === 'lineups') {
          const lineups = data.response ?? [];
          if (lineups.length > 0) {
            await supabase.from('partidas').update({ api_lineups: lineups }).eq('id', m.id);
          }
        } else if (endpoint === 'statistics') {
          const stats = data.response ?? [];
          if (stats.length > 0) {
            await supabase.from('partidas').update({ api_statistics: stats }).eq('id', m.id);
          }
        }
        processed++;
      } catch (e) {
        console.warn(`detail ${endpoint} fixture ${m.api_id}`, e);
      }
    }));
  }

  return { fixtures_total: list.length, requests_used: used, processed };
}

async function runWorker(background = false): Promise<any> {
  const startedAt = Date.now();
  const apiKey = Deno.env.get('API_FOOTBALL_KEY');
  if (!apiKey) throw new Error('API_FOOTBALL_KEY not configured');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { used, limit } = await syncQuota(supabase, apiKey);
  if (used >= limit - QUOTA_BUFFER) {
    return { ok: true, paused: true, used, limit };
  }

  const { data: jobs } = await supabase
    .from('api_football_import_jobs')
    .select('id, league_id, league_name, season, depth, fixtures_total, requests_used')
    .eq('status', 'queued')
    .order('priority', { ascending: true })
    .order('depth', { ascending: true })
    .limit(MAX_JOBS_PER_INVOCATION);

  const ordered = (jobs ?? []).sort((a, b) => {
    const order = { fixtures: 0, events: 1, lineups: 2, stats: 3 } as any;
    return order[a.depth] - order[b.depth];
  });

  if (ordered.length === 0) {
    return { ok: true, idle: true, used, limit };
  }

  const results: any[] = [];
  for (const job of ordered as Job[]) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      console.log('time budget reached, deferring remaining jobs');
      break;
    }
    await supabase.from('api_football_import_jobs').update({
      status: 'running', started_at: new Date().toISOString(),
    }).eq('id', job.id);

    try {
      let result;
      if (job.depth === 'fixtures') {
        result = await processFixtures(supabase, apiKey, job);
      } else {
        const ep = job.depth === 'stats' ? 'statistics' : job.depth;
        result = await processFixtureDetail(supabase, apiKey, job, ep as any);
      }
      await supabase.from('api_football_import_jobs').update({
        status: 'done',
        fixtures_total: result.fixtures_total,
        fixtures_processed: result.processed ?? result.fixtures_total,
        requests_used: result.requests_used,
        finished_at: new Date().toISOString(),
      }).eq('id', job.id);
      results.push({ job_id: job.id, ...result });
    } catch (e) {
      await supabase.from('api_football_import_jobs').update({
        status: 'failed', error: String(e), finished_at: new Date().toISOString(),
      }).eq('id', job.id);
      results.push({ job_id: job.id, error: String(e) });
    }

    const q = await syncQuota(supabase, apiKey);
    if (q.used >= q.limit - QUOTA_BUFFER) break;
  }

  // Auto re-invoca em background se ainda houver jobs queued
  try {
    const { count } = await supabase
      .from('api_football_import_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'queued');
    if ((count ?? 0) > 0) {
      const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/apifootball-worker`;
      fetch(selfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ background: true }),
      }).catch((e) => console.warn('self-reinvoke failed', e));
    }
  } catch (e) {
    console.warn('queue check failed', e);
  }

  const final = await syncQuota(supabase, apiKey);
  return { ok: true, processed: results.length, results, quota: final, duration_ms: Date.now() - startedAt };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Dispara em background e responde imediatamente para evitar idle timeout
    const task = runWorker().catch((e) => console.error('worker bg error', e));
    // @ts-ignore EdgeRuntime is available in Supabase edge functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(task);
    }
    return new Response(JSON.stringify({ ok: true, started: true, message: 'worker em execução em background' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('worker error', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
