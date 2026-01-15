import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

// Top 5 European leagues + Champions League + Brazilian leagues (API-Football IDs)
const SUPPORTED_LEAGUES_API_FOOTBALL = {
  39: { code: 'PL', name: 'Premier League' },
  140: { code: 'PD', name: 'La Liga' },
  135: { code: 'SA', name: 'Serie A' },
  78: { code: 'BL1', name: 'Bundesliga' },
  61: { code: 'FL1', name: 'Ligue 1' },
  2: { code: 'CL', name: 'Champions League' },
  71: { code: 'BSA', name: 'Brasileirão Série A' },
  72: { code: 'BSB', name: 'Brasileirão Série B' },
  73: { code: 'CDB', name: 'Copa do Brasil' },
  13: { code: 'CLI', name: 'Copa Libertadores' },
  11: { code: 'CSA', name: 'Copa Sudamericana' },
};

// Football-Data.org to API-Football league ID mapping
const FOOTBALL_DATA_TO_API_FOOTBALL: Record<string, number> = {
  'PL': 39,
  'PD': 140,
  'SA': 135,
  'BL1': 78,
  'FL1': 61,
  'CL': 2,
  'BSA': 71,
  'BSB': 72,
  'CDB': 73,
  'CLI': 13,
  'CSA': 11,
};

interface LineupPlayer {
  player: {
    id: number;
    name: string;
    number: number;
    pos: string;
  };
}

