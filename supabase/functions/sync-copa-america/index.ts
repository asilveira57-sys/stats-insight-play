import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Copa America 2024 complete results
const COPA_AMERICA_2024_MATCHES = [
  // Group A
  { date: '2024-06-20', home: 'Argentina', away: 'Canadá', home_score: 2, away_score: 0, round: 1 },
  { date: '2024-06-21', home: 'Peru', away: 'Chile', home_score: 0, away_score: 0, round: 1 },
  { date: '2024-06-25', home: 'Chile', away: 'Argentina', home_score: 0, away_score: 1, round: 2 },
  { date: '2024-06-25', home: 'Peru', away: 'Canadá', home_score: 0, away_score: 1, round: 2 },
  { date: '2024-06-29', home: 'Argentina', away: 'Peru', home_score: 2, away_score: 0, round: 3 },
  { date: '2024-06-29', home: 'Canadá', away: 'Chile', home_score: 0, away_score: 0, round: 3 },
  
  // Group B
  { date: '2024-06-22', home: 'Equador', away: 'Venezuela', home_score: 1, away_score: 2, round: 1 },
  { date: '2024-06-22', home: 'México', away: 'Jamaica', home_score: 1, away_score: 0, round: 1 },
  { date: '2024-06-26', home: 'Venezuela', away: 'México', home_score: 1, away_score: 0, round: 2 },
  { date: '2024-06-26', home: 'Equador', away: 'Jamaica', home_score: 3, away_score: 1, round: 2 },
  { date: '2024-06-30', home: 'México', away: 'Equador', home_score: 0, away_score: 0, round: 3 },
  { date: '2024-06-30', home: 'Jamaica', away: 'Venezuela', home_score: 0, away_score: 3, round: 3 },
  
  // Group C
  { date: '2024-06-23', home: 'Estados Unidos', away: 'Bolívia', home_score: 2, away_score: 0, round: 1 },
  { date: '2024-06-24', home: 'Uruguai', away: 'Panamá', home_score: 3, away_score: 1, round: 1 },
  { date: '2024-06-27', home: 'Panamá', away: 'Estados Unidos', home_score: 2, away_score: 1, round: 2 },
  { date: '2024-06-27', home: 'Uruguai', away: 'Bolívia', home_score: 5, away_score: 0, round: 2 },
  { date: '2024-07-01', home: 'Estados Unidos', away: 'Uruguai', home_score: 0, away_score: 1, round: 3 },
  { date: '2024-07-01', home: 'Bolívia', away: 'Panamá', home_score: 1, away_score: 3, round: 3 },
  
  // Group D
  { date: '2024-06-23', home: 'Colômbia', away: 'Paraguai', home_score: 2, away_score: 1, round: 1 },
  { date: '2024-06-24', home: 'Brasil', away: 'Costa Rica', home_score: 0, away_score: 0, round: 1 },
  { date: '2024-06-28', home: 'Colômbia', away: 'Costa Rica', home_score: 3, away_score: 0, round: 2 },
  { date: '2024-06-28', home: 'Paraguai', away: 'Brasil', home_score: 1, away_score: 4, round: 2 },
  { date: '2024-07-02', home: 'Brasil', away: 'Colômbia', home_score: 1, away_score: 1, round: 3 },
  { date: '2024-07-02', home: 'Costa Rica', away: 'Paraguai', home_score: 2, away_score: 1, round: 3 },
  
  // Quarter-finals
  { date: '2024-07-04', home: 'Argentina', away: 'Equador', home_score: 1, away_score: 1, round: 4 }, // Argentina won on penalties 4-2
  { date: '2024-07-05', home: 'Venezuela', away: 'Canadá', home_score: 1, away_score: 1, round: 4 }, // Canada won on penalties 4-3
  { date: '2024-07-06', home: 'Uruguai', away: 'Brasil', home_score: 0, away_score: 0, round: 4 }, // Uruguay won on penalties 4-2
  { date: '2024-07-06', home: 'Colômbia', away: 'Panamá', home_score: 5, away_score: 0, round: 4 },
  
  // Semi-finals
  { date: '2024-07-09', home: 'Argentina', away: 'Canadá', home_score: 2, away_score: 0, round: 5 },
  { date: '2024-07-10', home: 'Uruguai', away: 'Colômbia', home_score: 0, away_score: 1, round: 5 },
  
  // Third place
  { date: '2024-07-13', home: 'Uruguai', away: 'Canadá', home_score: 2, away_score: 2, round: 6 }, // Uruguay won on penalties 4-3
  
  // Final
  { date: '2024-07-14', home: 'Argentina', away: 'Colômbia', home_score: 1, away_score: 0, round: 7 },
];

