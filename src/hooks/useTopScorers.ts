import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PlayerScorer {
  playerName: string;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  goals: number;
  matches: number;
}

interface CompetitionScorers {
  competitionId: string;
  competitionName: string;
  scorers: PlayerScorer[];
  totalGoals: number;
  totalMatches: number;
}

const INTERNATIONAL_KEYWORDS = [
  'world cup', 'copa do mundo', 'copa america', 'copa américa',
  'euro', 'eurocopa', 'nations league', 'liga das nações'
];

export function useTopScorers(selectedCompetition?: string) {
  return useQuery({
    queryKey: ['top-scorers', selectedCompetition],
    queryFn: async (): Promise<CompetitionScorers[]> => {
      // Fetch all international leagues
      const { data: leagues, error: leaguesError } = await supabase
        .from('ligas')
        .select('id, nome, logo_url');

      if (leaguesError) throw leaguesError;

      const internationalLeagues = leagues?.filter(league => 
        INTERNATIONAL_KEYWORDS.some(keyword => 
          league.nome.toLowerCase().includes(keyword)
        )
      ) || [];

      if (internationalLeagues.length === 0) return [];

      const leagueIds = selectedCompetition 
        ? [selectedCompetition]
        : internationalLeagues.map(l => l.id);

      // Fetch goals from gols_partida table
      const { data: goals, error: goalsError } = await supabase
        .from('gols_partida')
        .select(`
          id,
          jogador_nome,
          minuto,
          partida_id,
          time_id,
          partidas (
            id,
            liga_id,
            ligas (id, nome)
          ),
          times (id, nome, escudo_url)
        `)
        .not('jogador_nome', 'is', null);

      if (goalsError) throw goalsError;

      // Filter goals by international leagues
      const filteredGoals = goals?.filter(goal => {
        const ligaId = (goal.partidas as any)?.liga_id;
        return leagueIds.includes(ligaId);
      }) || [];

      // Group by competition
      const competitionMap = new Map<string, {
        name: string;
        goals: typeof filteredGoals;
      }>();

      filteredGoals.forEach(goal => {
        const ligaId = (goal.partidas as any)?.liga_id;
        const ligaNome = (goal.partidas as any)?.ligas?.nome || 'Unknown';
        
        if (!competitionMap.has(ligaId)) {
          competitionMap.set(ligaId, { name: ligaNome, goals: [] });
        }
        competitionMap.get(ligaId)!.goals.push(goal);
      });

      // Calculate scorers per competition
      const competitionScorers: CompetitionScorers[] = [];

      competitionMap.forEach((data, competitionId) => {
        // Group goals by player
        const playerGoalsMap = new Map<string, {
          teamId: string;
          teamName: string;
          teamLogo: string | null;
          goals: number;
          matchIds: Set<string>;
        }>();

        data.goals.forEach(goal => {
          const playerName = goal.jogador_nome;
          const team = goal.times as any;
          
          if (!playerGoalsMap.has(playerName)) {
            playerGoalsMap.set(playerName, {
              teamId: team?.id || '',
              teamName: team?.nome || 'Unknown',
              teamLogo: team?.escudo_url || null,
              goals: 0,
              matchIds: new Set()
            });
          }
          
          const playerStats = playerGoalsMap.get(playerName)!;
          playerStats.goals += 1;
          playerStats.matchIds.add(goal.partida_id);
        });

        const scorers: PlayerScorer[] = Array.from(playerGoalsMap.entries())
          .map(([playerName, stats]) => ({
            playerName,
            teamId: stats.teamId,
            teamName: stats.teamName,
            teamLogo: stats.teamLogo,
            goals: stats.goals,
            matches: stats.matchIds.size
          }))
          .sort((a, b) => b.goals - a.goals);

        // Get unique match count for this competition
        const uniqueMatches = new Set(data.goals.map(g => g.partida_id)).size;

        competitionScorers.push({
          competitionId,
          competitionName: data.name,
          scorers,
          totalGoals: data.goals.length,
          totalMatches: uniqueMatches
        });
      });

      // Also get team-level stats for competitions without individual goals
      const { data: matches } = await supabase
        .from('partidas')
        .select(`
          id,
          liga_id,
          time_casa_id,
          time_fora_id,
          gols_casa,
          gols_fora,
          ligas (id, nome),
          time_casa:times!partidas_time_casa_id_fkey (id, nome, escudo_url),
          time_fora:times!partidas_time_fora_id_fkey (id, nome, escudo_url)
        `)
        .in('liga_id', leagueIds)
        .eq('status', 'finished')
        .not('gols_casa', 'is', null)
        .not('gols_fora', 'is', null);

      // Add competitions that have matches but no individual goals
      if (matches) {
        const existingCompetitionIds = new Set(competitionScorers.map(c => c.competitionId));
        
        const matchesByLeague = new Map<string, typeof matches>();
        matches.forEach(match => {
          const ligaId = match.liga_id!;
          if (!matchesByLeague.has(ligaId)) {
            matchesByLeague.set(ligaId, []);
          }
          matchesByLeague.get(ligaId)!.push(match);
        });

        matchesByLeague.forEach((leagueMatches, ligaId) => {
          if (!existingCompetitionIds.has(ligaId)) {
            const ligaNome = (leagueMatches[0]?.ligas as any)?.nome || 'Unknown';
            
            // Calculate team goals as fallback
            const teamGoals = new Map<string, { name: string; logo: string | null; goals: number; matches: number }>();
            
            leagueMatches.forEach(match => {
              const homeTeam = match.time_casa as any;
              const awayTeam = match.time_fora as any;
              
              if (homeTeam?.id) {
                if (!teamGoals.has(homeTeam.id)) {
                  teamGoals.set(homeTeam.id, { name: homeTeam.nome, logo: homeTeam.escudo_url, goals: 0, matches: 0 });
                }
                teamGoals.get(homeTeam.id)!.goals += match.gols_casa || 0;
                teamGoals.get(homeTeam.id)!.matches += 1;
              }
              
              if (awayTeam?.id) {
                if (!teamGoals.has(awayTeam.id)) {
                  teamGoals.set(awayTeam.id, { name: awayTeam.nome, logo: awayTeam.escudo_url, goals: 0, matches: 0 });
                }
                teamGoals.get(awayTeam.id)!.goals += match.gols_fora || 0;
                teamGoals.get(awayTeam.id)!.matches += 1;
              }
            });

            const teamScorers: PlayerScorer[] = Array.from(teamGoals.entries())
              .map(([teamId, stats]) => ({
                playerName: `${stats.name} (Seleção)`,
                teamId,
                teamName: stats.name,
                teamLogo: stats.logo,
                goals: stats.goals,
                matches: stats.matches
              }))
              .sort((a, b) => b.goals - a.goals);

            const totalGoals = leagueMatches.reduce((sum, m) => sum + (m.gols_casa || 0) + (m.gols_fora || 0), 0);

            competitionScorers.push({
              competitionId: ligaId,
              competitionName: ligaNome,
              scorers: teamScorers,
              totalGoals,
              totalMatches: leagueMatches.length
            });
          }
        });
      }

      return competitionScorers.sort((a, b) => b.totalMatches - a.totalMatches);
    }
  });
}
