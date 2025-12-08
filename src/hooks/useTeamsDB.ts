import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Time {
  id: string;
  nome: string;
  escudo_url: string | null;
  pais: string | null;
  api_id: number | null;
}

export interface TeamStats {
  id: string;
  nome: string;
  escudo_url: string | null;
  pais: string | null;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
  jogosCasa: number;
  vitoriasCasa: number;
  empatesCasa: number;
  derrotasCasa: number;
  golsMarcadosCasa: number;
  golsSofridosCasa: number;
  jogosFora: number;
  vitoriasFora: number;
  empatesFora: number;
  derrotasFora: number;
  golsMarcadosFora: number;
  golsSofridosFora: number;
  forma: string[];
  liga?: string;
  ligaLogo?: string;
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('times')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Time[];
    },
  });
}

export function useTeamStats(teamId: string | null) {
  return useQuery({
    queryKey: ['team-stats', teamId],
    queryFn: async () => {
      if (!teamId) return null;

      // Buscar dados do time
      const { data: team, error: teamError } = await supabase
        .from('times')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      // Buscar partidas do time (casa e fora) finalizadas
      const { data: homeMatches, error: homeError } = await supabase
        .from('partidas')
        .select(`
          *,
          liga:ligas(nome, logo_url)
        `)
        .eq('time_casa_id', teamId)
        .eq('status', 'finished')
        .order('data', { ascending: false });

      if (homeError) throw homeError;

      const { data: awayMatches, error: awayError } = await supabase
        .from('partidas')
        .select(`
          *,
          liga:ligas(nome, logo_url)
        `)
        .eq('time_fora_id', teamId)
        .eq('status', 'finished')
        .order('data', { ascending: false });

      if (awayError) throw awayError;

      // Calcular estatísticas em casa
      let vitoriasCasa = 0, empatesCasa = 0, derrotasCasa = 0;
      let golsMarcadosCasa = 0, golsSofridosCasa = 0;

      homeMatches?.forEach(match => {
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;
        golsMarcadosCasa += golsCasa;
        golsSofridosCasa += golsFora;
        
        if (golsCasa > golsFora) vitoriasCasa++;
        else if (golsCasa === golsFora) empatesCasa++;
        else derrotasCasa++;
      });

      // Calcular estatísticas fora
      let vitoriasFora = 0, empatesFora = 0, derrotasFora = 0;
      let golsMarcadosFora = 0, golsSofridosFora = 0;

      awayMatches?.forEach(match => {
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;
        golsMarcadosFora += golsFora;
        golsSofridosFora += golsCasa;
        
        if (golsFora > golsCasa) vitoriasFora++;
        else if (golsFora === golsCasa) empatesFora++;
        else derrotasFora++;
      });

      // Combinar todas as partidas e ordenar por data para pegar as últimas 5
      const allMatches = [...(homeMatches || []), ...(awayMatches || [])]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      // Calcular forma (últimas 5 partidas)
      const forma = allMatches.slice(0, 5).map(match => {
        const isHome = match.time_casa_id === teamId;
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;
        
      if (isHome) {
        if (golsCasa > golsFora) return 'V';
        if (golsCasa === golsFora) return 'E';
        return 'D';
      } else {
        if (golsFora > golsCasa) return 'V';
        if (golsFora === golsCasa) return 'E';
        return 'D';
      }
      });

      // Pegar liga da última partida
      const lastMatch = allMatches[0];
      const liga = lastMatch?.liga?.nome || '';
      const ligaLogo = lastMatch?.liga?.logo_url || '';

      const stats: TeamStats = {
        id: team.id,
        nome: team.nome,
        escudo_url: team.escudo_url,
        pais: team.pais,
        jogos: (homeMatches?.length || 0) + (awayMatches?.length || 0),
        vitorias: vitoriasCasa + vitoriasFora,
        empates: empatesCasa + empatesFora,
        derrotas: derrotasCasa + derrotasFora,
        golsMarcados: golsMarcadosCasa + golsMarcadosFora,
        golsSofridos: golsSofridosCasa + golsSofridosFora,
        jogosCasa: homeMatches?.length || 0,
        vitoriasCasa,
        empatesCasa,
        derrotasCasa,
        golsMarcadosCasa,
        golsSofridosCasa,
        jogosFora: awayMatches?.length || 0,
        vitoriasFora,
        empatesFora,
        derrotasFora,
        golsMarcadosFora,
        golsSofridosFora,
        forma,
        liga,
        ligaLogo,
      };

      return stats;
    },
    enabled: !!teamId,
  });
}

export function useTeamSearch(searchTerm: string) {
  return useQuery({
    queryKey: ['team-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('times')
        .select('*')
        .ilike('nome', `%${searchTerm}%`)
        .limit(10);
      
      if (error) throw error;
      return data as Time[];
    },
    enabled: searchTerm.length >= 2,
  });
}
