import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Partida {
  id: string;
  data: string;
  hora: string | null;
  gols_casa: number | null;
  gols_fora: number | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | null;
  rodada: number | null;
  liga: {
    id: string;
    nome: string;
    logo_url: string | null;
    codigo_api: string | null;
  } | null;
  time_casa: {
    id: string;
    nome: string;
    escudo_url: string | null;
  } | null;
  time_fora: {
    id: string;
    nome: string;
    escudo_url: string | null;
  } | null;
}

interface Liga {
  id: string;
  nome: string;
  pais: string | null;
  logo_url: string | null;
  codigo_api: string | null;
  ativa: boolean | null;
}

interface Standing {
  position: number;
  team: string;
  teamLogo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// Format time for display
const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '--:--';
  return timeStr.substring(0, 5);
};

// Transform database match to UI format
const transformMatch = (match: Partida) => ({
  id: match.id,
  homeTeam: {
    name: match.time_casa?.nome || 'TBD',
    logo: match.time_casa?.escudo_url || '/placeholder.svg',
    score: match.gols_casa,
  },
  awayTeam: {
    name: match.time_fora?.nome || 'TBD',
    logo: match.time_fora?.escudo_url || '/placeholder.svg',
    score: match.gols_fora,
  },
  date: formatDate(match.data),
  time: formatTime(match.hora),
  league: match.liga?.nome || 'Unknown',
  leagueCode: match.liga?.codigo_api,
  status: match.status || 'scheduled',
  matchday: match.rodada,
  rawDate: match.data,
});

// Hook to fetch leagues from database
export function useLeagues() {
  return useQuery({
    queryKey: ['db-leagues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ligas')
        .select('*')
        .eq('ativa', true)
        .order('nome');

      if (error) throw error;
      return data as Liga[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook to fetch matches from database
export function useMatchesFromDB(options?: {
  leagueCode?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['db-matches', options],
    queryFn: async () => {
      let query = supabase
        .from('partidas')
        .select(`
          id,
          data,
          hora,
          gols_casa,
          gols_fora,
          status,
          rodada,
          liga:ligas!partidas_liga_id_fkey(id, nome, logo_url, codigo_api),
          time_casa:times!partidas_time_casa_id_fkey(id, nome, escudo_url),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, escudo_url)
        `)
        .order('data', { ascending: true })
        .order('hora', { ascending: true });

      if (options?.leagueCode) {
        const { data: league } = await supabase
          .from('ligas')
          .select('id')
          .eq('codigo_api', options.leagueCode)
          .maybeSingle();
        
        if (league) {
          query = query.eq('liga_id', league.id);
        }
      }

      if (options?.dateFrom) {
        query = query.gte('data', options.dateFrom);
      }

      if (options?.dateTo) {
        query = query.lte('data', options.dateTo);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data as unknown as Partida[]).map(transformMatch);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to fetch today's matches from database
export function useTodayMatchesFromDB() {
  const today = new Date().toISOString().split('T')[0];
  return useMatchesFromDB({ dateFrom: today, dateTo: today });
}

// Hook to fetch upcoming matches from database
export function useUpcomingMatchesFromDB(days: number = 7) {
  const today = new Date();
  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = new Date(today);
  dateTo.setDate(dateTo.getDate() + days);
  
  return useMatchesFromDB({ 
    dateFrom, 
    dateTo: dateTo.toISOString().split('T')[0],
    status: 'scheduled'
  });
}

// Hook to fetch recent results from database
export function useRecentResultsFromDB(days: number = 3) {
  const today = new Date();
  const dateTo = today.toISOString().split('T')[0];
  const dateFrom = new Date(today);
  dateFrom.setDate(dateFrom.getDate() - days);
  
  return useMatchesFromDB({ 
    dateFrom: dateFrom.toISOString().split('T')[0], 
    dateTo,
    status: 'finished'
  });
}

// Hook to fetch live matches from database
export function useLiveMatchesFromDB() {
  return useQuery({
    queryKey: ['db-live-matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidas')
        .select(`
          id,
          data,
          hora,
          gols_casa,
          gols_fora,
          status,
          rodada,
          liga:ligas!partidas_liga_id_fkey(id, nome, logo_url, codigo_api),
          time_casa:times!partidas_time_casa_id_fkey(id, nome, escudo_url),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, escudo_url)
        `)
        .eq('status', 'live');

      if (error) throw error;
      
      return (data as unknown as Partida[]).map(transformMatch);
    },
    staleTime: 1000 * 30, // 30 seconds for live data
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

// Hook to trigger manual sync
export function useSyncFootballData() {
  return useQuery({
    queryKey: ['sync-football-data'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-football-data');
      
      if (error) throw error;
      return data;
    },
    enabled: false, // Only run when manually triggered
  });
}

// Hook to get match count by league
export function useMatchCountByLeague() {
  return useQuery({
    queryKey: ['db-match-count-by-league'],
    queryFn: async () => {
      const today = new Date();
      const dateFrom = new Date(today);
      dateFrom.setDate(dateFrom.getDate() - 3);
      const dateTo = new Date(today);
      dateTo.setDate(dateTo.getDate() + 7);

      const { data, error } = await supabase
        .from('partidas')
        .select(`
          liga:ligas!partidas_liga_id_fkey(codigo_api)
        `)
        .gte('data', dateFrom.toISOString().split('T')[0])
        .lte('data', dateTo.toISOString().split('T')[0]);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((match: { liga: { codigo_api: string | null } | null }) => {
        const code = match.liga?.codigo_api;
        if (code) {
          counts[code] = (counts[code] || 0) + 1;
        }
      });
      
      return counts;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
