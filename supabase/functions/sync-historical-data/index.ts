import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

// Competitions to sync (free tier available)
const COMPETITIONS_TO_SYNC = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'BSA', 'CL'];

interface FootballDataTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
  competition: {
    id: number;
    name: string;
    code: string;
    emblem: string;
  };
  area: {
    name: string;
  };
}

async function fetchFromFootballData(endpoint: string, apiKey: string) {
  const url = `${FOOTBALL_DATA_BASE_URL}${endpoint}`;
  console.log(`Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`API Error: ${response.status} - ${error}`);
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

function mapApiStatus(apiStatus: string): string {
  switch (apiStatus) {
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live';
    case 'FINISHED':
      return 'finished';
    case 'POSTPONED':
      return 'postponed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'scheduled';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FOOTBALL_DATA_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for options
    let startDate = '2025-01-01';
    let competitionsToSync = COMPETITIONS_TO_SYNC;
    
    try {
      const body = await req.json();
      if (body.startDate) startDate = body.startDate;
      if (body.competitions) competitionsToSync = body.competitions;
    } catch {
      // Use defaults if no body
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const stats = {
      teams: { synced: 0, errors: 0 },
      matches: { synced: 0, errors: 0 },
    };

    console.log(`Starting historical sync from ${startDate}...`);

    // Get league IDs from database
    const { data: dbLeagues } = await supabase
      .from('ligas')
      .select('id, api_id, codigo_api')
      .in('codigo_api', competitionsToSync);

    const leagueMap = new Map(dbLeagues?.map(l => [l.api_id, l.id]) || []);

    // Sync matches for each competition
    for (const compCode of competitionsToSync) {
      try {
        console.log(`Syncing historical matches for ${compCode}...`);
        
        // Fetch finished matches from start of year until today
        const today = new Date().toISOString().split('T')[0];
        
        const matchesData = await fetchFromFootballData(
          `/competitions/${compCode}/matches?dateFrom=${startDate}&dateTo=${today}&status=FINISHED`,
          apiKey
        );

        console.log(`Found ${matchesData.matches?.length || 0} finished matches for ${compCode}`);

        for (const match of matchesData.matches as FootballDataMatch[]) {
          try {
            // Upsert home team
            const { data: homeTeam } = await supabase
              .from('times')
              .upsert({
                api_id: match.homeTeam.id,
                nome: match.homeTeam.name,
                escudo_url: match.homeTeam.crest,
                pais: match.area.name,
              }, { onConflict: 'api_id' })
              .select('id')
              .single();

            // Upsert away team
            const { data: awayTeam } = await supabase
              .from('times')
              .upsert({
                api_id: match.awayTeam.id,
                nome: match.awayTeam.name,
                escudo_url: match.awayTeam.crest,
                pais: match.area.name,
              }, { onConflict: 'api_id' })
              .select('id')
              .single();

            if (homeTeam && awayTeam) {
              stats.teams.synced += 2;
            }

            // Get league ID
            const ligaId = leagueMap.get(match.competition.id);

            // Parse date and time
            const matchDate = new Date(match.utcDate);
            const dateStr = matchDate.toISOString().split('T')[0];
            const timeStr = matchDate.toTimeString().split(' ')[0].substring(0, 5);

            // Upsert match
            const { error: matchError } = await supabase
              .from('partidas')
              .upsert({
                api_id: match.id,
                liga_id: ligaId,
                time_casa_id: homeTeam?.id,
                time_fora_id: awayTeam?.id,
                data: dateStr,
                hora: timeStr,
                gols_casa: match.score.fullTime.home,
                gols_fora: match.score.fullTime.away,
                status: mapApiStatus(match.status),
                rodada: match.matchday,
              }, { onConflict: 'api_id' });

            if (matchError) {
              console.error(`Error syncing match ${match.id}:`, matchError);
              stats.matches.errors++;
            } else {
              stats.matches.synced++;
            }
          } catch (e) {
            console.error(`Error processing match ${match.id}:`, e);
            stats.matches.errors++;
          }
        }

        // Add delay to respect rate limits (10 requests/minute for free tier)
        console.log(`Waiting 7 seconds before next competition (rate limit)...`);
        await new Promise(resolve => setTimeout(resolve, 7000));
        
      } catch (e) {
        console.error(`Error syncing competition ${compCode}:`, e);
      }
    }

    console.log('Historical sync completed:', stats);

    return new Response(
      JSON.stringify({ success: true, stats, startDate }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
