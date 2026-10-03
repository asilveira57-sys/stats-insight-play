import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = 'https://v3.football.api-sports.io';

// Países e ligas-alvo. League IDs específicos para competições mundiais/continentais.
const TARGET_COUNTRIES = [
  'Brazil', 'England', 'Spain', 'Italy', 'Germany', 'France',
  'USA', 'Argentina', 'Portugal', 'Netherlands', 'Mexico',
];
// Ligas mundiais individuais (country=World). Pegamos por id pra controlar o que entra.
const WORLD_LEAGUE_IDS = [
  1,   // World Cup
  4,   // Euro Championship
  9,   // Copa America
  15,  // FIFA Club World Cup
  2,   // UEFA Champions League
  3,   // UEFA Europa League
  848, // UEFA Conference League
  5,   // UEFA Nations League
  6,   // Africa Cup of Nations
  7,   // Asian Cup
  10,  // Friendlies
  13,  // Copa Libertadores (já presente)
  11,  // Copa Sudamericana (já presente)
  73,  // Copa do Brasil (BR)
];

// Marcadores de prioridade Aleball
const PRIORITY_LEAGUE_IDS = new Set<number>([
  // Brasil
  71, 72, 73, 75,
  // Estaduais BR
  422, 423, 425, 428, 440, 441, 442, 444, 461, 475, 519,
  // Conmebol
  11, 13,
  // Big-5 + cups Europa
  39, 140, 135, 78, 61, 2, 3, 848, 5, 15,
  // Mundo
  1, 4, 9,
  // Américas
  128, 253,
]);

async function fetchAF(path: string, key: string) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': 'v3.football.api-sports.io' },
  });
  if (!r.ok) throw new Error(`API-Football ${path} -> ${r.status}`);
  const j = await r.json();
  if (j.errors && Object.keys(j.errors).length && !Array.isArray(j.errors)) {
    throw new Error(`API-Football errors: ${JSON.stringify(j.errors)}`);
  }
  return j;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) throw new Error('API_FOOTBALL_KEY not configured');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const collected = new Map<number, any>();
    let requestsUsed = 0;

    // Catálogo global: 1 chamada retorna TODAS as ligas disponíveis
    const all = await fetchAF('/leagues', apiKey);
    requestsUsed++;
    for (const item of all.response || []) {
      const lid = item.league?.id;
      if (!lid) continue;
      collected.set(lid, item);
    }

    // Persiste
    const rows = Array.from(collected.values()).map((it: any) => ({
      league_id: it.league.id,
      league_name: it.league.name,
      league_type: it.league.type,
      country: it.country?.name ?? null,
      country_code: it.country?.code ?? null,
      logo_url: it.league.logo ?? null,
      flag_url: it.country?.flag ?? null,
      seasons: it.seasons ?? [],
      is_priority: PRIORITY_LEAGUE_IDS.has(it.league.id),
      last_refresh: new Date().toISOString(),
    }));

    // Upsert em lotes
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('api_football_inventory')
        .upsert(chunk, { onConflict: 'league_id' });
      if (error) throw error;
    }

    // Atualiza quota
    const today = new Date().toISOString().slice(0, 10);
    const status = await fetchAF('/status', apiKey);
    requestsUsed++;
    const used = status.response?.requests?.current ?? 0;
    const limit = status.response?.requests?.limit_day ?? 75000;
    await supabase.from('api_football_quota_log').upsert(
      { day: today, requests_used: used, daily_limit: limit, last_check: new Date().toISOString() },
      { onConflict: 'day' },
    );

    return new Response(
      JSON.stringify({
        ok: true,
        leagues: rows.length,
        requests_used_this_call: requestsUsed,
        quota: { used, limit_day: limit },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('inventory error', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
