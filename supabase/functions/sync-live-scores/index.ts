import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

interface FootballDataMatch {
  id: number;
  status: string;
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
}

interface ApiFootballFixture {
  fixture: {
    id: number;
    status: { short: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

function mapFootballDataStatus(apiStatus: string): string {
  const statusMap: Record<string, string> = {
    'SCHEDULED': 'scheduled',
    'TIMED': 'scheduled',
    'IN_PLAY': 'live',
    'PAUSED': 'live',
    'HALFTIME': 'live',
    'EXTRA_TIME': 'live',
    'PENALTY_SHOOTOUT': 'live',
    'FINISHED': 'finished',
    'SUSPENDED': 'live',
    'POSTPONED': 'postponed',
    'CANCELLED': 'cancelled',
    'AWARDED': 'finished',
  };
  return statusMap[apiStatus] || 'scheduled';
}

function mapApiFootballStatus(apiStatus: string): string {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const footballDataKey = Deno.env.get('FOOTBALL_DATA_API_KEY');
    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY');
    
    if (!footballDataKey && !apiFootballKey) {
      throw new Error('No API keys configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let updatedCount = 0;

    // ========== FOOTBALL-DATA.ORG (European leagues) ==========
    if (footballDataKey) {
      console.log('Fetching live matches from Football-Data.org...');

      try {
        const response = await fetch(`${FOOTBALL_DATA_BASE_URL}/matches?status=LIVE,IN_PLAY,PAUSED`, {
          headers: { 'X-Auth-Token': footballDataKey },
        });

        if (response.ok) {
          const data = await response.json();
          const liveMatches: FootballDataMatch[] = data.matches || [];
          console.log(`Found ${liveMatches.length} live matches from Football-Data.org`);

          for (const match of liveMatches) {
            const homeScore = match.score.fullTime.home ?? match.score.halfTime.home ?? 0;
            const awayScore = match.score.fullTime.away ?? match.score.halfTime.away ?? 0;
            const status = mapFootballDataStatus(match.status);

            const { data: updated, error } = await supabase
              .from('partidas')
              .update({
                gols_casa: homeScore,
                gols_fora: awayScore,
                status: status,
                updated_at: new Date().toISOString(),
              })
              .eq('api_id', match.id)
              .select();

            if (!error && updated && updated.length > 0) {
              updatedCount++;
              console.log(`Updated FD match ${match.id}: ${homeScore} x ${awayScore} (${status})`);
            }
          }

          // Check for recently finished matches
          const today = new Date().toISOString().split('T')[0];
          const finishedResponse = await fetch(
            `${FOOTBALL_DATA_BASE_URL}/matches?status=FINISHED&dateFrom=${today}&dateTo=${today}`,
            { headers: { 'X-Auth-Token': footballDataKey } }
          );

          if (finishedResponse.ok) {
            const finishedData = await finishedResponse.json();
            const finishedMatches: FootballDataMatch[] = finishedData.matches || [];

            for (const match of finishedMatches) {
              const homeScore = match.score.fullTime.home ?? 0;
              const awayScore = match.score.fullTime.away ?? 0;

              const { data: updated, error } = await supabase
                .from('partidas')
                .update({
                  gols_casa: homeScore,
                  gols_fora: awayScore,
                  status: 'finished',
                  updated_at: new Date().toISOString(),
                })
                .eq('api_id', match.id)
                .eq('status', 'live')
                .select();

              if (!error && updated && updated.length > 0) {
                updatedCount++;
                console.log(`Match finished FD ${match.id}: ${homeScore} x ${awayScore}`);
              }
            }
          }
        } else {
          console.error('Football-Data API error:', response.status);
        }
      } catch (fdError) {
        console.error('Error fetching from Football-Data.org:', fdError);
      }
    }

    // ========== API-FOOTBALL (Brazilian cups, Libertadores, etc.) ==========
    if (apiFootballKey) {
      console.log('Fetching live matches from API-Football...');

      try {
        const response = await fetch(`${API_FOOTBALL_BASE_URL}/fixtures?live=all`, {
          headers: { 'x-apisports-key': apiFootballKey },
        });

        if (response.ok) {
          const data = await response.json();
          const liveFixtures: ApiFootballFixture[] = data.response || [];
          console.log(`Found ${liveFixtures.length} live matches from API-Football`);

          for (const fixture of liveFixtures) {
            const homeScore = fixture.goals.home ?? 0;
            const awayScore = fixture.goals.away ?? 0;
            const status = mapApiFootballStatus(fixture.fixture.status.short);

            const { data: updated, error } = await supabase
              .from('partidas')
              .update({
                gols_casa: homeScore,
                gols_fora: awayScore,
                status: status,
                updated_at: new Date().toISOString(),
              })
              .eq('api_id', fixture.fixture.id)
              .select();

            if (!error && updated && updated.length > 0) {
              updatedCount++;
              console.log(`Updated AF match ${fixture.fixture.id}: ${homeScore} x ${awayScore} (${status})`);
            }
          }
        } else {
          console.error('API-Football error:', response.status);
        }
      } catch (afError) {
        console.error('Error fetching from API-Football:', afError);
      }
    }

    console.log(`Sync complete. Updated ${updatedCount} matches.`);

    return new Response(
      JSON.stringify({
        success: true,
        matchesUpdated: updatedCount,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error syncing live scores:', error);
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
