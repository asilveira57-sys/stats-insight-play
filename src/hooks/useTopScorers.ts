import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TeamScorer {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  goalsScored: number;
  goalsConceded: number;
  matches: number;
  avgGoalsPerMatch: number;
}

interface CompetitionStats {
  competitionId: string;
  competitionName: string;
  teams: TeamScorer[];
  totalGoals: number;
  totalMatches: number;
  avgGoalsPerMatch: number;
}

const INTERNATIONAL_KEYWORDS = [
  'world cup', 'copa do mundo', 'copa america', 'copa américa',
  'euro', 'eurocopa', 'nations league', 'liga das nações'
];

export function useTopScorers(selectedCompetition?: string) {
  return useQuery({
    queryKey: ['top-scorers', selectedCompetition],
    queryFn: async (): Promise<CompetitionStats[]> => {
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

      // Fetch finished matches for these leagues
      const { data: matches, error: matchesError } = await supabase
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

      if (matchesError) throw matchesError;
      if (!matches || matches.length === 0) return [];

      // Group by competition
      const competitionMap = new Map<string, {
        name: string;
        matches: typeof matches;
      }>();

      matches.forEach(match => {
        const ligaId = match.liga_id!;
        const ligaNome = (match.ligas as any)?.nome || 'Unknown';
        
        if (!competitionMap.has(ligaId)) {
          competitionMap.set(ligaId, { name: ligaNome, matches: [] });
        }
        competitionMap.get(ligaId)!.matches.push(match);
      });

      // Calculate stats per competition
      const competitionStats: CompetitionStats[] = [];

      competitionMap.forEach((data, competitionId) => {
        const teamStatsMap = new Map<string, {
          name: string;
          logo: string | null;
          goalsScored: number;
          goalsConceded: number;
          matches: number;
        }>();

        let totalGoals = 0;

        data.matches.forEach(match => {
          const hometeam = match.time_casa as any;
          const awayTeam = match.time_fora as any;
          const homeGoals = match.gols_casa || 0;
          const awayGoals = match.gols_fora || 0;

          totalGoals += homeGoals + awayGoals;

          // Home team stats
          if (hometeam?.id) {
            if (!teamStatsMap.has(hometeam.id)) {
              teamStatsMap.set(hometeam.id, {
                name: hometeam.nome,
                logo: hometeam.escudo_url,
                goalsScored: 0,
                goalsConceded: 0,
                matches: 0
              });
            }
            const stats = teamStatsMap.get(hometeam.id)!;
            stats.goalsScored += homeGoals;
            stats.goalsConceded += awayGoals;
            stats.matches += 1;
          }

          // Away team stats
          if (awayTeam?.id) {
            if (!teamStatsMap.has(awayTeam.id)) {
              teamStatsMap.set(awayTeam.id, {
                name: awayTeam.nome,
                logo: awayTeam.escudo_url,
                goalsScored: 0,
                goalsConceded: 0,
                matches: 0
              });
            }
            const stats = teamStatsMap.get(awayTeam.id)!;
            stats.goalsScored += awayGoals;
            stats.goalsConceded += homeGoals;
            stats.matches += 1;
          }
        });

        const teams: TeamScorer[] = Array.from(teamStatsMap.entries())
          .map(([teamId, stats]) => ({
            teamId,
            teamName: stats.name,
            teamLogo: stats.logo,
            goalsScored: stats.goalsScored,
            goalsConceded: stats.goalsConceded,
            matches: stats.matches,
            avgGoalsPerMatch: stats.matches > 0 ? stats.goalsScored / stats.matches : 0
          }))
          .sort((a, b) => b.goalsScored - a.goalsScored);

        competitionStats.push({
          competitionId,
          competitionName: data.name,
          teams,
          totalGoals,
          totalMatches: data.matches.length,
          avgGoalsPerMatch: data.matches.length > 0 ? totalGoals / data.matches.length : 0
        });
      });

      return competitionStats.sort((a, b) => b.totalMatches - a.totalMatches);
    }
  });
}
