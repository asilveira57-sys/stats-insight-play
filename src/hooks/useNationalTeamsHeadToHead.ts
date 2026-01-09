import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NationalTeam {
  id: string;
  nome: string;
  escudo_url: string | null;
  cores: { primary?: string; secondary?: string } | null;
}

export interface HeadToHeadMatch {
  id: string;
  data: string;
  golsCasa: number;
  golsFora: number;
  time1EmCasa: boolean;
  competicao: string;
}

export interface HeadToHeadStats {
  totalJogos: number;
  vitoriasTime1: number;
  vitoriasTime2: number;
  empates: number;
  golsTime1: number;
  golsTime2: number;
  partidas: HeadToHeadMatch[];
  // Advanced stats
  mediaGolsPorJogo: number;
  mediaGolsTime1: number;
  mediaGolsTime2: number;
  maiorSequenciaTime1: number;
  maiorSequenciaTime2: number;
  sequenciaAtualTime1: number;
  sequenciaAtualTime2: number;
  sequenciaInvictoTime1: number;
  sequenciaInvictoTime2: number;
  maiorVitoriaTime1: { gols: number; placar: string; data: string } | null;
  maiorVitoriaTime2: { gols: number; placar: string; data: string } | null;
  jogoMaisGols: { total: number; placar: string; data: string } | null;
}

const INTERNATIONAL_KEYWORDS = [
  'world cup', 'copa do mundo', 'copa america', 'copa américa',
  'euro', 'eurocopa', 'nations league', 'liga das nações'
];

