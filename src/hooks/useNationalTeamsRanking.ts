import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

export interface TeamRankingData {
  id: string;
  nome: string;
  escudo_url: string | null;
  cores: { primary?: string; secondary?: string } | null;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_marcados: number;
  gols_sofridos: number;
  saldo_gols: number;
  aproveitamento: number;
  pontos: number;
  competicoes: string[];
}

export interface CompetitionFilter {
  id: string;
  nome: string;
}

export const useNationalTeamsRanking = (competitionFilter?: string) => {
  return useQuery({
    queryKey: ['national-teams-ranking', competitionFilter],
    queryFn: async () => {
      // First, get all international competitions
      const { data: ligas, error: ligasError } = await supabase
        .from('ligas')
        .select('id, nome')
        .or('nome.ilike.%world%,nome.ilike.%copa america%,nome.ilike.%euro%,nome.ilike.%nations%');

      if (ligasError) throw ligasError;

      const ligaIds = ligas?.map(l => l.id) || [];
      
      if (ligaIds.length === 0) {
        return [];
      }

      // Fetch ALL matches without limit using pagination
      const matches = await fetchAllRecords<{
        id: string;
        gols_casa: number | null;
        gols_fora: number | null;
        time_casa_id: string | null;
        time_fora_id: string | null;
        liga_id: string | null;
        ligas: { nome: string } | null;
      }>(
        'partidas',
        `id, gols_casa, gols_fora, time_casa_id, time_fora_id, liga_id, ligas!inner(nome)`,
        (query) => {
          let q = query
            .eq('status', 'finished')
            .not('gols_casa', 'is', null)
            .not('gols_fora', 'is', null)
            .in('liga_id', ligaIds);
          
          if (competitionFilter && competitionFilter !== 'all') {
            q = q.eq('liga_id', competitionFilter);
          }
          return q;
        }
      );

      // Get all unique team IDs
      const teamIds = new Set<string>();
      matches?.forEach(m => {
        if (m.time_casa_id) teamIds.add(m.time_casa_id);
        if (m.time_fora_id) teamIds.add(m.time_fora_id);
      });

      // Fetch team details in chunks (avoids URL length limits with many IDs)
      const idList = Array.from(teamIds);
      const chunkSize = 150;
      const teams: { id: string; nome: string; escudo_url: string | null; cores: unknown }[] = [];

      for (let i = 0; i < idList.length; i += chunkSize) {
        const chunk = idList.slice(i, i + chunkSize);
        const { data, error: teamsError } = await supabase
          .from('times')
          .select('id, nome, escudo_url, cores')
          .in('id', chunk);

        if (teamsError) throw teamsError;
        if (data) teams.push(...data);
      }

      // Build ranking map
      const rankingMap = new Map<string, {
        id: string;
        nome: string;
        escudo_url: string | null;
        cores: { primary?: string; secondary?: string } | null;
        jogos: number;
        vitorias: number;
        empates: number;
        derrotas: number;
        gols_marcados: number;
        gols_sofridos: number;
        competicoes: Set<string>;
      }>();

      // Initialize teams
      teams?.forEach(team => {
        rankingMap.set(team.id, {
          id: team.id,
          nome: team.nome,
          escudo_url: team.escudo_url,
          cores: team.cores as { primary?: string; secondary?: string } | null,
          jogos: 0,
          vitorias: 0,
          empates: 0,
          derrotas: 0,
          gols_marcados: 0,
          gols_sofridos: 0,
          competicoes: new Set<string>()
        });
      });

      // Process matches
      matches?.forEach(match => {
        const homeTeam = rankingMap.get(match.time_casa_id!);
        const awayTeam = rankingMap.get(match.time_fora_id!);
        const ligaNome = (match.ligas as any)?.nome || '';

        if (homeTeam && match.gols_casa !== null && match.gols_fora !== null) {
          homeTeam.jogos++;
          homeTeam.gols_marcados += match.gols_casa;
          homeTeam.gols_sofridos += match.gols_fora;
          homeTeam.competicoes.add(ligaNome);

          if (match.gols_casa > match.gols_fora) {
            homeTeam.vitorias++;
          } else if (match.gols_casa < match.gols_fora) {
            homeTeam.derrotas++;
          } else {
            homeTeam.empates++;
          }
        }

        if (awayTeam && match.gols_casa !== null && match.gols_fora !== null) {
          awayTeam.jogos++;
          awayTeam.gols_marcados += match.gols_fora;
          awayTeam.gols_sofridos += match.gols_casa;
          awayTeam.competicoes.add(ligaNome);

          if (match.gols_fora > match.gols_casa) {
            awayTeam.vitorias++;
          } else if (match.gols_fora < match.gols_casa) {
            awayTeam.derrotas++;
          } else {
            awayTeam.empates++;
          }
        }
      });

      // Convert to array and calculate derived stats
      const ranking: TeamRankingData[] = Array.from(rankingMap.values())
        .filter(team => team.jogos > 0)
        .map(team => ({
          ...team,
          saldo_gols: team.gols_marcados - team.gols_sofridos,
          aproveitamento: team.jogos > 0 
            ? Math.round((team.vitorias * 3 + team.empates) / (team.jogos * 3) * 100) 
            : 0,
          pontos: team.vitorias * 3 + team.empates,
          competicoes: Array.from(team.competicoes)
        }))
        .sort((a, b) => {
          // Sort by points, then goal difference, then goals scored
          if (b.pontos !== a.pontos) return b.pontos - a.pontos;
          if (b.saldo_gols !== a.saldo_gols) return b.saldo_gols - a.saldo_gols;
          return b.gols_marcados - a.gols_marcados;
        });

      return ranking;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useInternationalCompetitions = () => {
  return useQuery({
    queryKey: ['international-competitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ligas')
        .select('id, nome')
        .or('nome.ilike.%world%,nome.ilike.%copa america%,nome.ilike.%euro%,nome.ilike.%nations%')
        .order('nome');

      if (error) throw error;
      return data as CompetitionFilter[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};
