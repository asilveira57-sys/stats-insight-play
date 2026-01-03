import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

// All competitions with their seasons and types
const COMPETITIONS_CONFIG: Record<string, { 
  name: string; 
  type: 'league' | 'cup' | 'international';
  seasons: number[];
}> = {
  // Ligas Nacionais
  'BSA': { name: 'Campeonato Brasileiro Série A', type: 'league', seasons: [2023, 2024, 2025] },
  'PL': { name: 'Premier League', type: 'league', seasons: [2021, 2022, 2023, 2024, 2025] },
  'PD': { name: 'La Liga', type: 'league', seasons: [2021, 2022, 2023, 2024, 2025] },
  'SA': { name: 'Serie A', type: 'league', seasons: [2021, 2022, 2023, 2024, 2025] },
  'BL1': { name: 'Bundesliga', type: 'league', seasons: [2021, 2022, 2023, 2024, 2025] },
  'FL1': { name: 'Ligue 1', type: 'league', seasons: [2021, 2022, 2023, 2024, 2025] },
  // Copas Internacionais
  'CL': { name: 'UEFA Champions League', type: 'cup', seasons: [2021, 2022, 2023, 2024, 2025] },
  'EC': { name: 'European Championship', type: 'international', seasons: [2024] },
  'WC': { name: 'FIFA World Cup', type: 'international', seasons: [2022] },
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

interface SyncState {
  lastCompetitionIndex: number;
  lastSeasonIndex: number;
  lastScorerIndex: number;
  processedScorers: number;
  createdGoals: number;
}

// Fetch scorers with retry logic (up to 5 retries)
async function fetchScorersWithRetry(
  apiKey: string, 
  competitionCode: string, 
  season: number, 
  maxRetries: number = 5
): Promise<ScorersResponse | null> {
  const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${competitionCode}/scorers?season=${season}&limit=50`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Attempt ${attempt}/${maxRetries}] Fetching scorers for ${competitionCode} season ${season}`);
    
    try {
      const response = await fetch(url, {
        headers: { 'X-Auth-Token': apiKey },
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        const waitTime = attempt * 10000; // 10s, 20s, 30s...
        console.log(`Rate limited, waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (response.status === 403) {
        console.error(`Access denied for ${competitionCode} season ${season} (not in free tier)`);
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error ${response.status}: ${errorText}`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
          continue;
        }
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Exception on attempt ${attempt}: ${error}`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
        continue;
      }
      return null;
    }
  }
  
  return null;
}

// Get or update sync state from configuracoes table
async function getSyncState(supabase: any): Promise<SyncState> {
  const { data } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'sync_scorers_state')
    .single();
  
  if (data?.valor) {
    try {
      return JSON.parse(data.valor);
    } catch {
      // Invalid state, reset
    }
  }
  
  return {
    lastCompetitionIndex: 0,
    lastSeasonIndex: 0,
    lastScorerIndex: 0,
    processedScorers: 0,
    createdGoals: 0,
  };
}

async function saveSyncState(supabase: any, state: SyncState): Promise<void> {
  await supabase
    .from('configuracoes')
    .upsert({
      chave: 'sync_scorers_state',
      valor: JSON.stringify(state),
      descricao: 'Estado da sincronização automática de artilheiros',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'chave' });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 270000; // 4.5 minutes max (leave buffer for cleanup)
  const MAX_SCORERS_PER_RUN = 50;
  const API_DELAY = 6500; // 6.5 seconds between API calls (safe for rate limit)

  try {
    const apiKey = Deno.env.get('FOOTBALL_DATA_API_KEY');
    if (!apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current state
    let state = await getSyncState(supabase);
    const competitions = Object.entries(COMPETITIONS_CONFIG);
    
    // Get all teams for mapping
    const { data: allTeams } = await supabase
      .from('times')
      .select('id, nome, api_id');

    const teamsByApiId = new Map(allTeams?.map((t: any) => [t.api_id, t]) || []);
    const teamsByName = new Map(allTeams?.map((t: any) => [t.nome.toLowerCase(), t]) || []);

    // Get all leagues for mapping
    const { data: allLeagues } = await supabase
      .from('ligas')
      .select('id, nome, codigo_api');

    const leaguesByCode = new Map(allLeagues?.map((l: any) => [l.codigo_api, l]) || []);

    let scorersProcessedThisRun = 0;
    let goalsCreatedThisRun = 0;
    let apiCallsMade = 0;
    const results: Array<{ competition: string; season: number; scorers: number; goals: number; status: string }> = [];

    // Process competitions starting from saved state
    competitionLoop:
    for (let compIdx = state.lastCompetitionIndex; compIdx < competitions.length; compIdx++) {
      const [code, config] = competitions[compIdx];
      
      // Check if league exists in database
      let league = leaguesByCode.get(code);
      if (!league) {
        console.log(`League ${code} not found in database, skipping...`);
        state.lastCompetitionIndex = compIdx + 1;
        state.lastSeasonIndex = 0;
        state.lastScorerIndex = 0;
        continue;
      }

      const startSeasonIdx = compIdx === state.lastCompetitionIndex ? state.lastSeasonIndex : 0;

      for (let seasonIdx = startSeasonIdx; seasonIdx < config.seasons.length; seasonIdx++) {
        const season = config.seasons[seasonIdx];
        
        // Check time and scorer limits
        if (Date.now() - startTime > MAX_EXECUTION_TIME || scorersProcessedThisRun >= MAX_SCORERS_PER_RUN) {
          // Save state and exit
          state.lastCompetitionIndex = compIdx;
          state.lastSeasonIndex = seasonIdx;
          await saveSyncState(supabase, state);
          break competitionLoop;
        }

        // Rate limiting delay between API calls
        if (apiCallsMade > 0) {
          console.log(`Waiting ${API_DELAY/1000}s before next API call...`);
          await new Promise(resolve => setTimeout(resolve, API_DELAY));
        }

        // Fetch scorers with retry
        const scorersData = await fetchScorersWithRetry(apiKey, code, season, 5);
        apiCallsMade++;

        if (!scorersData || !scorersData.scorers || scorersData.scorers.length === 0) {
          console.log(`No scorers data for ${code} ${season}`);
          results.push({ competition: code, season, scorers: 0, goals: 0, status: 'no_data' });
          continue;
        }

        console.log(`Got ${scorersData.scorers.length} scorers for ${config.name} ${season}`);

        // Get season matches
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
          console.log(`No finished matches for ${code} ${season}`);
          results.push({ competition: code, season, scorers: 0, goals: 0, status: 'no_matches' });
          continue;
        }

        let scorersThisSeason = 0;
        let goalsThisSeason = 0;

        // Process scorers starting from saved index
        const startScorerIdx = (compIdx === state.lastCompetitionIndex && seasonIdx === state.lastSeasonIndex) 
          ? state.lastScorerIndex 
          : 0;

        for (let scorerIdx = startScorerIdx; scorerIdx < scorersData.scorers.length; scorerIdx++) {
          // Check limits
          if (scorersProcessedThisRun >= MAX_SCORERS_PER_RUN || Date.now() - startTime > MAX_EXECUTION_TIME) {
            state.lastCompetitionIndex = compIdx;
            state.lastSeasonIndex = seasonIdx;
            state.lastScorerIndex = scorerIdx;
            await saveSyncState(supabase, state);
            break competitionLoop;
          }

          const scorer = scorersData.scorers[scorerIdx];

          // Find team
          let team = teamsByApiId.get(scorer.team.id);
          if (!team) {
            team = teamsByName.get(scorer.team.name.toLowerCase());
          }

          if (!team) {
            console.log(`Team not found: ${scorer.team.name}`);
            scorersProcessedThisRun++;
            continue;
          }

          // Get team matches
          const teamMatches = seasonMatches.filter((m: any) => 
            m.time_casa_id === team!.id || m.time_fora_id === team!.id
          );

          if (teamMatches.length === 0) {
            scorersProcessedThisRun++;
            continue;
          }

          // Check existing goals for this player
          const { data: existingGoals } = await supabase
            .from('gols_partida')
            .select('id, partida_id')
            .eq('jogador_nome', scorer.player.name)
            .in('partida_id', teamMatches.map((m: any) => m.id));

          const existingMatchIds = new Set(existingGoals?.map((g: any) => g.partida_id) || []);
          const availableMatches = teamMatches.filter((m: any) => !existingMatchIds.has(m.id));

          const existingGoalCount = existingGoals?.length || 0;
          const goalsToDistribute = Math.max(0, scorer.goals - existingGoalCount);

          if (goalsToDistribute === 0) {
            scorersProcessedThisRun++;
            scorersThisSeason++;
            continue;
          }

          // Distribute goals
          const goalsPerMatch = Math.ceil(goalsToDistribute / Math.max(1, availableMatches.length));
          let remainingGoals = goalsToDistribute;

          for (const match of availableMatches) {
            if (remainingGoals <= 0) break;

            const goalsInMatch = Math.min(goalsPerMatch, remainingGoals);
            
            for (let i = 0; i < goalsInMatch; i++) {
              const { error } = await supabase
                .from('gols_partida')
                .insert({
                  partida_id: match.id,
                  time_id: team.id,
                  jogador_nome: scorer.player.name,
                  jogador_api_id: scorer.player.id,
                  minuto: 15 + (i * 15), // Spread across match
                  tipo: 'REGULAR',
                });

              if (!error) {
                goalsThisSeason++;
                goalsCreatedThisRun++;
                remainingGoals--;
              }
            }
          }

          scorersProcessedThisRun++;
          scorersThisSeason++;
        }

        results.push({ 
          competition: code, 
          season, 
          scorers: scorersThisSeason, 
          goals: goalsThisSeason, 
          status: 'completed' 
        });

        // Reset scorer index after completing a season
        state.lastScorerIndex = 0;
      }

      // Reset season index after completing a competition
      state.lastSeasonIndex = 0;
    }

    // Check if we completed all competitions (loop finished naturally)
    const lastCompIdx = state.lastCompetitionIndex;
    if (lastCompIdx >= competitions.length - 1) {
      // Reset state for next full cycle
      state = {
        lastCompetitionIndex: 0,
        lastSeasonIndex: 0,
        lastScorerIndex: 0,
        processedScorers: 0,
        createdGoals: 0,
      };
    }
    
    // Update total counts in state
    state.processedScorers += scorersProcessedThisRun;
    state.createdGoals += goalsCreatedThisRun;
    
    await saveSyncState(supabase, state);

    // Log sync results
    await supabase.from('sync_logs').insert({
      entity_type: 'scorers_auto',
      status: 'completed',
      items_processed: scorersProcessedThisRun,
      items_created: goalsCreatedThisRun,
      details: {
        apiCalls: apiCallsMade,
        executionTimeMs: Date.now() - startTime,
        results,
        nextState: state,
      },
    });

    console.log(`Sync completed: ${scorersProcessedThisRun} scorers, ${goalsCreatedThisRun} goals, ${apiCallsMade} API calls`);

    return new Response(
      JSON.stringify({
        success: true,
        scorersProcessed: scorersProcessedThisRun,
        goalsCreated: goalsCreatedThisRun,
        apiCalls: apiCallsMade,
        executionTimeMs: Date.now() - startTime,
        results,
        nextState: state,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-scorers-auto:', error);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('sync_logs').insert({
        entity_type: 'scorers_auto',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        details: { executionTimeMs: Date.now() - startTime },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
