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

// Format date for display (using Brazilian timezone)
const formatDate = (dateStr: string): string => {
  // Parse the date as local date (YYYY-MM-DD format from database)
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// Format time for display (convert UTC to Brazilian time, UTC-3)
const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '--:--';
  // Parse UTC time and subtract 3 hours for Brazil timezone
  const [hours, minutes] = timeStr.split(':').map(Number);
  const brazilHours = (hours - 3 + 24) % 24;
  return `${brazilHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Transform database match to UI format
const transformMatch = (match: Partida) => ({
  id: match.id,
  homeTeamId: match.time_casa?.id,
  awayTeamId: match.time_fora?.id,
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

// Priority order for leagues (Brazilian first, then South American, then European)
const LEAGUE_PRIORITY: Record<string, number> = {
  'BSA': 1,  // Campeonato Brasileiro Série A
  'BSB': 2,  // Campeonato Brasileiro Série B
  'CLI': 3,  // Copa Libertadores
  'CSA': 4,  // Copa Sudamericana
  'CL': 5,   // UEFA Champions League
  'PL': 6,   // Premier League
  'PD': 7,   // La Liga
  'SA': 8,   // Serie A (Italy)
  'BL1': 9,  // Bundesliga
  'FL1': 10, // Ligue 1
};

function getLeaguePriority(codigoApi: string | null): number {
  if (!codigoApi) return 100;
  return LEAGUE_PRIORITY[codigoApi] ?? 50;
}

// Hook to fetch leagues from database (sorted with Brazilian first)
export function useLeagues() {
  return useQuery({
    queryKey: ['db-leagues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ligas')
        .select('*')
        .eq('ativa', true);

      if (error) throw error;
      
      // Sort by priority (Brazilian leagues first)
      const sorted = (data as Liga[]).sort((a, b) => {
        return getLeaguePriority(a.codigo_api) - getLeaguePriority(b.codigo_api);
      });
      
      return sorted;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook to fetch matches from database with auto-refresh for live matches
export function useMatchesFromDB(options?: {
  leagueCode?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
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
    staleTime: 1000 * 30, // 30 seconds - refresh more often for live scores
    refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds for live updates
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

// Hook to fetch live matches from database with real-time updates
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
    staleTime: 1000 * 10, // 10 seconds for live data
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
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

// Hook to get match count by league (today only)
export function useMatchCountByLeague() {
  return useQuery({
    queryKey: ['db-match-count-by-league-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('partidas')
        .select(`
          liga:ligas!partidas_liga_id_fkey(codigo_api)
        `)
        .eq('data', today);

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
