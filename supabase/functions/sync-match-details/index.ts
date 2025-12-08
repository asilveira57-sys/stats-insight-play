import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

interface MatchDetails {
  id: number;
  homeTeam: { id: number; name: string; coach?: { id: number; name: string; nationality?: string } };
  awayTeam: { id: number; name: string; coach?: { id: number; name: string; nationality?: string } };
  score: { fullTime: { home: number; away: number } };
  goals?: Array<{
    minute: number;
    injuryTime?: number;
    type: string;
    team: { id: number };
    scorer: { id: number; name: string };
    assist?: { id: number; name: string };
  }>;
  bookings?: Array<{
    minute: number;
    team: { id: number };
    player: { id: number; name: string };
    card: string;
  }>;
  homeTeam_lineup?: Array<{
    id: number;
    name: string;
    position: string;
    shirtNumber: number;
  }>;
  awayTeam_lineup?: Array<{
    id: number;
    name: string;
    position: string;
    shirtNumber: number;
  }>;
  homeTeam_bench?: Array<{
    id: number;
    name: string;
    position: string;
    shirtNumber: number;
  }>;
  awayTeam_bench?: Array<{
    id: number;
    name: string;
    position: string;
    shirtNumber: number;
  }>;
  homeTeam_formation?: string;
  awayTeam_formation?: string;
}