// Normalize team name for matching
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Importing Copa America 2024 with hardcoded data...');

    const stats = {
      matchesTotal: COPA_AMERICA_2024_MATCHES.length,
      matchesCreated: 0,
      matchesUpdated: 0,
      teamsCreated: 0,
      errors: [] as string[],
    };

    // Find or create Copa America 2024 league
    let { data: existingLeague } = await supabase
      .from('ligas')
      .select('id, nome')
      .ilike('nome', '%Copa America%')
      .single();

    let leagueId: string;

    if (!existingLeague) {
      console.log('Creating Copa America 2024 league...');
      const { data: newLeague, error: createLeagueError } = await supabase
        .from('ligas')
        .insert({
          nome: 'Copa America 2024',
          codigo_api: 'CA',
          pais: 'South America',
          ativa: true,
        })
        .select()
        .single();

      if (createLeagueError || !newLeague) {
        throw new Error(`Failed to create league: ${createLeagueError?.message}`);
      }
      leagueId = newLeague.id;
      console.log(`Created Copa America 2024 league: ${leagueId}`);
    } else {
      leagueId = existingLeague.id;
      console.log(`Using existing Copa America league: ${leagueId}`);
    }

    // Get all existing teams
    const { data: allTeams } = await supabase
      .from('times')
      .select('id, nome');

    const teamsByNormalizedName = new Map<string, { id: string; nome: string }>();
    allTeams?.forEach(team => {
      teamsByNormalizedName.set(normalizeTeamName(team.nome), team);
    });

    // Team name mapping for common variations
    const teamNameMapping: Record<string, string> = {
      'estadosunidos': 'Estados Unidos',
      'usa': 'Estados Unidos',
      'costarica': 'Costa Rica',
      'canada': 'Canadá',
    };

    // Helper to find or create a team
    async function findOrCreateTeam(teamName: string): Promise<string> {
      const normalized = normalizeTeamName(teamName);
      
      // Check existing
      const existing = teamsByNormalizedName.get(normalized);
      if (existing) return existing.id;

      // Check mapping
      const mappedName = teamNameMapping[normalized];
      if (mappedName) {
        const mapped = teamsByNormalizedName.get(normalizeTeamName(mappedName));
        if (mapped) return mapped.id;
      }

      // Try partial matching
      for (const [key, team] of teamsByNormalizedName.entries()) {
        if (key.includes(normalized) || normalized.includes(key)) {
          return team.id;
        }
      }

      // Create new team
      console.log(`Creating team: ${teamName}`);
      const { data: newTeam, error: teamError } = await supabase
        .from('times')
        .insert({
          nome: teamName,
          pais: teamName,
        })
        .select()
        .single();

      if (teamError || !newTeam) {
        throw new Error(`Failed to create team ${teamName}: ${teamError?.message}`);
      }

      stats.teamsCreated++;
      teamsByNormalizedName.set(normalized, newTeam);
      return newTeam.id;
    }

    // Check for existing matches
    const { data: existingMatches } = await supabase
      .from('partidas')
      .select('id, data, time_casa_id, time_fora_id')
      .eq('liga_id', leagueId);

    const existingMatchKeys = new Map<string, string>();
    existingMatches?.forEach(m => {
      existingMatchKeys.set(`${m.data}-${m.time_casa_id}-${m.time_fora_id}`, m.id);
    });

    // Process each match
    for (const match of COPA_AMERICA_2024_MATCHES) {
      try {
        const homeTeamId = await findOrCreateTeam(match.home);
        const awayTeamId = await findOrCreateTeam(match.away);
        
        const matchKey = `${match.date}-${homeTeamId}-${awayTeamId}`;
        const existingMatchId = existingMatchKeys.get(matchKey);
        
        if (existingMatchId) {
          // Update existing match
          const { error: updateError } = await supabase
            .from('partidas')
            .update({
              gols_casa: match.home_score,
              gols_fora: match.away_score,
              status: 'finished',
            })
            .eq('id', existingMatchId);

          if (updateError) {
            console.error(`Error updating match:`, updateError);
            stats.errors.push(`Update ${match.home} vs ${match.away}: ${updateError.message}`);
          } else {
            stats.matchesUpdated++;
            console.log(`✓ Updated: ${match.home} ${match.home_score} - ${match.away_score} ${match.away}`);
          }
        } else {
          // Create new match
          const { error: insertError } = await supabase
            .from('partidas')
            .insert({
              liga_id: leagueId,
              time_casa_id: homeTeamId,
              time_fora_id: awayTeamId,
              data: match.date,
              hora: '21:00',
              gols_casa: match.home_score,
              gols_fora: match.away_score,
              status: 'finished',
              rodada: match.round,
            });

          if (insertError) {
            console.error(`Error creating match:`, insertError);
            stats.errors.push(`Create ${match.home} vs ${match.away}: ${insertError.message}`);
          } else {
            stats.matchesCreated++;
            console.log(`✓ Created: ${match.home} ${match.home_score} - ${match.away_score} ${match.away}`);
          }
        }
      } catch (matchError) {
        console.error(`Error processing match:`, matchError);
        stats.errors.push(`Match error: ${matchError}`);
      }
    }

    console.log('Import complete:', stats);

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
    console.error('Error importing Copa America 2024:', error);
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
