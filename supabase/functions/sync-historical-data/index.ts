import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

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
    throw new Error(`API Error: ${response.status} - ${error}`);
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
    let competition = 'BSA'; // Default: Brasileirão Série A
    let seasons: number[] = [2024, 2023, 2022, 2021, 2020]; // Default: 5 years
    
    try {
      const body = await req.json();
      if (body.competition) competition = body.competition;
      if (body.seasons) seasons = body.seasons;
    } catch {
      // Use defaults if no body
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const stats = {
      teams: { synced: 0, errors: 0 },
      matches: { synced: 0, errors: 0 },
      seasons: [] as { season: number; matches: number; status: string }[],
    };

    console.log(`Starting historical sync for ${competition}, seasons: ${seasons.join(', ')}...`);

    // Create sync log
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        entity_type: `historical-${competition}`,
        status: 'running',
        started_at: new Date().toISOString(),
        details: { competition, seasons },
      })
      .select('id')
      .single();

    // Ensure league exists in database
    const competitionData = await fetchFromFootballData(`/competitions/${competition}`, apiKey);
    
    if (!competitionData || !competitionData.id) {
      throw new Error(`Competition ${competition} not found`);
    }
    
    const { data: league, error: leagueError } = await supabase
      .from('ligas')
      .upsert({
        api_id: competitionData.id,
        nome: competitionData.name,
        codigo_api: competitionData.code,
        logo_url: competitionData.emblem,
        pais: competitionData.area?.name,
        api_source: 'football-data',
        ativa: true,
      }, { onConflict: 'api_id' })
      .select('id')
      .single();

    if (leagueError) {
      console.error('Error creating league:', leagueError);
    }

    const ligaId = league?.id;
    console.log(`League ${competition} ID: ${ligaId}`);

    // Wait to respect rate limit
    await new Promise(resolve => setTimeout(resolve, 6500));

    // Sync each season
    for (const season of seasons) {
      try {
        console.log(`\n=== Syncing ${competition} season ${season} ===`);
        
        // Fetch all matches for the season
        const matchesData = await fetchFromFootballData(
          `/competitions/${competition}/matches?season=${season}`,
          apiKey
        );

        const matches = matchesData.matches as FootballDataMatch[];
        console.log(`Found ${matches.length} matches for season ${season}`);

        let seasonMatches = 0;

        for (const match of matches) {
          try {
            // Upsert home team
            const { data: homeTeam, error: homeError } = await supabase
              .from('times')
              .upsert({
                api_id: match.homeTeam.id,
                nome: match.homeTeam.name,
                escudo_url: match.homeTeam.crest,
                pais: match.area.name,
              }, { onConflict: 'api_id' })
              .select('id')
              .single();

            if (homeError) {
              console.error(`Error upserting home team ${match.homeTeam.name}:`, homeError);
            }

            // Upsert away team
            const { data: awayTeam, error: awayError } = await supabase
              .from('times')
              .upsert({
                api_id: match.awayTeam.id,
                nome: match.awayTeam.name,
                escudo_url: match.awayTeam.crest,
                pais: match.area.name,
              }, { onConflict: 'api_id' })
              .select('id')
              .single();

            if (awayError) {
              console.error(`Error upserting away team ${match.awayTeam.name}:`, awayError);
            }

            if (homeTeam && awayTeam) {
              stats.teams.synced += 2;
            }

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
              seasonMatches++;
            }
          } catch (e: unknown) {
            console.error(`Error processing match ${match.id}:`, e);
            stats.matches.errors++;
          }
        }

        stats.seasons.push({ season, matches: seasonMatches, status: 'completed' });
        console.log(`Season ${season} completed: ${seasonMatches} matches synced`);

        // Wait to respect rate limit (10 requests/minute for free tier)
        console.log(`Waiting 7 seconds before next season (rate limit)...`);
        await new Promise(resolve => setTimeout(resolve, 7000));
        
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error(`Error syncing season ${season}:`, errorMessage);
        stats.seasons.push({ season, matches: 0, status: `error: ${errorMessage}` });
        
        // Wait longer on error (might be rate limited)
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    // Update sync log
    if (syncLog?.id) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          items_processed: stats.matches.synced + stats.matches.errors,
          items_created: stats.matches.synced,
          items_failed: stats.matches.errors,
          details: { competition, seasons: stats.seasons },
        })
        .eq('id', syncLog.id);
    }

    console.log('\n=== Historical sync completed ===');
    console.log('Stats:', JSON.stringify(stats, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        competition,
        stats,
        message: `Sincronizados ${stats.matches.synced} jogos de ${stats.seasons.length} temporadas do ${competition}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
