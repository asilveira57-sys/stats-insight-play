import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

// World Cup league ID in API-Football
const WORLD_CUP_LEAGUE_ID = 1; // FIFA World Cup

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
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    fulltime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
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
  
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error('API-Football returned errors:', data.errors);
    throw new Error(`API-Football errors: ${JSON.stringify(data.errors)}`);
  }

  console.log(`API response - results: ${data.results}, remaining requests: ${data.response?.length || 0}`);
  return data;
}

// Normalize team name for matching
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '') // Remove special chars
    .trim();
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
    let season = 2022;
    try {
      const body = await req.json();
      if (body.season) {
        season = body.season;
      }
    } catch {
      // No body provided, use default
    }

    console.log(`Fetching World Cup ${season} scores from API-Football...`);

    const stats = {
      matchesFound: 0,
      matchesUpdated: 0,
      matchesNotFound: 0,
      errors: [] as string[],
    };

    // Fetch World Cup fixtures from API-Football
    const fixturesData = await fetchFromApiFootball(
      `/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${season}`,
      apiKey
    );

    const fixtures: ApiFootballFixture[] = fixturesData.response || [];
    console.log(`Found ${fixtures.length} World Cup ${season} fixtures from API-Football`);
    stats.matchesFound = fixtures.length;

    // Get existing World Cup matches from database
    const { data: existingMatches, error: matchError } = await supabase
      .from('partidas')
      .select(`
        id,
        data,
        hora,
        gols_casa,
        gols_fora,
        status,
        time_casa_id,
        time_fora_id,
        liga:ligas!inner(id, nome)
      `)
      .ilike('liga.nome', '%World Cup%');

    if (matchError) {
      console.error('Error fetching existing matches:', matchError);
      throw matchError;
    }

    console.log(`Found ${existingMatches?.length || 0} World Cup matches in database`);

    // Get all teams for matching
    const { data: allTeams } = await supabase
      .from('times')
      .select('id, nome');

    const teamsByNormalizedName = new Map<string, { id: string; nome: string }>();
    allTeams?.forEach(team => {
      const normalized = normalizeTeamName(team.nome);
      teamsByNormalizedName.set(normalized, team);
      
      // Also add variations
      const variations = [
        normalized,
        normalized.replace('ue', 'u'), // Suecia -> Suecia
        normalized.replace('ae', 'a'),
      ];
      variations.forEach(v => {
        if (!teamsByNormalizedName.has(v)) {
          teamsByNormalizedName.set(v, team);
        }
      });
    });

    // Build match lookup by date + team names
    const matchLookup = new Map<string, any>();
    existingMatches?.forEach(match => {
      const homeTeam = allTeams?.find(t => t.id === match.time_casa_id);
      const awayTeam = allTeams?.find(t => t.id === match.time_fora_id);
      if (homeTeam && awayTeam) {
        const key = `${match.data}-${normalizeTeamName(homeTeam.nome)}-${normalizeTeamName(awayTeam.nome)}`;
        matchLookup.set(key, { ...match, homeTeamName: homeTeam.nome, awayTeamName: awayTeam.nome });
      }
    });

    console.log(`Built lookup with ${matchLookup.size} matches`);

    // Process each API-Football fixture
    for (const fixture of fixtures) {
      try {
        const apiDate = fixture.fixture.date.split('T')[0];
        const homeNormalized = normalizeTeamName(fixture.teams.home.name);
        const awayNormalized = normalizeTeamName(fixture.teams.away.name);
        const lookupKey = `${apiDate}-${homeNormalized}-${awayNormalized}`;

        console.log(`Looking for: ${lookupKey} (${fixture.teams.home.name} vs ${fixture.teams.away.name})`);

        let dbMatch = matchLookup.get(lookupKey);

        // Try alternative date (timezone differences)
        if (!dbMatch) {
          const dateObj = new Date(fixture.fixture.date);
          dateObj.setDate(dateObj.getDate() - 1);
          const altDate = dateObj.toISOString().split('T')[0];
          const altKey = `${altDate}-${homeNormalized}-${awayNormalized}`;
          dbMatch = matchLookup.get(altKey);
        }

        if (!dbMatch) {
          // Try matching by teams only (ignoring date)
          for (const [key, match] of matchLookup.entries()) {
            if (key.includes(homeNormalized) && key.includes(awayNormalized)) {
              dbMatch = match;
              console.log(`Found match by team names: ${key}`);
              break;
            }
          }
        }

        if (dbMatch) {
          const goalsHome = fixture.score.fulltime.home ?? fixture.goals.home;
          const goalsAway = fixture.score.fulltime.away ?? fixture.goals.away;

          // Only update if we have scores and they're different
          if (goalsHome !== null && goalsAway !== null) {
            if (dbMatch.gols_casa !== goalsHome || dbMatch.gols_fora !== goalsAway || dbMatch.status !== 'finished') {
              console.log(`Updating ${dbMatch.homeTeamName} ${goalsHome} - ${goalsAway} ${dbMatch.awayTeamName}`);
              
              const { error: updateError } = await supabase
                .from('partidas')
                .update({
                  gols_casa: goalsHome,
                  gols_fora: goalsAway,
                  status: 'finished',
                })
                .eq('id', dbMatch.id);

              if (updateError) {
                console.error(`Error updating match ${dbMatch.id}:`, updateError);
                stats.errors.push(`Update ${dbMatch.homeTeamName} vs ${dbMatch.awayTeamName}: ${updateError.message}`);
              } else {
                stats.matchesUpdated++;
                console.log(`✓ Updated: ${dbMatch.homeTeamName} ${goalsHome} - ${goalsAway} ${dbMatch.awayTeamName}`);
              }
            } else {
              console.log(`Already up to date: ${dbMatch.homeTeamName} vs ${dbMatch.awayTeamName}`);
            }
          }
        } else {
          console.log(`No match found for: ${fixture.teams.home.name} vs ${fixture.teams.away.name} on ${apiDate}`);
          stats.matchesNotFound++;
        }
      } catch (fixtureError) {
        console.error(`Error processing fixture:`, fixtureError);
        stats.errors.push(`Fixture error: ${fixtureError}`);
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
    console.error('Error syncing World Cup scores:', error);
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
