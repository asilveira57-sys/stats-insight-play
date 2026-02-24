import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

interface PlayerScorer {
  playerName: string;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  teamPrimaryColor: string | null;
  teamSecondaryColor: string | null;
  goals: number;
  matches: number;
}

interface CompetitionScorers {
  competitionId: string;
  competitionName: string;
  competitionYear?: string;
  scorers: PlayerScorer[];
  totalGoals: number;
  totalMatches: number;
}

interface UseTopScorersOptions {
  selectedCompetition?: string;
  selectedYear?: string;
}

export function useTopScorers(options: UseTopScorersOptions = {}) {
  const { selectedCompetition, selectedYear } = options;

  return useQuery({
    queryKey: ['top-scorers', selectedCompetition, selectedYear],
    queryFn: async (): Promise<CompetitionScorers[]> => {
      // Fetch all leagues
      const { data: leagues, error: leaguesError } = await supabase
        .from('ligas')
        .select('id, nome, logo_url');

      if (leaguesError) throw leaguesError;
      if (!leagues || leagues.length === 0) return [];

      const leagueIds = selectedCompetition 
        ? [selectedCompetition]
        : leagues.map(l => l.id);

      // Build date filter for year
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (selectedYear) {
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      }

      // Fetch ALL goals from gols_partida table without limit using pagination
      const goals = await fetchAllRecords<{
        id: string;
        jogador_nome: string;
        minuto: number;
        partida_id: string;
        time_id: string | null;
        partidas: {
          id: string;
          liga_id: string | null;
          data: string;
          ligas: { id: string; nome: string } | null;
        } | null;
        times: { id: string; nome: string; escudo_url: string | null; cores: any } | null;
      }>(
        'gols_partida',
        `id, jogador_nome, minuto, partida_id, time_id,
          partidas (id, liga_id, data, ligas (id, nome)),
          times (id, nome, escudo_url, cores)`,
        (query) => query.not('jogador_nome', 'is', null)
      );

      // Filter goals by leagues and year
      const filteredGoals = goals?.filter(goal => {
        const partida = goal.partidas as any;
        const ligaId = partida?.liga_id;
        
        // Filter by league
        if (!leagueIds.includes(ligaId)) return false;
        
        // Filter by year if specified
        if (selectedYear && partida?.data) {
          const matchYear = new Date(partida.data).getFullYear().toString();
          if (matchYear !== selectedYear) return false;
        }
        
        return true;
      }) || [];

      // Group by competition and year
      const competitionMap = new Map<string, {
        name: string;
        years: Set<string>;
        goals: typeof filteredGoals;
      }>();

      filteredGoals.forEach(goal => {
        const ligaId = (goal.partidas as any)?.liga_id;
        const ligaNome = (goal.partidas as any)?.ligas?.nome || 'Unknown';
        const matchDate = (goal.partidas as any)?.data;
        const year = matchDate ? new Date(matchDate).getFullYear().toString() : '';
        
        if (!competitionMap.has(ligaId)) {
          competitionMap.set(ligaId, { name: ligaNome, years: new Set(), goals: [] });
        }
        const entry = competitionMap.get(ligaId)!;
        entry.goals.push(goal);
        if (year) entry.years.add(year);
      });

      // Calculate scorers per competition
      const competitionScorers: CompetitionScorers[] = [];

      competitionMap.forEach((data, competitionId) => {
        const playerGoalsMap = new Map<string, {
          teamId: string;
          teamName: string;
          teamLogo: string | null;
          teamPrimaryColor: string | null;
          teamSecondaryColor: string | null;
          goals: number;
          matchIds: Set<string>;
        }>();

        data.goals.forEach(goal => {
          const playerName = goal.jogador_nome;
          const team = goal.times as any;
          const cores = team?.cores || {};
          
          if (!playerGoalsMap.has(playerName)) {
            playerGoalsMap.set(playerName, {
              teamId: team?.id || '',
              teamName: team?.nome || 'Unknown',
              teamLogo: team?.escudo_url || null,
              teamPrimaryColor: cores.primary || null,
              teamSecondaryColor: cores.secondary || null,
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
            teamPrimaryColor: stats.teamPrimaryColor,
            teamSecondaryColor: stats.teamSecondaryColor,
            goals: stats.goals,
            matches: stats.matchIds.size
          }))
          .sort((a, b) => b.goals - a.goals);

        const uniqueMatches = new Set(data.goals.map(g => g.partida_id)).size;

        // Get years sorted descending
        const yearsArray = Array.from(data.years).sort((a, b) => Number(b) - Number(a));
        const competitionYear = yearsArray.length > 0 ? yearsArray[0] : undefined;

        competitionScorers.push({
          competitionId,
          competitionName: data.name,
          competitionYear,
          scorers,
          totalGoals: data.goals.length,
          totalMatches: uniqueMatches
        });
      });

      // Fallback: get team-level stats for competitions without individual goals - sem limite
      const matches = await fetchAllRecords<any>(
        'partidas',
        `id, liga_id, data, time_casa_id, time_fora_id, gols_casa, gols_fora,
          ligas (id, nome),
          time_casa:times!partidas_time_casa_id_fkey (id, nome, escudo_url, cores),
          time_fora:times!partidas_time_fora_id_fkey (id, nome, escudo_url, cores)`,
        (q) => {
          let filtered = q.in('liga_id', leagueIds).eq('status', 'finished').not('gols_casa', 'is', null).not('gols_fora', 'is', null);
          if (startDate && endDate) {
            filtered = filtered.gte('data', startDate).lte('data', endDate);
          }
          return filtered;
        }
      );

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
            
            const teamGoals = new Map<string, { name: string; logo: string | null; primaryColor: string | null; secondaryColor: string | null; goals: number; matches: number }>();
            
            leagueMatches.forEach(match => {
              const homeTeam = match.time_casa as any;
              const awayTeam = match.time_fora as any;
              
              if (homeTeam?.id) {
                if (!teamGoals.has(homeTeam.id)) {
                  const cores = homeTeam.cores || {};
                  teamGoals.set(homeTeam.id, { name: homeTeam.nome, logo: homeTeam.escudo_url, primaryColor: cores.primary || null, secondaryColor: cores.secondary || null, goals: 0, matches: 0 });
                }
                teamGoals.get(homeTeam.id)!.goals += match.gols_casa || 0;
                teamGoals.get(homeTeam.id)!.matches += 1;
              }
              
              if (awayTeam?.id) {
                if (!teamGoals.has(awayTeam.id)) {
                  const cores = awayTeam.cores || {};
                  teamGoals.set(awayTeam.id, { name: awayTeam.nome, logo: awayTeam.escudo_url, primaryColor: cores.primary || null, secondaryColor: cores.secondary || null, goals: 0, matches: 0 });
                }
                teamGoals.get(awayTeam.id)!.goals += match.gols_fora || 0;
                teamGoals.get(awayTeam.id)!.matches += 1;
              }
            });

            const teamScorers: PlayerScorer[] = Array.from(teamGoals.entries())
              .map(([teamId, stats]) => ({
                playerName: `${stats.name} (Time)`,
                teamId,
                teamName: stats.name,
                teamLogo: stats.logo,
                teamPrimaryColor: stats.primaryColor,
                teamSecondaryColor: stats.secondaryColor,
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
