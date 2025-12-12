import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

// Leagues to sync from API-Football
const API_FOOTBALL_LEAGUES = {
  73: { code: 'CDB', name: 'Copa do Brasil', country: 'Brazil' },
  13: { code: 'CLI', name: 'Copa Libertadores', country: 'South America' },
  11: { code: 'CSA', name: 'Copa Sudamericana', country: 'South America' },
};

interface ApiFootballTeam {
  id: number;
  name: string;
  logo: string;
}

interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
    };
  };
  league: {
    id: number;
    name: string;
    round: string;
  };
  teams: {
    home: ApiFootballTeam;
    away: ApiFootballTeam;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

async function fetchFromApiFootball(endpoint: string, apiKey: string): Promise<any> {
  const url = `${API_FOOTBALL_BASE_URL}${endpoint}`;
  console.log(`Fetching from API-Football: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API-Football error:', response.status, errorText);
    throw new Error(`API-Football error: ${response.status}`);
  }

  const data = await response.json();
  
  // Check for API errors in response
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error('API-Football returned errors:', data.errors);
    throw new Error(`API-Football errors: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

function mapApiStatus(apiStatus: string): string {
  const statusMap: Record<string, string> = {
    'TBD': 'scheduled',
    'NS': 'scheduled',
    '1H': 'live',
    'HT': 'live',
    '2H': 'live',
    'ET': 'live',
    'BT': 'live',
    'P': 'live',
    'SUSP': 'live',
    'INT': 'live',
    'FT': 'finished',
    'AET': 'finished',
    'PEN': 'finished',
    'PST': 'postponed',
    'CANC': 'cancelled',
    'ABD': 'cancelled',
    'AWD': 'finished',
    'WO': 'finished',
    'LIVE': 'live',
  };
  return statusMap[apiStatus] || 'scheduled';
}

function extractRound(roundStr: string): number | null {
  // Extract round number from strings like "Round of 16", "Quarter-finals", "8th Round", etc.
  const match = roundStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional parameters
    let leaguesToSync = Object.keys(API_FOOTBALL_LEAGUES).map(Number);
    let season = new Date().getFullYear();
    
    try {
      const body = await req.json();
      if (body.leagues && Array.isArray(body.leagues)) {
        leaguesToSync = body.leagues;
      }
      if (body.season) {
        season = body.season;
      }
    } catch {
      // No body provided, use defaults
    }

    console.log(`Syncing leagues: ${leaguesToSync.join(', ')} for season ${season}`);

    const stats = {
      leaguesSynced: 0,
      teamsUpserted: 0,
      matchesUpserted: 0,
      errors: [] as string[],
    };

    // Get league IDs from database
    const { data: existingLeagues } = await supabase
      .from('ligas')
      .select('id, codigo_api, api_id')
      .eq('api_source', 'api-football');

    const leagueIdMap = new Map<number, string>();
    existingLeagues?.forEach(league => {
      if (league.api_id) {
        leagueIdMap.set(league.api_id, league.id);
      }
    });

    for (const leagueId of leaguesToSync) {
      try {
        const leagueInfo = API_FOOTBALL_LEAGUES[leagueId as keyof typeof API_FOOTBALL_LEAGUES];
        if (!leagueInfo) {
          console.log(`Unknown league ID: ${leagueId}`);
          continue;
        }

        console.log(`Syncing ${leagueInfo.name} (ID: ${leagueId})...`);

        // Get internal league ID
        let internalLeagueId = leagueIdMap.get(leagueId);
        
        if (!internalLeagueId) {
          // Create league if it doesn't exist
          const { data: newLeague, error: leagueError } = await supabase
            .from('ligas')
            .upsert({
              nome: leagueInfo.name,
              codigo_api: leagueInfo.code,
              pais: leagueInfo.country,
              ativa: true,
              api_source: 'api-football',
              api_id: leagueId,
            }, { onConflict: 'codigo_api' })
            .select()
            .single();

          if (leagueError) {
            console.error(`Error creating league ${leagueInfo.name}:`, leagueError);
            stats.errors.push(`League ${leagueInfo.name}: ${leagueError.message}`);
            continue;
          }
          internalLeagueId = newLeague.id;
        }

        // Fetch fixtures for this league
        const fixturesData = await fetchFromApiFootball(
          `/fixtures?league=${leagueId}&season=${season}`,
          apiKey
        );

        const fixtures: ApiFootballFixture[] = fixturesData.response || [];
        console.log(`Found ${fixtures.length} fixtures for ${leagueInfo.name}`);

        // Process each fixture
        for (const fixture of fixtures) {
          try {
            // Upsert home team
            const { data: homeTeam, error: homeError } = await supabase
              .from('times')
              .upsert({
                api_id: fixture.teams.home.id,
                nome: fixture.teams.home.name,
                escudo_url: fixture.teams.home.logo,
                pais: leagueInfo.country,
              }, { onConflict: 'api_id' })
              .select()
              .single();

            if (homeError) {
              console.error(`Error upserting home team:`, homeError);
              continue;
            }

            // Upsert away team
            const { data: awayTeam, error: awayError } = await supabase
              .from('times')
              .upsert({
                api_id: fixture.teams.away.id,
                nome: fixture.teams.away.name,
                escudo_url: fixture.teams.away.logo,
                pais: leagueInfo.country,
              }, { onConflict: 'api_id' })
              .select()
              .single();

            if (awayError) {
              console.error(`Error upserting away team:`, awayError);
              continue;
            }

            stats.teamsUpserted += 2;

            // Parse date and time
            const matchDate = new Date(fixture.fixture.date);
            const dateStr = matchDate.toISOString().split('T')[0];
            const timeStr = matchDate.toISOString().split('T')[1].substring(0, 8);

            // Upsert match
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
              }, { onConflict: 'api_id' })
              .select();

            if (matchError) {
              console.error(`Error upserting match:`, matchError);
            } else {
              stats.matchesUpserted++;
            }
          } catch (fixtureError) {
            console.error(`Error processing fixture ${fixture.fixture.id}:`, fixtureError);
          }
        }

        stats.leaguesSynced++;
        
        // Rate limit: wait between league requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (leagueError) {
        const errorMsg = leagueError instanceof Error ? leagueError.message : 'Unknown error';
        console.error(`Error syncing league ${leagueId}:`, errorMsg);
        stats.errors.push(`League ${leagueId}: ${errorMsg}`);
      }
    }

    console.log('Sync complete:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        ...stats,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error syncing API-Football data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
