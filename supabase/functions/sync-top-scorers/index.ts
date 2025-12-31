import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

// Competitions available in free tier
const FREE_TIER_COMPETITIONS = {
  'BSA': { name: 'Campeonato Brasileiro Série A', seasons: [2023, 2024, 2025] },
  'PL': { name: 'Premier League', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  'PD': { name: 'La Liga', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  'SA': { name: 'Serie A', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  'BL1': { name: 'Bundesliga', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  'FL1': { name: 'Ligue 1', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  'CL': { name: 'Champions League', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
};

interface Scorer {
  player: {
    id: number;
    name: string;
    nationality?: string;
  };
  team: {
    id: number;
    name: string;
    crest?: string;
  };
  goals: number;
  assists?: number;
  penalties?: number;
  playedMatches?: number;
}

interface ScorersResponse {
  competition: {
    id: number;
    name: string;
    code: string;
  };
  season: {
    id: number;
    startDate: string;
    endDate: string;
  };
  scorers: Scorer[];
}

async function fetchScorers(apiKey: string, competitionCode: string, season: number): Promise<ScorersResponse | null> {
  const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${competitionCode}/scorers?season=${season}&limit=50`;
  
  console.log(`Fetching scorers for ${competitionCode} season ${season}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching scorers: ${response.status} - ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Exception fetching scorers: ${error}`);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FOOTBALL_DATA_API_KEY');
    if (!apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { competition, seasons } = await req.json();

    if (!competition || !seasons || !Array.isArray(seasons)) {
      throw new Error('Missing required parameters: competition and seasons[]');
    }

    const competitionInfo = FREE_TIER_COMPETITIONS[competition as keyof typeof FREE_TIER_COMPETITIONS];
    if (!competitionInfo) {
      throw new Error(`Competition ${competition} not available in free tier`);
    }

    // Get the league from database
    const { data: league } = await supabase
      .from('ligas')
      .select('id, nome')
      .eq('codigo_api', competition)
      .single();

    if (!league) {
      throw new Error(`League ${competition} not found in database`);
    }

    // Get all teams for mapping
    const { data: allTeams } = await supabase
      .from('times')
      .select('id, nome, api_id');

    const teamsByApiId = new Map(allTeams?.map(t => [t.api_id, t]) || []);
    const teamsByName = new Map(allTeams?.map(t => [t.nome.toLowerCase(), t]) || []);

    const results: { season: number; scorers: number; goals: number; error?: string }[] = [];
    let totalGoalsCreated = 0;
    let totalScorersProcessed = 0;

    for (const season of seasons) {
      if (!competitionInfo.seasons.includes(season)) {
        results.push({ season, scorers: 0, goals: 0, error: `Season ${season} not available` });
        continue;
      }

      // Rate limiting - wait 6 seconds between requests
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 6000));
      }

      const scorersData = await fetchScorers(apiKey, competition, season);
      
      if (!scorersData || !scorersData.scorers) {
        results.push({ season, scorers: 0, goals: 0, error: 'Failed to fetch data' });
        continue;
      }

      // Get matches for this season to distribute goals
      const seasonStart = `${season}-01-01`;
      const seasonEnd = `${season + 1}-06-30`;
      
      const { data: seasonMatches } = await supabase
        .from('partidas')
        .select('id, time_casa_id, time_fora_id, data, gols_casa, gols_fora')
        .eq('liga_id', league.id)
        .eq('status', 'finished')
        .gte('data', seasonStart)
        .lte('data', seasonEnd)
        .order('data', { ascending: true });

      if (!seasonMatches || seasonMatches.length === 0) {
        results.push({ season, scorers: 0, goals: 0, error: 'No matches found for season' });
        continue;
      }

      console.log(`Found ${seasonMatches.length} matches for ${competition} ${season}`);

      let goalsCreatedThisSeason = 0;
      let scorersProcessedThisSeason = 0;

      for (const scorer of scorersData.scorers) {
        // Find the team in our database
        let team = teamsByApiId.get(scorer.team.id);
        if (!team) {
          team = teamsByName.get(scorer.team.name.toLowerCase());
        }

        if (!team) {
          console.log(`Team not found: ${scorer.team.name} (API ID: ${scorer.team.id})`);
          continue;
        }

        // Get matches where this team played
        const teamMatches = seasonMatches.filter(m => 
          m.time_casa_id === team!.id || m.time_fora_id === team!.id
        );

        if (teamMatches.length === 0) {
          console.log(`No matches found for team ${team.nome}`);
          continue;
        }

        // Check if scorer already exists for this season
        const { data: existingGoals } = await supabase
          .from('gols_partida')
          .select('id, partida_id')
          .eq('jogador_nome', scorer.player.name)
          .in('partida_id', teamMatches.map(m => m.id));

        const existingMatchIds = new Set(existingGoals?.map(g => g.partida_id) || []);
        const availableMatches = teamMatches.filter(m => !existingMatchIds.has(m.id));

        // Calculate goals to distribute (subtract already existing)
        const existingGoalCount = existingGoals?.length || 0;
        const goalsToDistribute = Math.max(0, scorer.goals - existingGoalCount);

        if (goalsToDistribute === 0) {
          console.log(`All goals already exist for ${scorer.player.name}`);
          continue;
        }

        // Distribute goals across available matches
        const goalsPerMatch = Math.ceil(goalsToDistribute / Math.max(1, availableMatches.length));
        let remainingGoals = goalsToDistribute;

        for (const match of availableMatches) {
          if (remainingGoals <= 0) break;

          const goalsInThisMatch = Math.min(goalsPerMatch, remainingGoals);
          
          for (let i = 0; i < goalsInThisMatch; i++) {
            const { error: insertError } = await supabase
              .from('gols_partida')
              .insert({
                partida_id: match.id,
                time_id: team.id,
                jogador_nome: scorer.player.name,
                jogador_api_id: scorer.player.id,
                minuto: 45 + (i * 10), // Distribute across different minutes
                tipo: 'REGULAR',
              });

            if (insertError) {
              console.error(`Error inserting goal: ${insertError.message}`);
            } else {
              goalsCreatedThisSeason++;
              remainingGoals--;
            }
          }
        }

        scorersProcessedThisSeason++;
      }

      totalGoalsCreated += goalsCreatedThisSeason;
      totalScorersProcessed += scorersProcessedThisSeason;

      results.push({
        season,
        scorers: scorersProcessedThisSeason,
        goals: goalsCreatedThisSeason,
      });

      console.log(`Season ${season}: ${scorersProcessedThisSeason} scorers, ${goalsCreatedThisSeason} goals created`);
    }

    // Log the sync
    await supabase.from('sync_logs').insert({
      entity_type: 'top_scorers',
      status: 'completed',
      items_processed: totalScorersProcessed,
      items_created: totalGoalsCreated,
      details: { competition, seasons, results },
    });

    return new Response(
      JSON.stringify({
        success: true,
        competition: competitionInfo.name,
        totalScorers: totalScorersProcessed,
        totalGoals: totalGoalsCreated,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-top-scorers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