async function fetchMatchDetails(matchApiId: number, apiKey: string): Promise<MatchDetails | null> {
  try {
    const response = await fetch(`${FOOTBALL_DATA_BASE_URL}/matches/${matchApiId}`, {
      headers: {
        'X-Auth-Token': apiKey,
        'X-Unfold-Lineups': 'true',
        'X-Unfold-Bookings': 'true',
        'X-Unfold-Goals': 'true',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch match ${matchApiId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // Transform the nested structure to flat
    return {
      id: data.id,
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      score: data.score,
      goals: data.goals,
      bookings: data.bookings,
      homeTeam_lineup: data.homeTeam?.lineup,
      awayTeam_lineup: data.awayTeam?.lineup,
      homeTeam_bench: data.homeTeam?.bench,
      awayTeam_bench: data.awayTeam?.bench,
      homeTeam_formation: data.homeTeam?.formation,
      awayTeam_formation: data.awayTeam?.formation,
    };
  } catch (error) {
    console.error(`Error fetching match ${matchApiId}:`, error);
    return null;
  }
}

async function processMatchDetails(
  supabase: any,
  partida: any,
  details: MatchDetails
) {
  const { id: partidaId, time_casa_id, time_fora_id } = partida;
  
  // Get team IDs mapping by api_id
  const { data: times } = await supabase
    .from('times')
    .select('id, api_id')
    .in('api_id', [details.homeTeam.id, details.awayTeam.id]);
  
  const teamIdMap: Record<number, string> = {};
  times?.forEach((t: any) => {
    teamIdMap[t.api_id] = t.id;
  });

  // Process goals
  if (details.goals && details.goals.length > 0) {
    // Delete existing goals for this match
    await supabase.from('gols_partida').delete().eq('partida_id', partidaId);
    
    let runningScoreHome = 0;
    let runningScoreAway = 0;
    
    const goalsToInsert = details.goals.map((goal) => {
      const isHomeTeam = goal.team.id === details.homeTeam.id;
      if (isHomeTeam) runningScoreHome++;
      else runningScoreAway++;
      
      return {
        partida_id: partidaId,
        time_id: teamIdMap[goal.team.id] || (isHomeTeam ? time_casa_id : time_fora_id),
        minuto: goal.minute,
        acrescimo: goal.injuryTime || null,
        tipo: goal.type || 'REGULAR',
        jogador_nome: goal.scorer.name,
        jogador_api_id: goal.scorer.id,
        assistente_nome: goal.assist?.name || null,
        assistente_api_id: goal.assist?.id || null,
        placar_casa: runningScoreHome,
        placar_fora: runningScoreAway,
      };
    });
    
    if (goalsToInsert.length > 0) {
      const { error: goalsError } = await supabase.from('gols_partida').insert(goalsToInsert);
      if (goalsError) console.error('Error inserting goals:', goalsError);
      else console.log(`Inserted ${goalsToInsert.length} goals for match ${partidaId}`);
    }
  }

  // Process bookings (cards)
  if (details.bookings && details.bookings.length > 0) {
    // Delete existing cards for this match
    await supabase.from('cartoes_partida').delete().eq('partida_id', partidaId);
    
    const cardsToInsert = details.bookings.map((booking) => ({
      partida_id: partidaId,
      time_id: teamIdMap[booking.team.id] || null,
      minuto: booking.minute,
      jogador_nome: booking.player.name,
      jogador_api_id: booking.player.id,
      tipo: booking.card, // YELLOW_CARD, RED_CARD, YELLOW_RED_CARD
    }));
    
    if (cardsToInsert.length > 0) {
      const { error: cardsError } = await supabase.from('cartoes_partida').insert(cardsToInsert);
      if (cardsError) console.error('Error inserting cards:', cardsError);
      else console.log(`Inserted ${cardsToInsert.length} cards for match ${partidaId}`);
    }
  }

  // Process lineups
  const lineupsToInsert: any[] = [];
  
  // Home team lineup
  if (details.homeTeam_lineup) {
    details.homeTeam_lineup.forEach((player) => {
      lineupsToInsert.push({
        partida_id: partidaId,
        time_id: teamIdMap[details.homeTeam.id] || time_casa_id,
        jogador_nome: player.name,
        jogador_api_id: player.id,
        posicao: player.position,
        numero_camisa: player.shirtNumber,
        titular: true,
        formacao: details.homeTeam_formation || null,
      });
    });
  }
  
  // Home team bench
  if (details.homeTeam_bench) {
    details.homeTeam_bench.forEach((player) => {
      lineupsToInsert.push({
        partida_id: partidaId,
        time_id: teamIdMap[details.homeTeam.id] || time_casa_id,
        jogador_nome: player.name,
        jogador_api_id: player.id,
        posicao: player.position,
        numero_camisa: player.shirtNumber,
        titular: false,
        formacao: details.homeTeam_formation || null,
      });
    });
  }
  
  // Away team lineup
  if (details.awayTeam_lineup) {
    details.awayTeam_lineup.forEach((player) => {
      lineupsToInsert.push({
        partida_id: partidaId,
        time_id: teamIdMap[details.awayTeam.id] || time_fora_id,
        jogador_nome: player.name,
        jogador_api_id: player.id,
        posicao: player.position,
        numero_camisa: player.shirtNumber,
        titular: true,
        formacao: details.awayTeam_formation || null,
      });
    });
  }
  
  // Away team bench
  if (details.awayTeam_bench) {
    details.awayTeam_bench.forEach((player) => {
      lineupsToInsert.push({
        partida_id: partidaId,
        time_id: teamIdMap[details.awayTeam.id] || time_fora_id,
        jogador_nome: player.name,
        jogador_api_id: player.id,
        posicao: player.position,
        numero_camisa: player.shirtNumber,
        titular: false,
        formacao: details.awayTeam_formation || null,
      });
    });
  }

  if (lineupsToInsert.length > 0) {
    // Delete existing lineups for this match
    await supabase.from('escalacoes').delete().eq('partida_id', partidaId);
    
    const { error: lineupsError } = await supabase.from('escalacoes').insert(lineupsToInsert);
    if (lineupsError) console.error('Error inserting lineups:', lineupsError);
    else console.log(`Inserted ${lineupsToInsert.length} lineup entries for match ${partidaId}`);
  }

  // Process coaches
  const coaches = [
    { team: details.homeTeam, timeId: teamIdMap[details.homeTeam.id] || time_casa_id },
    { team: details.awayTeam, timeId: teamIdMap[details.awayTeam.id] || time_fora_id },
  ];

  for (const { team, timeId } of coaches) {
    if (team.coach) {
      // Upsert coach
      const { data: tecnico, error: tecnicoError } = await supabase
        .from('tecnicos')
        .upsert({
          api_id: team.coach.id,
          nome: team.coach.name,
          nacionalidade: team.coach.nationality || null,
        }, { onConflict: 'api_id' })
        .select('id')
        .single();
      
      if (tecnicoError) {
        console.error('Error upserting coach:', tecnicoError);
      } else if (tecnico) {
        // Link coach to match
        await supabase
          .from('tecnico_partida')
          .upsert({
            partida_id: partidaId,
            time_id: timeId,
            tecnico_id: tecnico.id,
          }, { onConflict: 'partida_id,time_id' });
      }
    }
  }

  // Mark match as synced
  await supabase
    .from('partidas')
    .update({ detalhes_sincronizados: true })
    .eq('id', partidaId);
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional parameters
    let limit = 10;
    let specificMatchId: string | null = null;
    
    try {
      const body = await req.json();
      limit = body.limit || 10;
      specificMatchId = body.matchId || null;
    } catch {
      // No body, use defaults
    }

    let query = supabase
      .from('partidas')
      .select('id, api_id, time_casa_id, time_fora_id, data')
      .eq('status', 'finished')
      .eq('detalhes_sincronizados', false)
      .not('api_id', 'is', null)
      .order('data', { ascending: false });
    
    if (specificMatchId) {
      query = supabase
        .from('partidas')
        .select('id, api_id, time_casa_id, time_fora_id, data')
        .eq('id', specificMatchId)
        .not('api_id', 'is', null);
    } else {
      query = query.limit(limit);
    }

    const { data: partidas, error: partidasError } = await query;

    if (partidasError) {
      throw new Error(`Error fetching matches: ${partidasError.message}`);
    }

    if (!partidas || partidas.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No matches to sync',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${partidas.length} matches to sync details`);

    let syncedCount = 0;
    const errors: string[] = [];

    // Process matches with rate limiting (6 seconds between requests)
    for (let i = 0; i < partidas.length; i++) {
      const partida = partidas[i];
      
      console.log(`Processing match ${i + 1}/${partidas.length}: API ID ${partida.api_id}`);
      
      const details = await fetchMatchDetails(partida.api_id, apiKey);
      
      if (details) {
        await processMatchDetails(supabase, partida, details);
        syncedCount++;
        console.log(`Successfully synced match ${partida.id}`);
      } else {
        errors.push(`Failed to fetch details for match ${partida.api_id}`);
      }

      // Rate limiting: wait 6 seconds between requests (10 req/min limit)
      if (i < partidas.length - 1) {
        console.log('Waiting 6 seconds for rate limit...');
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} of ${partidas.length} matches`,
        synced: syncedCount,
        total: partidas.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-match-details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
