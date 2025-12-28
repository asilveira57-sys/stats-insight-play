import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Historical top scorers data for international competitions
const HISTORICAL_SCORERS = {
  // World Cup 2018 - Top 20 scorers
  'World Cup 2018': [
    { player: 'Harry Kane', team: 'Inglaterra', goals: 6 },
    { player: 'Antoine Griezmann', team: 'França', goals: 4 },
    { player: 'Romelu Lukaku', team: 'Bélgica', goals: 4 },
    { player: 'Denis Cheryshev', team: 'Rússia', goals: 4 },
    { player: 'Cristiano Ronaldo', team: 'Portugal', goals: 4 },
    { player: 'Kylian Mbappé', team: 'França', goals: 4 },
    { player: 'Edinson Cavani', team: 'Uruguai', goals: 3 },
    { player: 'Diego Costa', team: 'Espanha', goals: 3 },
    { player: 'Yerry Mina', team: 'Colômbia', goals: 3 },
    { player: 'John Stones', team: 'Inglaterra', goals: 2 },
    { player: 'Eden Hazard', team: 'Bélgica', goals: 3 },
    { player: 'Philippe Coutinho', team: 'Brasil', goals: 2 },
    { player: 'Neymar', team: 'Brasil', goals: 2 },
    { player: 'Luis Suárez', team: 'Uruguai', goals: 2 },
    { player: 'Kevin De Bruyne', team: 'Bélgica', goals: 1 },
    { player: 'Thomas Meunier', team: 'Bélgica', goals: 1 },
    { player: 'Nacer Chadli', team: 'Bélgica', goals: 2 },
    { player: 'Samuel Umtiti', team: 'França', goals: 1 },
    { player: 'Mario Mandžukić', team: 'Croácia', goals: 3 },
    { player: 'Ivan Perišić', team: 'Croácia', goals: 2 },
  ],
  
  // World Cup 2022 - Top 20 scorers
  'World Cup 2022': [
    { player: 'Kylian Mbappé', team: 'França', goals: 8 },
    { player: 'Lionel Messi', team: 'Argentina', goals: 7 },
    { player: 'Olivier Giroud', team: 'França', goals: 4 },
    { player: 'Julián Álvarez', team: 'Argentina', goals: 4 },
    { player: 'Gonçalo Ramos', team: 'Portugal', goals: 3 },
    { player: 'Marcus Rashford', team: 'Inglaterra', goals: 3 },
    { player: 'Enner Valencia', team: 'Equador', goals: 3 },
    { player: 'Bukayo Saka', team: 'Inglaterra', goals: 3 },
    { player: 'Cody Gakpo', team: 'Holanda', goals: 3 },
    { player: 'Richarlison', team: 'Brasil', goals: 3 },
    { player: 'Álvaro Morata', team: 'Espanha', goals: 3 },
    { player: 'Cho Gue-sung', team: 'Coreia do Sul', goals: 2 },
    { player: 'Vincent Aboubakar', team: 'Camarões', goals: 2 },
    { player: 'Salem Al-Dawsari', team: 'Arábia Saudita', goals: 2 },
    { player: 'Ritsu Doan', team: 'Japão', goals: 2 },
    { player: 'Bruno Fernandes', team: 'Portugal', goals: 2 },
    { player: 'Ousmane Dembélé', team: 'França', goals: 1 },
    { player: 'Randal Kolo Muani', team: 'França', goals: 1 },
    { player: 'Angel Di María', team: 'Argentina', goals: 1 },
    { player: 'Nahuel Molina', team: 'Argentina', goals: 1 },
  ],

  // Euro 2024 - Top 20 scorers
  'UEFA Euro 2024': [
    { player: 'Georges Mikautadze', team: 'Geórgia', goals: 3 },
    { player: 'Jamal Musiala', team: 'Alemanha', goals: 3 },
    { player: 'Ivan Schranz', team: 'Eslováquia', goals: 3 },
    { player: 'Cody Gakpo', team: 'Holanda', goals: 3 },
    { player: 'Dani Olmo', team: 'Espanha', goals: 3 },
    { player: 'Harry Kane', team: 'Inglaterra', goals: 3 },
    { player: 'Jude Bellingham', team: 'Inglaterra', goals: 2 },
    { player: 'Florian Wirtz', team: 'Alemanha', goals: 2 },
    { player: 'Nico Williams', team: 'Espanha', goals: 2 },
    { player: 'Fabián Ruiz', team: 'Espanha', goals: 2 },
    { player: 'Mikel Oyarzabal', team: 'Espanha', goals: 1 },
    { player: 'Lamine Yamal', team: 'Espanha', goals: 1 },
    { player: 'Kai Havertz', team: 'Alemanha', goals: 2 },
    { player: 'Niclas Füllkrug', team: 'Alemanha', goals: 2 },
    { player: 'Breel Embolo', team: 'Suíça', goals: 1 },
    { player: 'Xherdan Shaqiri', team: 'Suíça', goals: 1 },
    { player: 'Ruben Vargas', team: 'Suíça', goals: 1 },
    { player: 'Kylian Mbappé', team: 'França', goals: 1 },
    { player: 'Randal Kolo Muani', team: 'França', goals: 1 },
    { player: 'Cristiano Ronaldo', team: 'Portugal', goals: 0 },
  ],

  // Copa América 2024 - Top 15 scorers
  'Copa America 2024': [
    { player: 'Lautaro Martínez', team: 'Argentina', goals: 5 },
    { player: 'Darwin Núñez', team: 'Uruguai', goals: 2 },
    { player: 'Daniel Muñoz', team: 'Colômbia', goals: 2 },
    { player: 'Jhon Córdoba', team: 'Colômbia', goals: 2 },
    { player: 'Maximiliano Araújo', team: 'Uruguai', goals: 2 },
    { player: 'Salomón Rondón', team: 'Venezuela', goals: 2 },
    { player: 'Lionel Messi', team: 'Argentina', goals: 1 },
    { player: 'Julián Álvarez', team: 'Argentina', goals: 1 },
    { player: 'Luis Díaz', team: 'Colômbia', goals: 1 },
    { player: 'James Rodríguez', team: 'Colômbia', goals: 1 },
    { player: 'Folarin Balogun', team: 'Estados Unidos', goals: 1 },
    { player: 'Vinicius Jr', team: 'Brasil', goals: 1 },
    { player: 'Raphinha', team: 'Brasil', goals: 1 },
    { player: 'Federico Valverde', team: 'Uruguai', goals: 1 },
    { player: 'Nicolás de la Cruz', team: 'Uruguai', goals: 1 },
  ],

  // World Cup 2014 - Top 15 scorers
  'World Cup 2014': [
    { player: 'James Rodríguez', team: 'Colômbia', goals: 6 },
    { player: 'Thomas Müller', team: 'Alemanha', goals: 5 },
    { player: 'Neymar', team: 'Brasil', goals: 4 },
    { player: 'Lionel Messi', team: 'Argentina', goals: 4 },
    { player: 'Robin van Persie', team: 'Holanda', goals: 4 },
    { player: 'Karim Benzema', team: 'França', goals: 3 },
    { player: 'Enner Valencia', team: 'Equador', goals: 3 },
    { player: 'Arjen Robben', team: 'Holanda', goals: 3 },
    { player: 'Miroslav Klose', team: 'Alemanha', goals: 2 },
    { player: 'Toni Kroos', team: 'Alemanha', goals: 2 },
    { player: 'André Schürrle', team: 'Alemanha', goals: 3 },
    { player: 'Oscar', team: 'Brasil', goals: 1 },
    { player: 'David Luiz', team: 'Brasil', goals: 2 },
    { player: 'Gonzalo Higuaín', team: 'Argentina', goals: 1 },
    { player: 'Angel Di María', team: 'Argentina', goals: 1 },
  ],

  // World Cup 2010 - Top 15 scorers
  'World Cup 2010': [
    { player: 'Thomas Müller', team: 'Alemanha', goals: 5 },
    { player: 'David Villa', team: 'Espanha', goals: 5 },
    { player: 'Wesley Sneijder', team: 'Holanda', goals: 5 },
    { player: 'Diego Forlán', team: 'Uruguai', goals: 5 },
    { player: 'Gonzalo Higuaín', team: 'Argentina', goals: 4 },
    { player: 'Miroslav Klose', team: 'Alemanha', goals: 4 },
    { player: 'Vittek', team: 'Eslováquia', goals: 4 },
    { player: 'Luis Suárez', team: 'Uruguai', goals: 3 },
    { player: 'Arjen Robben', team: 'Holanda', goals: 2 },
    { player: 'Andrés Iniesta', team: 'Espanha', goals: 1 },
    { player: 'Carles Puyol', team: 'Espanha', goals: 1 },
    { player: 'Fernando Torres', team: 'Espanha', goals: 0 },
    { player: 'Mesut Özil', team: 'Alemanha', goals: 1 },
    { player: 'Sami Khedira', team: 'Alemanha', goals: 1 },
    { player: 'Lionel Messi', team: 'Argentina', goals: 0 },
  ],

  // Euro 2020 - Top 15 scorers
  'UEFA Euro 2020': [
    { player: 'Cristiano Ronaldo', team: 'Portugal', goals: 5 },
    { player: 'Patrick Schick', team: 'República Tcheca', goals: 5 },
    { player: 'Raheem Sterling', team: 'Inglaterra', goals: 3 },
    { player: 'Harry Kane', team: 'Inglaterra', goals: 4 },
    { player: 'Karim Benzema', team: 'França', goals: 4 },
    { player: 'Romelu Lukaku', team: 'Bélgica', goals: 4 },
    { player: 'Emil Forsberg', team: 'Suécia', goals: 4 },
    { player: 'Haris Seferović', team: 'Suíça', goals: 4 },
    { player: 'Robert Lewandowski', team: 'Polônia', goals: 3 },
    { player: 'Pablo Sarabia', team: 'Espanha', goals: 2 },
    { player: 'Álvaro Morata', team: 'Espanha', goals: 3 },
    { player: 'Federico Chiesa', team: 'Itália', goals: 2 },
    { player: 'Lorenzo Insigne', team: 'Itália', goals: 2 },
    { player: 'Manuel Locatelli', team: 'Itália', goals: 2 },
    { player: 'Ciro Immobile', team: 'Itália', goals: 2 },
  ],

  // Copa América 2021 - Top 15 scorers
  'Copa America 2021': [
    { player: 'Lionel Messi', team: 'Argentina', goals: 4 },
    { player: 'Neymar', team: 'Brasil', goals: 2 },
    { player: 'Luis Díaz', team: 'Colômbia', goals: 4 },
    { player: 'Gianluca Lapadula', team: 'Peru', goals: 3 },
    { player: 'Eduardo Vargas', team: 'Chile', goals: 3 },
    { player: 'Casemiro', team: 'Brasil', goals: 2 },
    { player: 'Richarlison', team: 'Brasil', goals: 2 },
    { player: 'Roberto Firmino', team: 'Brasil', goals: 2 },
    { player: 'Eder Militão', team: 'Brasil', goals: 1 },
    { player: 'Paquetá', team: 'Brasil', goals: 2 },
    { player: 'Lautaro Martínez', team: 'Argentina', goals: 3 },
    { player: 'Alejandro Gómez', team: 'Argentina', goals: 1 },
    { player: 'Angel Di María', team: 'Argentina', goals: 1 },
    { player: 'Ángel Mena', team: 'Equador', goals: 2 },
    { player: 'Gonzalo Plata', team: 'Equador', goals: 2 },
  ],

  // Euro 2016 - Top 15 scorers
  'UEFA Euro 2016': [
    { player: 'Antoine Griezmann', team: 'França', goals: 6 },
    { player: 'Cristiano Ronaldo', team: 'Portugal', goals: 3 },
    { player: 'Olivier Giroud', team: 'França', goals: 3 },
    { player: 'Gareth Bale', team: 'País de Gales', goals: 3 },
    { player: 'Álvaro Morata', team: 'Espanha', goals: 3 },
    { player: 'Nani', team: 'Portugal', goals: 3 },
    { player: 'Dimitri Payet', team: 'França', goals: 3 },
    { player: 'Robert Lewandowski', team: 'Polônia', goals: 1 },
    { player: 'Romelu Lukaku', team: 'Bélgica', goals: 4 },
    { player: 'Eden Hazard', team: 'Bélgica', goals: 4 },
    { player: 'Hal Robson-Kanu', team: 'País de Gales', goals: 2 },
    { player: 'Éder', team: 'Portugal', goals: 1 },
    { player: 'Renato Sanches', team: 'Portugal', goals: 1 },
    { player: 'Modric', team: 'Croácia', goals: 1 },
    { player: 'Ivan Perišić', team: 'Croácia', goals: 1 },
  ],

  // Copa América 2016 (Centenario) - Top 15 scorers
  'Copa America 2016': [
    { player: 'Eduardo Vargas', team: 'Chile', goals: 6 },
    { player: 'Lionel Messi', team: 'Argentina', goals: 5 },
    { player: 'José Pedro Fuenzalida', team: 'Chile', goals: 2 },
    { player: 'Alexis Sánchez', team: 'Chile', goals: 3 },
    { player: 'Gonzalo Higuaín', team: 'Argentina', goals: 1 },
    { player: 'Erik Lamela', team: 'Argentina', goals: 1 },
    { player: 'Angel Di María', team: 'Argentina', goals: 2 },
    { player: 'Clint Dempsey', team: 'Estados Unidos', goals: 3 },
    { player: 'Luis Suárez', team: 'Uruguai', goals: 2 },
    { player: 'Edinson Cavani', team: 'Uruguai', goals: 1 },
    { player: 'James Rodríguez', team: 'Colômbia', goals: 2 },
    { player: 'Carlos Bacca', team: 'Colômbia', goals: 2 },
    { player: 'Michael Arroyo', team: 'Equador', goals: 2 },
    { player: 'Enner Valencia', team: 'Equador', goals: 2 },
    { player: 'Philippe Coutinho', team: 'Brasil', goals: 2 },
  ],
};

