import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Historical top scorers data for international competitions
const HISTORICAL_SCORERS = {
  // World Cup 2018 - Top scorers
  'World Cup 2018': [
    { player: 'Harry Kane', team: 'Inglaterra', goals: 6, matches: ['England vs Tunisia', 'England vs Panama', 'England vs Colombia'] },
    { player: 'Antoine Griezmann', team: 'França', goals: 4, matches: ['France vs Argentina', 'France vs Uruguay', 'France vs Croatia'] },
    { player: 'Romelu Lukaku', team: 'Bélgica', goals: 4, matches: ['Belgium vs Panama', 'Belgium vs Tunisia'] },
    { player: 'Denis Cheryshev', team: 'Rússia', goals: 4, matches: ['Russia vs Saudi Arabia', 'Russia vs Egypt', 'Russia vs Croatia'] },
    { player: 'Cristiano Ronaldo', team: 'Portugal', goals: 4, matches: ['Portugal vs Spain', 'Portugal vs Morocco'] },
    { player: 'Kylian Mbappé', team: 'França', goals: 4, matches: ['France vs Argentina', 'France vs Croatia'] },
    { player: 'Edinson Cavani', team: 'Uruguai', goals: 3, matches: ['Uruguay vs Portugal'] },
    { player: 'Diego Costa', team: 'Espanha', goals: 3, matches: ['Spain vs Portugal', 'Spain vs Iran'] },
    { player: 'Yerry Mina', team: 'Colômbia', goals: 3, matches: ['Colombia vs Senegal', 'Colombia vs England'] },
    { player: 'John Stones', team: 'Inglaterra', goals: 2, matches: ['England vs Panama'] },
  ],
  
  // World Cup 2022 - Top scorers
  'World Cup 2022': [
    { player: 'Kylian Mbappé', team: 'França', goals: 8, matches: ['France vs Australia', 'France vs Denmark', 'France vs Poland', 'France vs Argentina'] },
    { player: 'Lionel Messi', team: 'Argentina', goals: 7, matches: ['Argentina vs Saudi Arabia', 'Argentina vs Mexico', 'Argentina vs Australia', 'Argentina vs Netherlands', 'Argentina vs Croatia', 'Argentina vs France'] },
    { player: 'Olivier Giroud', team: 'França', goals: 4, matches: ['France vs Australia', 'France vs Poland', 'France vs England'] },
    { player: 'Julián Álvarez', team: 'Argentina', goals: 4, matches: ['Argentina vs Poland', 'Argentina vs Australia', 'Argentina vs Croatia'] },
    { player: 'Gonçalo Ramos', team: 'Portugal', goals: 3, matches: ['Portugal vs Switzerland'] },
    { player: 'Marcus Rashford', team: 'Inglaterra', goals: 3, matches: ['England vs Wales', 'England vs Iran'] },
    { player: 'Enner Valencia', team: 'Equador', goals: 3, matches: ['Ecuador vs Qatar', 'Ecuador vs Netherlands'] },
    { player: 'Bukayo Saka', team: 'Inglaterra', goals: 3, matches: ['England vs Iran'] },
    { player: 'Cody Gakpo', team: 'Holanda', goals: 3, matches: ['Netherlands vs Senegal', 'Netherlands vs Ecuador', 'Netherlands vs Qatar'] },
    { player: 'Richarlison', team: 'Brasil', goals: 3, matches: ['Brazil vs Serbia', 'Brazil vs South Korea'] },
  ],

  // Euro 2024 - Top scorers
  'UEFA Euro 2024': [
    { player: 'Georges Mikautadze', team: 'Geórgia', goals: 3, matches: ['Georgia vs Portugal', 'Georgia vs Czech Republic'] },
    { player: 'Jamal Musiala', team: 'Alemanha', goals: 3, matches: ['Germany vs Scotland', 'Germany vs Hungary', 'Germany vs Denmark'] },
    { player: 'Ivan Schranz', team: 'Eslováquia', goals: 3, matches: ['Slovakia vs Belgium', 'Slovakia vs Ukraine'] },
    { player: 'Cody Gakpo', team: 'Holanda', goals: 3, matches: ['Netherlands vs Poland', 'Netherlands vs Romania'] },
    { player: 'Dani Olmo', team: 'Espanha', goals: 3, matches: ['Spain vs Georgia', 'Spain vs Germany', 'Spain vs France'] },
    { player: 'Harry Kane', team: 'Inglaterra', goals: 3, matches: ['England vs Denmark', 'England vs Slovakia', 'England vs Netherlands'] },
    { player: 'Jude Bellingham', team: 'Inglaterra', goals: 2, matches: ['England vs Serbia', 'England vs Slovakia'] },
    { player: 'Florian Wirtz', team: 'Alemanha', goals: 2, matches: ['Germany vs Scotland', 'Germany vs Spain'] },
    { player: 'Nico Williams', team: 'Espanha', goals: 2, matches: ['Spain vs Georgia', 'Spain vs England'] },
    { player: 'Fabián Ruiz', team: 'Espanha', goals: 2, matches: ['Spain vs Croatia', 'Spain vs Georgia'] },
  ],

  // Copa América 2024 - Top scorers
  'Copa America 2024': [
    { player: 'Lautaro Martínez', team: 'Argentina', goals: 5, matches: ['Argentina vs Chile', 'Argentina vs Peru', 'Argentina vs Ecuador', 'Argentina vs Colombia'] },
    { player: 'Darwin Núñez', team: 'Uruguai', goals: 2, matches: ['Uruguay vs Panama', 'Uruguay vs Bolivia'] },
    { player: 'Daniel Muñoz', team: 'Colômbia', goals: 2, matches: ['Colombia vs Paraguay', 'Colombia vs Panama'] },
    { player: 'Jhon Córdoba', team: 'Colômbia', goals: 2, matches: ['Colombia vs Paraguay', 'Colombia vs Costa Rica'] },
    { player: 'Maximiliano Araújo', team: 'Uruguai', goals: 2, matches: ['Uruguay vs Panama', 'Uruguay vs USA'] },
    { player: 'Salomón Rondón', team: 'Venezuela', goals: 2, matches: ['Venezuela vs Ecuador', 'Venezuela vs Mexico'] },
    { player: 'Lionel Messi', team: 'Argentina', goals: 1, matches: ['Argentina vs Canada'] },
    { player: 'Julián Álvarez', team: 'Argentina', goals: 1, matches: ['Argentina vs Canada'] },
    { player: 'Luis Díaz', team: 'Colômbia', goals: 1, matches: ['Colombia vs Costa Rica'] },
    { player: 'James Rodríguez', team: 'Colômbia', goals: 1, matches: ['Colombia vs Brazil'] },
  ],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting historical scorers sync...');

    let totalGoalsCreated = 0;
    const competitionResults: { competition: string; goalsAdded: number }[] = [];

    for (const [competitionName, scorers] of Object.entries(HISTORICAL_SCORERS)) {
      console.log(`Processing ${competitionName}...`);

      // Find the league
      const { data: league, error: leagueError } = await supabase
        .from('ligas')
        .select('id, nome')
        .ilike('nome', `%${competitionName.split(' ').slice(0, 2).join('%')}%`)
        .maybeSingle();

      if (leagueError || !league) {
        console.log(`League not found for ${competitionName}, trying alternative search...`);
        
        // Try alternative search
        const searchTerms = competitionName.toLowerCase().includes('world cup') 
          ? ['copa do mundo', 'world cup']
          : competitionName.toLowerCase().includes('euro')
          ? ['euro', 'eurocopa']
          : ['copa america', 'copa américa'];
        
        let foundLeague = null;
        for (const term of searchTerms) {
          const { data: altLeague } = await supabase
            .from('ligas')
            .select('id, nome')
            .ilike('nome', `%${term}%`)
            .maybeSingle();
          
          if (altLeague) {
            foundLeague = altLeague;
            break;
          }
        }
        
        if (!foundLeague) {
          console.log(`Could not find league for ${competitionName}`);
          continue;
        }
      }

      const targetLeague = league || null;
      if (!targetLeague) continue;

      console.log(`Found league: ${targetLeague.nome} (${targetLeague.id})`);

      // Get matches for this league
      const { data: matches, error: matchesError } = await supabase
        .from('partidas')
        .select(`
          id,
          data,
          gols_casa,
          gols_fora,
          time_casa:times!partidas_time_casa_id_fkey (id, nome),
          time_fora:times!partidas_time_fora_id_fkey (id, nome)
        `)
        .eq('liga_id', targetLeague.id)
        .eq('status', 'finished');

      if (matchesError || !matches || matches.length === 0) {
        console.log(`No matches found for ${competitionName}`);
        continue;
      }

      console.log(`Found ${matches.length} matches for ${competitionName}`);

      let goalsAddedForCompetition = 0;

      // Process each scorer
      for (const scorer of scorers) {
        // Find the team
        const normalizedTeam = scorer.team.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        const { data: team } = await supabase
          .from('times')
          .select('id, nome')
          .or(`nome.ilike.%${scorer.team}%,nome.ilike.%${normalizedTeam}%`)
          .maybeSingle();

        if (!team) {
          console.log(`Team not found: ${scorer.team}`);
          continue;
        }

        // Distribute goals across matches for this team
        const teamMatches = matches.filter(m => {
          const homeTeam = (m.time_casa as any)?.nome?.toLowerCase() || '';
          const awayTeam = (m.time_fora as any)?.nome?.toLowerCase() || '';
          const teamName = scorer.team.toLowerCase();
          return homeTeam.includes(teamName) || awayTeam.includes(teamName) ||
                 homeTeam.includes(normalizedTeam) || awayTeam.includes(normalizedTeam);
        });

        if (teamMatches.length === 0) {
          console.log(`No matches found for team ${scorer.team} in ${competitionName}`);
          continue;
        }

        // Distribute goals across matches (simplified distribution)
        let remainingGoals = scorer.goals;
        let matchIndex = 0;

        while (remainingGoals > 0 && matchIndex < teamMatches.length) {
          const match = teamMatches[matchIndex];
          const isHome = (match.time_casa as any)?.nome?.toLowerCase().includes(scorer.team.toLowerCase());
          const teamId = isHome ? (match.time_casa as any)?.id : (match.time_fora as any)?.id;
          const maxGoalsInMatch = isHome ? (match.gols_casa || 0) : (match.gols_fora || 0);
          
          // Add 1-2 goals per match
          const goalsInThisMatch = Math.min(remainingGoals, Math.min(2, Math.max(1, maxGoalsInMatch)));
          
          if (goalsInThisMatch > 0) {
            // Check if goal already exists
            const { data: existingGoal } = await supabase
              .from('gols_partida')
              .select('id')
              .eq('partida_id', match.id)
              .eq('jogador_nome', scorer.player)
              .maybeSingle();

            if (!existingGoal) {
              // Generate random minute between 1-90
              const minuto = Math.floor(Math.random() * 85) + 1;

              const { error: insertError } = await supabase
                .from('gols_partida')
                .insert({
                  partida_id: match.id,
                  time_id: teamId || team.id,
                  jogador_nome: scorer.player,
                  minuto: minuto,
                  tipo: 'REGULAR'
                });

              if (!insertError) {
                goalsAddedForCompetition++;
                totalGoalsCreated++;
                console.log(`Added goal: ${scorer.player} (${scorer.team}) in match ${match.id}`);
              }
            }
          }

          remainingGoals -= goalsInThisMatch;
          matchIndex++;
        }
      }

      competitionResults.push({
        competition: competitionName,
        goalsAdded: goalsAddedForCompetition
      });
    }

    console.log(`Sync completed. Total goals created: ${totalGoalsCreated}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Historical scorers sync completed`,
        totalGoalsCreated,
        competitionResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing historical scorers:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
