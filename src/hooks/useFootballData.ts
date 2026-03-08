import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface Competition {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string;
}

interface Match {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  matchday: number;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  competition: Competition;
}

interface Standing {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface StandingsTable {
  stage: string;
  type: string;
  table: Standing[];
}

// Map API status to our app status
const mapMatchStatus = (apiStatus: string): 'scheduled' | 'live' | 'finished' => {
  switch (apiStatus) {
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live';
    case 'FINISHED':
      return 'finished';
    default:
      return 'scheduled';
  }
};

// Format date for display
const formatDate = (utcDate: string): string => {
  const date = new Date(utcDate);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// Format time for display
const formatTime = (utcDate: string): string => {
  const date = new Date(utcDate);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Available competitions in free tier
const AVAILABLE_COMPETITIONS = [
  { code: 'PL', name: 'Premier League' },
  { code: 'PD', name: 'La Liga' },
  { code: 'SA', name: 'Serie A' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'BSA', name: 'Brasileirão Série A' },
  { code: 'CL', name: 'Champions League' },
];

async function fetchFromFootballData(endpoint: string, params?: Record<string, string | number>) {
  const { data, error } = await supabase.functions.invoke('football-data', {
    body: { endpoint, params },
  });

  if (error) {
    console.error('Error fetching from football-data:', error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

// Hook to fetch competitions/leagues
export function useCompetitions() {
  return useQuery({
    queryKey: ['competitions'],
    queryFn: async () => {
      const data = await fetchFromFootballData('/competitions');
      // Filter to only show available competitions
      const availableCodes = AVAILABLE_COMPETITIONS.map(c => c.code);
      return data.competitions.filter((comp: Competition) => 
        availableCodes.includes(comp.code)
      );
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Hook to fetch matches for a specific competition
export function useMatches(competitionCode?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['matches', competitionCode, dateFrom, dateTo],
    queryFn: async () => {
      const endpoint = competitionCode 
        ? `/competitions/${competitionCode}/matches`
        : '/matches';
      
      const params: Record<string, string> = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      const data = await fetchFromFootballData(endpoint, params);
      
      // Transform matches to our format
      return data.matches.map((match: Match) => ({
        id: String(match.id),
        homeTeam: {
          name: match.homeTeam.shortName || match.homeTeam.name,
          logo: match.homeTeam.crest,
          score: match.score.fullTime.home,
        },
        awayTeam: {
          name: match.awayTeam.shortName || match.awayTeam.name,
          logo: match.awayTeam.crest,
          score: match.score.fullTime.away,
        },
        date: formatDate(match.utcDate),
        time: formatTime(match.utcDate),
        league: match.competition.name,
        status: mapMatchStatus(match.status),
        matchday: match.matchday,
        utcDate: match.utcDate,
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: true,
  });
}

// Hook to fetch today's matches
export function useTodayMatches() {
  const today = new Date().toISOString().split('T')[0];
  return useMatches(undefined, today, today);
}

// Hook to fetch standings for a competition
export function useStandings(competitionCode: string) {
  return useQuery({
    queryKey: ['standings', competitionCode],
    queryFn: async () => {
      const data = await fetchFromFootballData(`/competitions/${competitionCode}/standings`);
      
      // Find the total standings table
      const totalTable = data.standings.find((s: StandingsTable) => s.type === 'TOTAL');
      
      if (!totalTable) {
        return [];
      }
      
      return totalTable.table.map((standing: Standing) => ({
        position: standing.position,
        team: standing.team.shortName || standing.team.name,
        played: standing.playedGames,
        won: standing.won,
        drawn: standing.draw,
        lost: standing.lost,
        gf: standing.goalsFor,
        ga: standing.goalsAgainst,
        gd: standing.goalDifference,
        points: standing.points,
      }));
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!competitionCode,
  });
}

// Hook to fetch team details
export function useTeam(teamId: number) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const data = await fetchFromFootballData(`/teams/${teamId}`);
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!teamId,
  });
}

// Hook to fetch team matches
export function useTeamMatches(teamId: number, status?: 'SCHEDULED' | 'FINISHED') {
  return useQuery({
    queryKey: ['teamMatches', teamId, status],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      
      const data = await fetchFromFootballData(`/teams/${teamId}/matches`, params);
      
      return data.matches.map((match: Match) => ({
        id: String(match.id),
        homeTeam: {
          name: match.homeTeam.shortName || match.homeTeam.name,
          logo: match.homeTeam.crest,
          score: match.score.fullTime.home,
        },
        awayTeam: {
          name: match.awayTeam.shortName || match.awayTeam.name,
          logo: match.awayTeam.crest,
          score: match.score.fullTime.away,
        },
        date: formatDate(match.utcDate),
        time: formatTime(match.utcDate),
        league: match.competition.name,
        status: mapMatchStatus(match.status),
        matchday: match.matchday,
      }));
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!teamId,
  });
}

export { AVAILABLE_COMPETITIONS };
