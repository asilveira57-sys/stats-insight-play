import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

// Leagues to sync from API-Football
const API_FOOTBALL_LEAGUES: Record<number, { 
  code: string; 
  name: string; 
  country: string;
  tipo?: string;
  estado?: string;
}> = {
  // Série B, Copa, Internacionais
  71: { code: 'BSB', name: 'Campeonato Brasileiro Série B', country: 'Brazil' },
  73: { code: 'CDB', name: 'Copa do Brasil', country: 'Brazil' },
  13: { code: 'CLI', name: 'Copa Libertadores', country: 'South America' },
  11: { code: 'CSA', name: 'Copa Sudamericana', country: 'South America' },
  
  // Estaduais Brasileiros
  475: { code: 'SPA', name: 'Campeonato Paulista', country: 'Brazil', tipo: 'ESTADUAL', estado: 'São Paulo' },
  423: { code: 'RJA', name: 'Campeonato Carioca', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Rio de Janeiro' },
  425: { code: 'MGA', name: 'Campeonato Mineiro', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Minas Gerais' },
  442: { code: 'RSA', name: 'Campeonato Gaúcho', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Rio Grande do Sul' },
  444: { code: 'PRA', name: 'Campeonato Paranaense', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Paraná' },
  422: { code: 'PEA', name: 'Campeonato Pernambucano', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Pernambuco' },
  441: { code: 'CEA', name: 'Campeonato Cearense', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Ceará' },
  440: { code: 'BAA', name: 'Campeonato Baiano', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Bahia' },
  519: { code: 'SCA', name: 'Campeonato Catarinense', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Santa Catarina' },
  428: { code: 'GOA', name: 'Campeonato Goiano', country: 'Brazil', tipo: 'ESTADUAL', estado: 'Goiás' },
  461: { code: 'CNE', name: 'Copa do Nordeste', country: 'Brazil', tipo: 'COPA' },
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

interface ApiFootballEvent {
  time: {
    elapsed: number;
    extra: number | null;
  };
  team: {
    id: number;
    name: string;
  };
  player: {
    id: number;
    name: string;
  };
  assist: {
    id: number | null;
    name: string | null;
  };
  type: string;
  detail: string;
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
    let season = 2024; // Default to 2024 (latest available on free plan)
    let syncGoals = true;
    let seasonFallback = true; // Try older seasons if current fails
    
    try {
      const body = await req.json();
      if (body.leagues && Array.isArray(body.leagues)) {
        leaguesToSync = body.leagues;
      }
      if (body.season) {
        season = body.season;
        seasonFallback = false; // User explicitly chose season
      }
      if (body.syncGoals !== undefined) {
        syncGoals = body.syncGoals;
      }
      if (body.seasonFallback !== undefined) {
        seasonFallback = body.seasonFallback;
      }
    } catch {
      // No body provided, use defaults
    }

    console.log(`Syncing leagues: ${leaguesToSync.join(', ')} for season ${season}, syncGoals: ${syncGoals}`);

    const stats = {
      leaguesSynced: 0,
      teamsUpserted: 0,
      matchesUpserted: 0,
      goalsUpserted: 0,
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
        const leagueInfo = API_FOOTBALL_LEAGUES[leagueId];
        if (!leagueInfo) {
          console.log(`Unknown league ID: ${leagueId}`);
          continue;
        }

        console.log(`Syncing ${leagueInfo.name} (ID: ${leagueId})...`);

        // Get internal league ID - first try by api_id, then by codigo_api
        let internalLeagueId = leagueIdMap.get(leagueId);
        
        if (!internalLeagueId) {
          // Try to find by codigo_api
          const { data: existingByCode } = await supabase
            .from('ligas')
            .select('id')
            .eq('codigo_api', leagueInfo.code)
            .maybeSingle();
          
          if (existingByCode) {
            internalLeagueId = existingByCode.id;
            // Update with api_id and other fields
            await supabase
              .from('ligas')
              .update({
                api_source: 'api-football',
                api_id: leagueId,
                tipo_principal: leagueInfo.tipo || 'NACIONAL',
                estado: leagueInfo.estado || null,
                ativa: true,
              })
              .eq('id', internalLeagueId);
          } else {
            // Create new league
            const { data: newLeague, error: leagueError } = await supabase
              .from('ligas')
              .insert({
                nome: leagueInfo.name,
                codigo_api: leagueInfo.code,
                pais: leagueInfo.country,
                ativa: true,
                api_source: 'api-football',
                api_id: leagueId,
                tipo_principal: leagueInfo.tipo || 'NACIONAL',
                estado: leagueInfo.estado || null,
              })
              .select()
              .single();

            if (leagueError) {
              console.error(`Error creating league ${leagueInfo.name}:`, leagueError);
              stats.errors.push(`League ${leagueInfo.name}: ${leagueError.message}`);
              continue;
            }
            internalLeagueId = newLeague.id;
          }
        } else {
          // Update existing league with tipo_principal and estado
          await supabase
            .from('ligas')
            .update({
              tipo_principal: leagueInfo.tipo || 'NACIONAL',
              estado: leagueInfo.estado || null,
            })
            .eq('id', internalLeagueId);
        }

        // Fetch fixtures for this league with season fallback
        let fixtures: ApiFootballFixture[] = [];
        let usedSeason = season;
        const seasonsToTry = seasonFallback ? [season, 2024, 2023, 2022] : [season];
        
        for (const trySeason of [...new Set(seasonsToTry)]) {
          try {
            const fixturesData = await fetchFromApiFootball(
              `/fixtures?league=${leagueId}&season=${trySeason}`,
              apiKey
            );
            fixtures = fixturesData.response || [];
            usedSeason = trySeason;
            if (fixtures.length > 0) break;
          } catch (seasonErr) {
            console.log(`Season ${trySeason} failed for league ${leagueId}: ${seasonErr}`);
            continue;
          }
        }

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

            const matchStatus = mapApiStatus(fixture.fixture.status.short);

            // Upsert match
            const { data: matchData, error: matchError } = await supabase
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
                status: matchStatus,
                rodada: extractRound(fixture.league.round),
              }, { onConflict: 'api_id' })
              .select()
              .single();

            if (matchError) {
              console.error(`Error upserting match:`, matchError);
            } else {
              stats.matchesUpserted++;
              
              // Sync goals for finished matches
              if (syncGoals && matchStatus === 'finished' && matchData) {
                try {
                  const eventsData = await fetchFromApiFootball(
                    `/fixtures/events?fixture=${fixture.fixture.id}`,
                    apiKey
                  );
                  
                  const events: ApiFootballEvent[] = eventsData.response || [];
                  
                  for (const event of events) {
                    if (event.type === 'Goal') {
                      // Determine which team scored
                      const scoringTeamId = event.team.id === fixture.teams.home.id 
                        ? homeTeam.id 
                        : awayTeam.id;
                      
                      const { error: goalError } = await supabase
                        .from('gols_partida')
                        .upsert({
                          partida_id: matchData.id,
                          time_id: scoringTeamId,
                          jogador_nome: event.player.name || 'Desconhecido',
                          jogador_api_id: event.player.id,
                          minuto: event.time.elapsed,
                          acrescimo: event.time.extra,
                          tipo: event.detail, // 'Normal Goal', 'Penalty', 'Own Goal'
                          assistente_nome: event.assist.name,
                          assistente_api_id: event.assist.id,
                        }, { 
                          onConflict: 'partida_id,jogador_nome,minuto',
                          ignoreDuplicates: true 
                        });
                      
                      if (!goalError) {
                        stats.goalsUpserted++;
                      }
                    }
                  }
                  
                  // Rate limit: small delay between event requests
                  await new Promise(resolve => setTimeout(resolve, 200));
                  
                } catch (eventError) {
                  console.error(`Error fetching events for fixture ${fixture.fixture.id}:`, eventError);
                }
              }
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