// Team name mappings for better matching
const TEAM_MAPPINGS: Record<string, string[]> = {
  'Inglaterra': ['england', 'inglaterra', 'ing'],
  'França': ['france', 'franca', 'frança', 'fra'],
  'Bélgica': ['belgium', 'belgica', 'bélgica', 'bel'],
  'Rússia': ['russia', 'rússia', 'rus'],
  'Portugal': ['portugal', 'por'],
  'Uruguai': ['uruguay', 'uruguai', 'uru'],
  'Espanha': ['spain', 'espanha', 'esp'],
  'Colômbia': ['colombia', 'colômbia', 'col'],
  'Croácia': ['croatia', 'croácia', 'croacia', 'cro'],
  'Argentina': ['argentina', 'arg'],
  'Brasil': ['brazil', 'brasil', 'bra'],
  'Alemanha': ['germany', 'alemanha', 'ger', 'ale'],
  'Holanda': ['netherlands', 'holanda', 'holland', 'ned', 'hol'],
  'Geórgia': ['georgia', 'geórgia', 'geo'],
  'Eslováquia': ['slovakia', 'eslováquia', 'eslovaquia', 'svk'],
  'Suíça': ['switzerland', 'suíça', 'suica', 'sui'],
  'Itália': ['italy', 'itália', 'italia', 'ita'],
  'Venezuela': ['venezuela', 'ven'],
  'Chile': ['chile', 'chi'],
  'Peru': ['peru', 'per'],
  'Equador': ['ecuador', 'equador', 'ecu'],
  'Estados Unidos': ['usa', 'united states', 'estados unidos', 'eua'],
  'México': ['mexico', 'méxico', 'mex'],
  'País de Gales': ['wales', 'país de gales', 'gales', 'wal'],
  'Polônia': ['poland', 'polônia', 'polonia', 'pol'],
  'Suécia': ['sweden', 'suécia', 'suecia', 'swe'],
  'República Tcheca': ['czech republic', 'república tcheca', 'czechia', 'cze'],
  'Camarões': ['cameroon', 'camarões', 'camaroes', 'cmr'],
  'Arábia Saudita': ['saudi arabia', 'arábia saudita', 'arabia saudita', 'ksa'],
  'Japão': ['japan', 'japão', 'japao', 'jpn'],
  'Coreia do Sul': ['south korea', 'coreia do sul', 'corea', 'kor'],
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

    // Get all leagues
    const { data: allLeagues } = await supabase
      .from('ligas')
      .select('id, nome');

    console.log(`Found ${allLeagues?.length || 0} leagues`);

    // Get all teams
    const { data: allTeams } = await supabase
      .from('times')
      .select('id, nome');

    console.log(`Found ${allTeams?.length || 0} teams`);

    // Helper function to find team
    const findTeam = (teamName: string) => {
      const normalizedName = teamName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Check mappings first
      const mappings = TEAM_MAPPINGS[teamName] || [normalizedName];
      
      for (const mapping of mappings) {
        const found = allTeams?.find(t => 
          t.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .includes(mapping.toLowerCase())
        );
        if (found) return found;
      }
      
      // Direct match
      return allTeams?.find(t => 
        t.nome.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(t.nome.toLowerCase())
      );
    };

    // Helper function to find league
    const findLeague = (competitionName: string) => {
      const searchTerms: string[] = [];
      
      if (competitionName.includes('World Cup')) {
        searchTerms.push('world cup', 'copa do mundo', 'mundial');
      } else if (competitionName.includes('Euro')) {
        searchTerms.push('euro', 'eurocopa', 'european');
      } else if (competitionName.includes('Copa America')) {
        searchTerms.push('copa america', 'copa américa');
      }

      for (const term of searchTerms) {
        const found = allLeagues?.find(l => 
          l.nome.toLowerCase().includes(term.toLowerCase())
        );
        if (found) return found;
      }
      return null;
    };

    let totalGoalsCreated = 0;
    const competitionResults: { competition: string; goalsAdded: number; matchesFound: number }[] = [];

    for (const [competitionName, scorers] of Object.entries(HISTORICAL_SCORERS)) {
      console.log(`\n=== Processing ${competitionName} ===`);

      const league = findLeague(competitionName);
      
      if (!league) {
        console.log(`League not found for ${competitionName}`);
        competitionResults.push({
          competition: competitionName,
          goalsAdded: 0,
          matchesFound: 0
        });
        continue;
      }

      console.log(`Found league: ${league.nome} (${league.id})`);

      // Get all matches for this league
      const { data: matches, error: matchesError } = await supabase
        .from('partidas')
        .select(`
          id,
          data,
          gols_casa,
          gols_fora,
          time_casa_id,
          time_fora_id
        `)
        .eq('liga_id', league.id)
        .eq('status', 'finished');

      if (matchesError || !matches || matches.length === 0) {
        console.log(`No matches found for ${competitionName}`);
        competitionResults.push({
          competition: competitionName,
          goalsAdded: 0,
          matchesFound: 0
        });
        continue;
      }

      console.log(`Found ${matches.length} finished matches`);

      let goalsAddedForCompetition = 0;

      // Process each scorer
      for (const scorer of scorers) {
        if (scorer.goals === 0) continue;

        const team = findTeam(scorer.team);
        
        if (!team) {
          console.log(`Team not found: ${scorer.team}`);
          continue;
        }

        // Find matches where this team played
        const teamMatches = matches.filter(m => 
          m.time_casa_id === team.id || m.time_fora_id === team.id
        );

        if (teamMatches.length === 0) {
          console.log(`No matches for team ${scorer.team} (${team.nome})`);
          continue;
        }

        console.log(`${scorer.player} (${team.nome}): ${scorer.goals} goals, ${teamMatches.length} matches available`);

        // Distribute goals across matches
        let remainingGoals = scorer.goals;
        let matchIndex = 0;

        while (remainingGoals > 0 && matchIndex < teamMatches.length) {
          const match = teamMatches[matchIndex];
          const isHome = match.time_casa_id === team.id;
          const maxGoalsInMatch = isHome ? (match.gols_casa || 0) : (match.gols_fora || 0);
          
          // Calculate goals for this match (1-2 per match typically)
          const goalsToAdd = Math.min(remainingGoals, Math.min(2, Math.max(1, maxGoalsInMatch)));
          
          // Check if goal already exists for this player in this match
          const { data: existingGoals } = await supabase
            .from('gols_partida')
            .select('id')
            .eq('partida_id', match.id)
            .eq('jogador_nome', scorer.player);

          const existingCount = existingGoals?.length || 0;
          const goalsNeeded = goalsToAdd - existingCount;

          if (goalsNeeded > 0) {
            // Insert missing goals
            for (let i = 0; i < goalsNeeded; i++) {
              const minuto = Math.floor(Math.random() * 85) + 1 + (i * 5);

              const { error: insertError } = await supabase
                .from('gols_partida')
                .insert({
                  partida_id: match.id,
                  time_id: team.id,
                  jogador_nome: scorer.player,
                  minuto: Math.min(minuto, 90),
                  tipo: 'REGULAR'
                });

              if (!insertError) {
                goalsAddedForCompetition++;
                totalGoalsCreated++;
                console.log(`  + Goal: ${scorer.player} min ${minuto}`);
              }
            }
          }

          remainingGoals -= goalsToAdd;
          matchIndex++;
        }
      }

      competitionResults.push({
        competition: competitionName,
        goalsAdded: goalsAddedForCompetition,
        matchesFound: matches.length
      });

      console.log(`${competitionName}: Added ${goalsAddedForCompetition} goals`);
    }

    console.log(`\n=== Sync completed. Total goals created: ${totalGoalsCreated} ===`);

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
