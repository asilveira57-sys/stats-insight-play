import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

// All estadual leagues to sync
const ESTADUAIS: Record<number, { code: string; name: string }> = {
  475: { code: 'SPA', name: 'Campeonato Paulista' },
  423: { code: 'RJA', name: 'Campeonato Carioca' },
  425: { code: 'MGA', name: 'Campeonato Mineiro' },
  442: { code: 'RSA', name: 'Campeonato Gaúcho' },
  444: { code: 'PRA', name: 'Campeonato Paranaense' },
  422: { code: 'PEA', name: 'Campeonato Pernambucano' },
  441: { code: 'CEA', name: 'Campeonato Cearense' },
  440: { code: 'BAA', name: 'Campeonato Baiano' },
  519: { code: 'SCA', name: 'Campeonato Catarinense' },
  428: { code: 'GOA', name: 'Campeonato Goiano' },
  461: { code: 'CNE', name: 'Copa do Nordeste' },
};

interface RateLimitState {
  remaining: number;
  requestsMade: number;
}

async function fetchWithRateLimit(
  endpoint: string,
  apiKey: string,
  rateState: RateLimitState
): Promise<{ data: any; rateState: RateLimitState }> {
  const url = `${API_FOOTBALL_BASE_URL}${endpoint}`;
  console.log(`[rate-limit] remaining=${rateState.remaining}, total_requests=${rateState.requestsMade} | Fetching: ${url}`);

  // If remaining is low, wait before requesting
  if (rateState.remaining > 0 && rateState.remaining < 10) {
    console.log(`[rate-limit] Low remaining (${rateState.remaining}), waiting 60s...`);
    await delay(60000);
  }

  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  // Update rate limit from headers
  const newRemaining = parseInt(response.headers.get('x-ratelimit-requests-remaining') || '100', 10);
  const newState: RateLimitState = {
    remaining: newRemaining,
    requestsMade: rateState.requestsMade + 1,
  };

  if (!response.ok) {
    if (response.status === 429) {
      console.log('[rate-limit] 429 received, waiting 120s...');
      await delay(120000);
      // Retry once
      return fetchWithRateLimit(endpoint, apiKey, newState);
    }
    const errorText = await response.text();
    throw new Error(`API-Football ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football errors: ${JSON.stringify(data.errors)}`);
  }

  return { data, rateState: newState };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mapApiStatus(apiStatus: string): string {
  const statusMap: Record<string, string> = {
    'TBD': 'scheduled', 'NS': 'scheduled',
    '1H': 'live', 'HT': 'live', '2H': 'live', 'ET': 'live', 'BT': 'live',
    'P': 'live', 'SUSP': 'live', 'INT': 'live', 'LIVE': 'live',
    'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
    'AWD': 'finished', 'WO': 'finished',
    'PST': 'postponed', 'CANC': 'cancelled', 'ABD': 'cancelled',
  };
  return statusMap[apiStatus] || 'scheduled';
}

function extractRound(roundStr: string): number | null {
  const match = roundStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) throw new Error('API_FOOTBALL_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: filter specific leagues from request body
    let leagueFilter: number[] | null = null;
    try {
      const body = await req.json();
      if (body.leagues && Array.isArray(body.leagues)) {
        leagueFilter = body.leagues;
      }
    } catch {
      // No body, sync all
    }

    const leaguesToSync = leagueFilter
      ? Object.keys(ESTADUAIS).map(Number).filter(id => leagueFilter!.includes(id))
      : Object.keys(ESTADUAIS).map(Number);

    console.log(`[sync-estaduais-bulk] Starting bulk sync for ${leaguesToSync.length} leagues`);

    const stats = {
      leaguesSynced: 0,
      seasonsSynced: 0,
      matchesUpserted: 0,
      teamsUpserted: 0,
      errors: [] as string[],
      seasonsDiscovered: {} as Record<string, number[]>,
      stoppedEarly: false,
    };

    let rateState: RateLimitState = { remaining: 100, requestsMade: 0 };
    const startTime = Date.now();
    const MAX_RUNTIME_MS = 140000; // 140s safety margin (Deno limit ~150s)

    for (const leagueId of leaguesToSync) {
      // Check runtime
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.log('[sync-estaduais-bulk] Runtime limit approaching, stopping early');
        stats.stoppedEarly = true;
        break;
      }

      const leagueInfo = ESTADUAIS[leagueId];
      console.log(`\n=== Discovering seasons for ${leagueInfo.name} (${leagueId}) ===`);

      try {
        // 1. Discover available seasons
        const { data: leagueData, rateState: rs1 } = await fetchWithRateLimit(
          `/leagues?id=${leagueId}`,
          apiKey,
          rateState
        );
        rateState = rs1;

        const allSeasons: number[] = leagueData.response?.[0]?.seasons
          ?.map((s: any) => s.year)
          ?.sort((a: number, b: number) => a - b) || [];

        // Free plan only supports 2022-2024, filter to avoid wasting API requests
        const seasons = allSeasons.filter(y => y >= 2022 && y <= 2025);
        stats.seasonsDiscovered[leagueInfo.name] = seasons;
        console.log(`Found ${allSeasons.length} total seasons, using ${seasons.length} (2022+): ${seasons.join(', ')}`);

        await delay(2000); // Delay between league discovery and fixtures

        // 2. Sync each season
        for (const season of seasons) {
          if (Date.now() - startTime > MAX_RUNTIME_MS) {
            stats.stoppedEarly = true;
            break;
          }

          console.log(`--- Syncing ${leagueInfo.name} season ${season} ---`);

          try {
            // Fetch fixtures for this league+season
            const { data: fixturesData, rateState: rs2 } = await fetchWithRateLimit(
              `/fixtures?league=${leagueId}&season=${season}`,
              apiKey,
              rateState
            );
            rateState = rs2;

            const fixtures = fixturesData.response || [];
            console.log(`Found ${fixtures.length} fixtures for ${leagueInfo.name} ${season}`);

            // Get or create internal league
            let internalLeagueId: string | null = null;

            const { data: existingLeague } = await supabase
              .from('ligas')
              .select('id')
              .eq('api_id', leagueId)
              .maybeSingle();

            if (existingLeague) {
              internalLeagueId = existingLeague.id;
            } else {
              const { data: byCode } = await supabase
                .from('ligas')
                .select('id')
                .eq('codigo_api', leagueInfo.code)
                .maybeSingle();

              if (byCode) {
                internalLeagueId = byCode.id;
                await supabase.from('ligas').update({
                  api_source: 'api-football',
                  api_id: leagueId,
                  ativa: true,
                }).eq('id', internalLeagueId);
              } else {
                const { data: newLeague } = await supabase
                  .from('ligas')
                  .insert({
                    nome: leagueInfo.name,
                    codigo_api: leagueInfo.code,
                    pais: 'Brazil',
                    ativa: true,
                    api_source: 'api-football',
                    api_id: leagueId,
                    tipo_principal: 'ESTADUAL',
                  })
                  .select()
                  .single();
                internalLeagueId = newLeague?.id || null;
              }
            }

            if (!internalLeagueId) {
              stats.errors.push(`${leagueInfo.name}: could not resolve league ID`);
              continue;
            }

            // Process fixtures
            let seasonMatches = 0;
            for (const fixture of fixtures) {
              try {
                const { data: homeTeam } = await supabase
                  .from('times')
                  .upsert({
                    api_id: fixture.teams.home.id,
                    nome: fixture.teams.home.name,
                    escudo_url: fixture.teams.home.logo,
                    pais: 'Brazil',
                  }, { onConflict: 'api_id' })
                  .select()
                  .single();

                const { data: awayTeam } = await supabase
                  .from('times')
                  .upsert({
                    api_id: fixture.teams.away.id,
                    nome: fixture.teams.away.name,
                    escudo_url: fixture.teams.away.logo,
                    pais: 'Brazil',
                  }, { onConflict: 'api_id' })
                  .select()
                  .single();

                if (!homeTeam || !awayTeam) continue;

                const matchDate = new Date(fixture.fixture.date);
                const dateStr = matchDate.toISOString().split('T')[0];
                const timeStr = matchDate.toISOString().split('T')[1].substring(0, 8);

                const { error: matchError } = await supabase
                  .from('partidas')
                  .upsert({
                    api_id: fixture.fixture.id,
                    liga_id: internalLeagueId,
                    time_casa_id: homeTeam.id,
                    time_fora_id: awayTeam.id,
                    data: dateStr,
                    hora: timeStr,
                    gols_casa: fixture.goals.home,
                    gols_fora: fixture.goals.away,
                    status: mapApiStatus(fixture.fixture.status.short),
                    rodada: extractRound(fixture.league.round),
                  }, { onConflict: 'api_id' });

                if (!matchError) seasonMatches++;
              } catch (fixtureErr) {
                // Skip individual fixture errors silently
              }
            }

            stats.matchesUpserted += seasonMatches;
            stats.seasonsSynced++;
            console.log(`Synced ${seasonMatches} matches for ${leagueInfo.name} ${season}`);

            // Rate limit delay between seasons
            await delay(3000);

          } catch (seasonError) {
            const msg = seasonError instanceof Error ? seasonError.message : String(seasonError);
            console.error(`Error syncing ${leagueInfo.name} ${season}:`, msg);
            stats.errors.push(`${leagueInfo.name} ${season}: ${msg}`);
            // Continue to next season
          }
        }

        stats.leaguesSynced++;

        // Delay between leagues
        await delay(5000);

      } catch (leagueError) {
        const msg = leagueError instanceof Error ? leagueError.message : String(leagueError);
        console.error(`Error discovering ${leagueInfo.name}:`, msg);
        stats.errors.push(`${leagueInfo.name}: ${msg}`);
      }
    }

    console.log('\n[sync-estaduais-bulk] Complete:', JSON.stringify(stats, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        ...stats,
        apiRequestsMade: rateState.requestsMade,
        apiRemainingQuota: rateState.remaining,
        runtimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[sync-estaduais-bulk] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
