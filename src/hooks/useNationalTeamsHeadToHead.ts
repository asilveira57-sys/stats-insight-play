import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NationalTeam {
  id: string;
  nome: string;
  escudo_url: string | null;
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
        .select('id, nome, escudo_url')
        .in('id', Array.from(teamIds))
        .order('nome');

      if (teamsError) throw teamsError;

      return teams || [];
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

      const partidas: HeadToHeadMatch[] = (matches || []).map(match => {
        const time1EmCasa = match.time_casa_id === team1Id;
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;

        if (time1EmCasa) {
          golsTime1 += golsCasa;
          golsTime2 += golsFora;
          if (golsCasa > golsFora) vitoriasTime1++;
          else if (golsCasa < golsFora) vitoriasTime2++;
          else empates++;
        } else {
          golsTime1 += golsFora;
          golsTime2 += golsCasa;
          if (golsFora > golsCasa) vitoriasTime1++;
          else if (golsFora < golsCasa) vitoriasTime2++;
          else empates++;
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

      return {
        totalJogos: matches?.length || 0,
        vitoriasTime1,
        vitoriasTime2,
        empates,
        golsTime1,
        golsTime2,
        partidas,
      };
    },
    enabled: !!team1Id && !!team2Id,
  });
}
