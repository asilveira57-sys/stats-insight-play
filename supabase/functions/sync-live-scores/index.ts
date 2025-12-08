import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

// Competition IDs we track
const TRACKED_COMPETITIONS = ['BSA', 'BSB', 'PL', 'PD', 'SA', 'BL1', 'FL1', 'CL'];

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

function mapApiStatus(apiStatus: string): string {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FOOTBALL_DATA_API_KEY');
    if (!apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching live matches from Football-Data.org...');

    // Fetch all live matches across all competitions
    const response = await fetch(`${FOOTBALL_DATA_BASE_URL}/matches?status=LIVE,IN_PLAY,PAUSED,HALFTIME`, {
      headers: {
        'X-Auth-Token': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Football-Data API error:', response.status, errorText);
      throw new Error(`Football-Data API error: ${response.status}`);
    }

    const data = await response.json();
    const liveMatches: FootballDataMatch[] = data.matches || [];

    console.log(`Found ${liveMatches.length} live matches`);

    let updatedCount = 0;

    for (const match of liveMatches) {
      // Get current score (use fullTime or halfTime depending on availability)
      const homeScore = match.score.fullTime.home ?? match.score.halfTime.home ?? 0;
      const awayScore = match.score.fullTime.away ?? match.score.halfTime.away ?? 0;
      const status = mapApiStatus(match.status);

      // Update match in database by api_id
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

      if (error) {
        console.error(`Error updating match ${match.id}:`, error);
      } else if (updated && updated.length > 0) {
        updatedCount++;
        console.log(`Updated match ${match.id}: ${match.homeTeam.name} ${homeScore} x ${awayScore} ${match.awayTeam.name} (${status})`);
      }
    }

    // Also check for matches that just finished (status changed from live to finished)
    const finishedResponse = await fetch(`${FOOTBALL_DATA_BASE_URL}/matches?status=FINISHED&dateFrom=${new Date().toISOString().split('T')[0]}&dateTo=${new Date().toISOString().split('T')[0]}`, {
      headers: {
        'X-Auth-Token': apiKey,
      },
    });

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
          .eq('status', 'live') // Only update if was live
          .select();

        if (!error && updated && updated.length > 0) {
          updatedCount++;
          console.log(`Match finished ${match.id}: ${match.homeTeam.name} ${homeScore} x ${awayScore} ${match.awayTeam.name}`);
        }
      }
    }

    console.log(`Sync complete. Updated ${updatedCount} matches.`);

    return new Response(
      JSON.stringify({
        success: true,
        liveMatchesFound: liveMatches.length,
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