interface MatchEvent {
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

interface MatchLineup {
  team: {
    id: number;
    name: string;
  };
  formation: string;
  startXI: { player: LineupPlayer['player'] }[];
  substitutes: { player: LineupPlayer['player'] }[];
  coach: {
    id: number;
    name: string;
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
    throw new Error(`API-Football error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error('API-Football returned errors:', data.errors);
    throw new Error(`API-Football errors: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

async function findApiFootballFixtureId(
  supabase: any,
  partida: any,
  apiKey: string
): Promise<number | null> {
  // First try to find by team names and date
  const { data: timeCasa } = await supabase
    .from('times')
    .select('nome, api_id')
    .eq('id', partida.time_casa_id)
    .single();

  const { data: timeFora } = await supabase
    .from('times')
    .select('nome, api_id')
    .eq('id', partida.time_fora_id)
    .single();

  const { data: liga } = await supabase
    .from('ligas')
    .select('codigo_api')
    .eq('id', partida.liga_id)
    .single();

  if (!liga?.codigo_api) return null;

  const apiFootballLeagueId = FOOTBALL_DATA_TO_API_FOOTBALL[liga.codigo_api];
  if (!apiFootballLeagueId) {
    console.log(`No API-Football mapping for league ${liga.codigo_api}`);
    return null;
  }

  // Try to find the fixture
  const season = new Date(partida.data).getFullYear();
  const dateStr = partida.data;

  try {
    const data = await fetchFromApiFootball(
      `/fixtures?league=${apiFootballLeagueId}&season=${season}&date=${dateStr}`,
      apiKey
    );

    const fixtures = data.response || [];
    
    // Find matching fixture by team names (normalized)
    for (const fixture of fixtures) {
      const homeNameNorm = fixture.teams.home.name.toLowerCase().replace(/[^a-z]/g, '');
      const awayNameNorm = fixture.teams.away.name.toLowerCase().replace(/[^a-z]/g, '');
      const casaNorm = timeCasa?.nome.toLowerCase().replace(/[^a-z]/g, '') || '';
      const foraNorm = timeFora?.nome.toLowerCase().replace(/[^a-z]/g, '') || '';

      // Check if names match (with some flexibility)
      const homeMatch = homeNameNorm.includes(casaNorm) || casaNorm.includes(homeNameNorm);
      const awayMatch = awayNameNorm.includes(foraNorm) || foraNorm.includes(awayNameNorm);

      if (homeMatch && awayMatch) {
        console.log(`Found API-Football fixture ${fixture.fixture.id} for match`);
        return fixture.fixture.id;
      }
    }

    console.log(`No matching fixture found for ${timeCasa?.nome} vs ${timeFora?.nome} on ${dateStr}`);
    return null;
  } catch (error) {
    console.error('Error finding fixture:', error);
    return null;
  }
}

async function processMatchDetails(
  supabase: any,
  partida: any,
  fixtureId: number,
  apiKey: string
): Promise<{ success: boolean; goalsCount: number; lineupsCount: number; cardsCount: number }> {
  let goalsCount = 0;
  let lineupsCount = 0;
  let cardsCount = 0;

  try {
    // Fetch fixture details (events, lineups, statistics)
    const [eventsData, lineupsData] = await Promise.all([
      fetchFromApiFootball(`/fixtures/events?fixture=${fixtureId}`, apiKey),
      fetchFromApiFootball(`/fixtures/lineups?fixture=${fixtureId}`, apiKey),
    ]);

    const events: MatchEvent[] = eventsData.response || [];
    const lineups: MatchLineup[] = lineupsData.response || [];

    // Get team ID mapping
    const { data: times } = await supabase
      .from('times')
      .select('id, api_id, nome')
      .in('id', [partida.time_casa_id, partida.time_fora_id]);

    const timeMap = new Map<string, string>();
    times?.forEach((time: any) => {
      timeMap.set(time.nome.toLowerCase(), time.id);
    });

    // Process goals
    const goals = events.filter(e => e.type === 'Goal');
    if (goals.length > 0) {
      // Delete existing goals for this match (from this source)
      await supabase.from('gols_partida').delete().eq('partida_id', partida.id);

      const goalsToInsert = goals.map((goal, idx) => {
        // Find team ID by matching team name
        let timeId = null;
        for (const [nome, id] of timeMap) {
          if (goal.team.name.toLowerCase().includes(nome) || nome.includes(goal.team.name.toLowerCase())) {
            timeId = id;
            break;
          }
        }

        return {
          partida_id: partida.id,
          time_id: timeId,
          minuto: goal.time.elapsed,
          acrescimo: goal.time.extra,
          tipo: goal.detail === 'Own Goal' ? 'OG' : (goal.detail === 'Penalty' ? 'PEN' : 'Normal'),
          jogador_nome: goal.player.name,
          jogador_api_id: goal.player.id,
          assistente_nome: goal.assist.name,
          assistente_api_id: goal.assist.id,
        };
      });

      const { error: goalsError } = await supabase.from('gols_partida').insert(goalsToInsert);
      if (goalsError) {
        console.error('Error inserting goals:', goalsError);
      } else {
        goalsCount = goalsToInsert.length;
        console.log(`Inserted ${goalsCount} goals`);
      }
    }

    // Process cards
    const cards = events.filter(e => e.type === 'Card');
    if (cards.length > 0) {
      // Delete existing cards for this match
      await supabase.from('cartoes_partida').delete().eq('partida_id', partida.id);

      const cardsToInsert = cards.map(card => {
        let timeId = null;
        for (const [nome, id] of timeMap) {
          if (card.team.name.toLowerCase().includes(nome) || nome.includes(card.team.name.toLowerCase())) {
            timeId = id;
            break;
          }
        }

        return {
          partida_id: partida.id,
          time_id: timeId,
          minuto: card.time.elapsed,
          jogador_nome: card.player.name,
          jogador_api_id: card.player.id,
          tipo: card.detail === 'Yellow Card' ? 'amarelo' : 'vermelho',
        };
      });

      const { error: cardsError } = await supabase.from('cartoes_partida').insert(cardsToInsert);
      if (cardsError) {
        console.error('Error inserting cards:', cardsError);
      } else {
        cardsCount = cardsToInsert.length;
        console.log(`Inserted ${cardsCount} cards`);
      }
    }

    // Process lineups
    for (const lineup of lineups) {
      let timeId = null;
      for (const [nome, id] of timeMap) {
        if (lineup.team.name.toLowerCase().includes(nome) || nome.includes(lineup.team.name.toLowerCase())) {
          timeId = id;
          break;
        }
      }

      if (!timeId) continue;

      // Delete existing lineups for this team in this match
      await supabase.from('escalacoes').delete()
        .eq('partida_id', partida.id)
        .eq('time_id', timeId);

      const lineupsToInsert = [];

      // Starting XI
      for (const player of lineup.startXI) {
        lineupsToInsert.push({
          partida_id: partida.id,
          time_id: timeId,
          jogador_nome: player.player.name,
          jogador_api_id: player.player.id,
          posicao: player.player.pos,
          numero_camisa: player.player.number,
          titular: true,
          formacao: lineup.formation,
        });
      }

      // Substitutes
      for (const player of lineup.substitutes) {
        lineupsToInsert.push({
          partida_id: partida.id,
          time_id: timeId,
          jogador_nome: player.player.name,
          jogador_api_id: player.player.id,
          posicao: player.player.pos,
          numero_camisa: player.player.number,
          titular: false,
          formacao: lineup.formation,
        });
      }

      if (lineupsToInsert.length > 0) {
        const { error: lineupsError } = await supabase.from('escalacoes').insert(lineupsToInsert);
        if (lineupsError) {
          console.error('Error inserting lineups:', lineupsError);
        } else {
          lineupsCount += lineupsToInsert.length;
        }
      }

      // Process coach
      if (lineup.coach) {
        // Upsert coach
        const { data: tecnico } = await supabase
          .from('tecnicos')
          .upsert({
            nome: lineup.coach.name,
            api_id: lineup.coach.id,
          }, { onConflict: 'api_id' })
          .select()
          .single();

        if (tecnico) {
          await supabase.from('tecnico_partida').upsert({
            partida_id: partida.id,
            time_id: timeId,
            tecnico_id: tecnico.id,
          }, { onConflict: 'partida_id,time_id' });
        }
      }
    }

    console.log(`Inserted ${lineupsCount} lineup entries`);

    return { success: true, goalsCount, lineupsCount, cardsCount };
  } catch (error) {
    console.error('Error processing match details:', error);
    return { success: false, goalsCount, lineupsCount, cardsCount };
  }
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

    let limit = 5; // Default: 5 matches per run (conservative for 100 req/day limit)
    let matchId: string | null = null;

    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(body.limit, 20);
      if (body.matchId) matchId = body.matchId;
    } catch {
      // No body
    }

    const stats = {
      total: 0,
      synced: 0,
      skipped: 0,
      errors: [] as string[],
      apiRequestsUsed: 0,
    };

    // Get all leagues supported by API-Football from database
    const { data: validLeagues } = await supabase
      .from('ligas')
      .select('id, codigo_api')
      .in('codigo_api', Object.keys(FOOTBALL_DATA_TO_API_FOOTBALL));

    const validLeagueIds = validLeagues?.map(l => l.id) || [];
    console.log(`Found ${validLeagueIds.length} valid leagues for API-Football sync`);

    // API-Football free tier only supports seasons 2022-2024
    // We need to filter matches within these years
    const minDate = '2022-01-01';
    const maxDate = '2024-12-31';
    
    console.log(`API-Football free tier: filtering matches between ${minDate} and ${maxDate}`);

    // Build query for matches to sync
    let query = supabase
      .from('partidas')
      .select('id, api_id, data, gols_casa, gols_fora, time_casa_id, time_fora_id, liga_id')
      .eq('status', 'finished')
      .eq('detalhes_sincronizados', false)
      .not('gols_casa', 'is', null)
      .in('liga_id', validLeagueIds)
      .gte('data', minDate)
      .lte('data', maxDate)
      .order('data', { ascending: false });

    if (matchId) {
      query = supabase
        .from('partidas')
        .select('id, api_id, data, gols_casa, gols_fora, time_casa_id, time_fora_id, liga_id')
        .eq('id', matchId);
    } else {
      query = query.limit(limit);
    }

    const { data: matches, error: matchesError } = await query;

    if (matchesError) {
      throw new Error(`Error fetching matches: ${matchesError.message}`);
    }

    stats.total = matches?.length || 0;
    console.log(`Found ${stats.total} matches to sync via API-Football`);

    for (let i = 0; i < (matches?.length || 0); i++) {
      const partida = matches![i];
      console.log(`Processing match ${i + 1}/${stats.total}: ${partida.id}`);

      try {
        // Find API-Football fixture ID
        const fixtureId = await findApiFootballFixtureId(supabase, partida, apiKey);
        stats.apiRequestsUsed++;

        if (!fixtureId) {
          // Do NOT mark as synced - leave for retry or manual handling
          stats.skipped++;
          stats.errors.push(`Match ${partida.id}: No API-Football fixture found`);
          continue;
        }

        // Fetch and process details (2 API requests: events + lineups)
        const result = await processMatchDetails(supabase, partida, fixtureId, apiKey);
        stats.apiRequestsUsed += 2;

        if (result.success && (result.goalsCount > 0 || result.lineupsCount > 0 || result.cardsCount > 0)) {
          // Mark as synced
          await supabase
            .from('partidas')
            .update({ detalhes_sincronizados: true })
            .eq('id', partida.id);
          stats.synced++;
          console.log(`Successfully synced match ${partida.id}: ${result.goalsCount} goals, ${result.lineupsCount} lineups, ${result.cardsCount} cards`);
        } else {
          stats.skipped++;
          stats.errors.push(`Match ${partida.id}: No event data available`);
        }

        // Rate limiting: wait 1 second between matches
        if (i < (matches?.length || 0) - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing match ${partida.id}:`, errorMsg);
        stats.errors.push(`Match ${partida.id}: ${errorMsg}`);
      }
    }

    console.log('API-Football sync complete:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${stats.synced} of ${stats.total} matches (${stats.skipped} skipped)`,
        ...stats,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in API-Football sync:', error);
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