export function useNationalTeamsList() {
  return useQuery({
    queryKey: ['national-teams-list'],
    queryFn: async (): Promise<NationalTeam[]> => {
      // Get international leagues
      const { data: ligas, error: ligasError } = await supabase
        .from('ligas')
        .select('id, nome')
        .or('nome.ilike.%world%,nome.ilike.%copa america%,nome.ilike.%euro%,nome.ilike.%nations%');

      if (ligasError) throw ligasError;
      
      const ligaIds = ligas?.map(l => l.id) || [];
      if (ligaIds.length === 0) return [];

      // Get matches from international leagues
      const { data: matches, error: matchesError } = await supabase
        .from('partidas')
        .select('time_casa_id, time_fora_id')
        .in('liga_id', ligaIds);

      if (matchesError) throw matchesError;

      // Get unique team IDs
      const teamIds = new Set<string>();
      matches?.forEach(m => {
        if (m.time_casa_id) teamIds.add(m.time_casa_id);
        if (m.time_fora_id) teamIds.add(m.time_fora_id);
      });

      if (teamIds.size === 0) return [];

      // Fetch team details
      const { data: teams, error: teamsError } = await supabase
        .from('times')
        .select('id, nome, escudo_url, cores')
        .in('id', Array.from(teamIds))
        .order('nome');

      if (teamsError) throw teamsError;

      return (teams || []).map(team => ({
        ...team,
        cores: team.cores as { primary?: string; secondary?: string } | null
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useNationalTeamsHeadToHead(team1Id: string | null, team2Id: string | null) {
  return useQuery({
    queryKey: ['national-teams-h2h', team1Id, team2Id],
    queryFn: async (): Promise<HeadToHeadStats | null> => {
      if (!team1Id || !team2Id) return null;

      // Get international leagues
      const { data: ligas, error: ligasError } = await supabase
        .from('ligas')
        .select('id, nome');

      if (ligasError) throw ligasError;

      const internationalLeagueMap = new Map<string, string>();
      ligas?.forEach(liga => {
        if (INTERNATIONAL_KEYWORDS.some(kw => liga.nome.toLowerCase().includes(kw))) {
          internationalLeagueMap.set(liga.id, liga.nome);
        }
      });

      const ligaIds = Array.from(internationalLeagueMap.keys());
      if (ligaIds.length === 0) return null;

      // Fetch head-to-head matches
      const { data: matches, error } = await supabase
        .from('partidas')
        .select('id, data, gols_casa, gols_fora, time_casa_id, time_fora_id, liga_id')
        .eq('status', 'finished')
        .not('gols_casa', 'is', null)
        .not('gols_fora', 'is', null)
        .in('liga_id', ligaIds)
        .or(`and(time_casa_id.eq.${team1Id},time_fora_id.eq.${team2Id}),and(time_casa_id.eq.${team2Id},time_fora_id.eq.${team1Id})`)
        .order('data', { ascending: false });

      if (error) throw error;

      let vitoriasTime1 = 0;
      let vitoriasTime2 = 0;
      let empates = 0;
      let golsTime1 = 0;
      let golsTime2 = 0;

      // For sequence calculations
      let maiorSequenciaTime1 = 0;
      let maiorSequenciaTime2 = 0;
      let currentSequenciaTime1 = 0;
      let currentSequenciaTime2 = 0;
      let sequenciaInvictoTime1 = 0;
      let sequenciaInvictoTime2 = 0;
      let currentInvictoTime1 = 0;
      let currentInvictoTime2 = 0;

      // For biggest victories
      let maiorVitoriaTime1: { gols: number; placar: string; data: string } | null = null;
      let maiorVitoriaTime2: { gols: number; placar: string; data: string } | null = null;
      let jogoMaisGols: { total: number; placar: string; data: string } | null = null;

      const partidas: HeadToHeadMatch[] = (matches || []).map(match => {
        const time1EmCasa = match.time_casa_id === team1Id;
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;
        
        const golsT1 = time1EmCasa ? golsCasa : golsFora;
        const golsT2 = time1EmCasa ? golsFora : golsCasa;
        const totalGols = golsCasa + golsFora;
        const diffGols = Math.abs(golsT1 - golsT2);
        const placar = time1EmCasa ? `${golsCasa}-${golsFora}` : `${golsFora}-${golsCasa}`;

        golsTime1 += golsT1;
        golsTime2 += golsT2;

        // Track most goals in a match
        if (!jogoMaisGols || totalGols > jogoMaisGols.total) {
          jogoMaisGols = { total: totalGols, placar: `${golsCasa}-${golsFora}`, data: match.data };
        }

        if (golsT1 > golsT2) {
          vitoriasTime1++;
          currentSequenciaTime1++;
          currentSequenciaTime2 = 0;
          currentInvictoTime1++;
          currentInvictoTime2 = 0;
          
          if (currentSequenciaTime1 > maiorSequenciaTime1) {
            maiorSequenciaTime1 = currentSequenciaTime1;
          }
          if (currentInvictoTime1 > sequenciaInvictoTime1) {
            sequenciaInvictoTime1 = currentInvictoTime1;
          }
          
          if (!maiorVitoriaTime1 || diffGols > maiorVitoriaTime1.gols) {
            maiorVitoriaTime1 = { gols: diffGols, placar, data: match.data };
          }
        } else if (golsT2 > golsT1) {
          vitoriasTime2++;
          currentSequenciaTime2++;
          currentSequenciaTime1 = 0;
          currentInvictoTime2++;
          currentInvictoTime1 = 0;
          
          if (currentSequenciaTime2 > maiorSequenciaTime2) {
            maiorSequenciaTime2 = currentSequenciaTime2;
          }
          if (currentInvictoTime2 > sequenciaInvictoTime2) {
            sequenciaInvictoTime2 = currentInvictoTime2;
          }
          
          if (!maiorVitoriaTime2 || diffGols > maiorVitoriaTime2.gols) {
            maiorVitoriaTime2 = { gols: diffGols, placar, data: match.data };
          }
        } else {
          empates++;
          currentSequenciaTime1 = 0;
          currentSequenciaTime2 = 0;
          currentInvictoTime1++;
          currentInvictoTime2++;
          
          if (currentInvictoTime1 > sequenciaInvictoTime1) {
            sequenciaInvictoTime1 = currentInvictoTime1;
          }
          if (currentInvictoTime2 > sequenciaInvictoTime2) {
            sequenciaInvictoTime2 = currentInvictoTime2;
          }
        }

        return {
          id: match.id,
          data: match.data,
          golsCasa,
          golsFora,
          time1EmCasa,
          competicao: internationalLeagueMap.get(match.liga_id!) || 'Desconhecida',
        };
      });

      const totalJogos = matches?.length || 0;
      const totalGols = golsTime1 + golsTime2;

      return {
        totalJogos,
        vitoriasTime1,
        vitoriasTime2,
        empates,
        golsTime1,
        golsTime2,
        partidas,
        mediaGolsPorJogo: totalJogos > 0 ? totalGols / totalJogos : 0,
        mediaGolsTime1: totalJogos > 0 ? golsTime1 / totalJogos : 0,
        mediaGolsTime2: totalJogos > 0 ? golsTime2 / totalJogos : 0,
        maiorSequenciaTime1,
        maiorSequenciaTime2,
        sequenciaAtualTime1: currentSequenciaTime1,
        sequenciaAtualTime2: currentSequenciaTime2,
        sequenciaInvictoTime1,
        sequenciaInvictoTime2,
        maiorVitoriaTime1,
        maiorVitoriaTime2,
        jogoMaisGols,
      };
    },
    enabled: !!team1Id && !!team2Id,
  });
}
