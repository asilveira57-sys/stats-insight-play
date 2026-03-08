import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";
import {
  calculateMatchProbabilities,
  calculateExpectedGoals,
  calculateMostLikelyScore,
  calculateConfidence,
  calculateTeamStrength,
} from "@/lib/poisson";

interface TeamStats {
  id: string;
  nome: string;
  escudo_url: string | null;
  cores: { primary: string; secondary: string } | null;
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  homeWins: number;
  homeMatches: number;
  awayWins: number;
  awayMatches: number;
}

export interface Prediction {
  id: string;
  matchId: string;
  palpiteId?: string;
  homeTeam: {
    name: string;
    logo: string | null;
    probability: number;
    strength: number;
    primaryColor: string;
    secondaryColor: string;
  };
  awayTeam: {
    name: string;
    logo: string | null;
    probability: number;
    strength: number;
    primaryColor: string;
    secondaryColor: string;
  };
  drawProbability: number;
  predictedScore: { home: number; away: number };
  confidence: "high" | "medium" | "low";
  league: string;
  leagueCode: string;
  date: string;
  time: string;
}

// Format date for display in pt-BR
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

// Format time from UTC to Brasília time (UTC-3)
function formatTime(timeStr: string | null): string {
  if (!timeStr) return '--:--';
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  let brasiliaHours = hours - 3;
  if (brasiliaHours < 0) brasiliaHours += 24;
  
  return `${brasiliaHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Calculate team statistics from finished matches
async function getTeamStats(teamId: string): Promise<TeamStats | null> {
  // Get team info
  const { data: team } = await supabase
    .from('times')
    .select('id, nome, cores')
    .eq('id', teamId)
    .maybeSingle();

  if (!team) return null;

  // Get finished matches where this team played - sem limite
  const homeMatches = await fetchAllRecords<any>(
    'partidas',
    'gols_casa, gols_fora',
    (q) => q.eq('time_casa_id', teamId).eq('status', 'finished').not('gols_casa', 'is', null).not('gols_fora', 'is', null)
  );

  const awayMatches = await fetchAllRecords<any>(
    'partidas',
    'gols_casa, gols_fora',
    (q) => q.eq('time_fora_id', teamId).eq('status', 'finished').not('gols_casa', 'is', null).not('gols_fora', 'is', null)
  );

  let wins = 0, draws = 0, losses = 0;
  let goalsScored = 0, goalsConceded = 0;
  let homeWins = 0, awayWins = 0;

  // Process home matches
  homeMatches.forEach(match => {
    goalsScored += match.gols_casa || 0;
    goalsConceded += match.gols_fora || 0;
    
    if ((match.gols_casa || 0) > (match.gols_fora || 0)) {
      wins++;
      homeWins++;
    } else if ((match.gols_casa || 0) === (match.gols_fora || 0)) {
      draws++;
    } else {
      losses++;
    }
  });

  // Process away matches
  awayMatches.forEach(match => {
    goalsScored += match.gols_fora || 0;
    goalsConceded += match.gols_casa || 0;
    
    if ((match.gols_fora || 0) > (match.gols_casa || 0)) {
      wins++;
      awayWins++;
    } else if ((match.gols_fora || 0) === (match.gols_casa || 0)) {
      draws++;
    } else {
      losses++;
    }
  });

  return {
    id: team.id,
    nome: team.nome,
    cores: team.cores as { primary: string; secondary: string } | null,
    totalMatches: homeMatches.length + awayMatches.length,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded,
    homeWins,
    homeMatches: homeMatches.length,
    awayWins,
    awayMatches: awayMatches.length,
  };
}

// Generate prediction for a match
async function generatePrediction(match: any): Promise<Prediction | null> {
  if (!match.time_casa_id || !match.time_fora_id) return null;

  const [homeStats, awayStats] = await Promise.all([
    getTeamStats(match.time_casa_id),
    getTeamStats(match.time_fora_id),
  ]);

  if (!homeStats || !awayStats) return null;

  // Need at least some matches to make predictions
  if (homeStats.totalMatches < 1 || awayStats.totalMatches < 1) return null;

  // Calculate average goals
  const homeAvgScored = homeStats.goalsScored / Math.max(1, homeStats.totalMatches);
  const homeAvgConceded = homeStats.goalsConceded / Math.max(1, homeStats.totalMatches);
  const awayAvgScored = awayStats.goalsScored / Math.max(1, awayStats.totalMatches);
  const awayAvgConceded = awayStats.goalsConceded / Math.max(1, awayStats.totalMatches);

  // League average (approximate)
  const leagueAvg = 1.3;

  // Calculate expected goals
  const homeExpectedGoals = calculateExpectedGoals(
    homeAvgScored,
    homeAvgConceded,
    awayAvgScored,
    awayAvgConceded,
    leagueAvg,
    true
  );

  const awayExpectedGoals = calculateExpectedGoals(
    awayAvgScored,
    awayAvgConceded,
    homeAvgScored,
    homeAvgConceded,
    leagueAvg,
    false
  );

  // Calculate probabilities
  const probs = calculateMatchProbabilities(homeExpectedGoals, awayExpectedGoals);

  // Calculate most likely score
  const likelyScore = calculateMostLikelyScore(homeExpectedGoals, awayExpectedGoals);

  // Calculate confidence
  const confidence = calculateConfidence(probs.homeWin, probs.draw, probs.awayWin);

  // Calculate team strengths
  const homeStrength = calculateTeamStrength(
    homeStats.wins,
    homeStats.draws,
    homeStats.losses,
    homeStats.goalsScored,
    homeStats.goalsConceded
  );

  const awayStrength = calculateTeamStrength(
    awayStats.wins,
    awayStats.draws,
    awayStats.losses,
    awayStats.goalsScored,
    awayStats.goalsConceded
  );

  // Check if there's an existing system palpite
  const { data: existingPalpite } = await supabase
    .from('palpites')
    .select('id')
    .eq('partida_id', match.id)
    .maybeSingle();

  return {
    id: match.id,
    matchId: match.id,
    palpiteId: existingPalpite?.id,
    homeTeam: {
      name: homeStats.nome,
      logo: null,
      probability: probs.homeWin,
      strength: homeStrength,
      primaryColor: homeStats.cores?.primary || '#6B7280',
      secondaryColor: homeStats.cores?.secondary || '#FFFFFF',
    },
    awayTeam: {
      name: awayStats.nome,
      logo: awayStats.escudo_url,
      probability: probs.awayWin,
      strength: awayStrength,
      primaryColor: awayStats.cores?.primary || '#6B7280',
      secondaryColor: awayStats.cores?.secondary || '#FFFFFF',
    },
    drawProbability: probs.draw,
    predictedScore: { home: likelyScore.homeGoals, away: likelyScore.awayGoals },
    confidence,
    league: match.ligas?.nome || 'Liga',
    leagueCode: match.ligas?.codigo_api || '',
    date: formatDate(match.data),
    time: formatTime(match.hora),
  };
}

export function usePredictions(options?: {
  leagueId?: string;
  confidence?: string;
  days?: number;
}) {
  const { leagueId, confidence, days = 7 } = options || {};

  return useQuery({
    queryKey: ['predictions', leagueId, confidence, days],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + days);

      const matches = await fetchAllRecords<any>(
        'partidas',
        `id, data, hora, time_casa_id, time_fora_id, liga_id, ligas(nome, codigo_api, logo_url)`,
        (q) => {
          let filtered = q
            .eq('status', 'scheduled')
            .gte('data', today.toISOString().split('T')[0])
            .lte('data', futureDate.toISOString().split('T')[0]);
          if (leagueId) filtered = filtered.eq('liga_id', leagueId);
          return filtered;
        },
        { column: 'data', ascending: true }
      );

      if (!matches || matches.length === 0) return [];

      // Generate predictions for each match
      const predictions = await Promise.all(
        matches.map(match => generatePrediction(match))
      );

      // Filter out null predictions and apply confidence filter
      let validPredictions = predictions.filter(
        (p): p is Prediction => p !== null
      );

      if (confidence && confidence !== 'all') {
        validPredictions = validPredictions.filter(p => p.confidence === confidence);
      }

      return validPredictions;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Priority order for leagues (Brazilian first)
const LEAGUE_PRIORITY: Record<string, number> = {
  'BSA': 1, // Campeonato Brasileiro Série A
  'BSB': 2, // Campeonato Brasileiro Série B
  'CLI': 3, // Copa Libertadores
  'CSA': 4, // Copa Sudamericana
  'CL': 5,  // UEFA Champions League
  'PL': 6,  // Premier League
  'PD': 7,  // La Liga
  'SA': 8,  // Serie A (Italy)
  'BL1': 9, // Bundesliga
  'FL1': 10, // Ligue 1
};

export function useLeaguesForPredictions() {
  return useQuery({
    queryKey: ['leagues-predictions'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const future = futureDate.toISOString().split('T')[0];

      // Get distinct league IDs from scheduled matches in next 7 days - sem limite
      const matchLeagues = await fetchAllRecords<{ liga_id: string | null }>(
        'partidas',
        'liga_id',
        (q) => q.eq('status', 'scheduled').gte('data', today).lte('data', future)
      );

      const leagueIds = [...new Set(matchLeagues.map(m => m.liga_id).filter(Boolean))];
      if (leagueIds.length === 0) return [];

      const { data, error } = await supabase
        .from('ligas')
        .select('id, nome, logo_url, codigo_api, pais, slug')
        .in('id', leagueIds)
        .eq('ativa', true);

      if (error) throw error;

      // Deduplicate by slug
      const seen = new Set<string>();
      const unique = (data || []).filter(l => {
        const key = l.slug || l.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort by priority (Brazilian leagues first)
      return unique.sort((a, b) => {
        const priorityA = LEAGUE_PRIORITY[a.codigo_api || ''] ?? 50;
        const priorityB = LEAGUE_PRIORITY[b.codigo_api || ''] ?? 50;
        return priorityA - priorityB;
      });
    },
  });
}

// Hook to get match counts per league for the next 7 days
export function useLeagueMatchCounts() {
  return useQuery({
    queryKey: ['league-match-counts'],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 7);

      const data = await fetchAllRecords<any>(
        'partidas',
        'id, ligas(codigo_api)',
        (q) => q.eq('status', 'scheduled')
          .gte('data', today.toISOString().split('T')[0])
          .lte('data', futureDate.toISOString().split('T')[0])
      );

      // Count matches per league
      const counts = new Map<string, number>();
      data.forEach(match => {
        const leagueCode = (match.ligas as any)?.codigo_api;
        if (leagueCode) {
          counts.set(leagueCode, (counts.get(leagueCode) || 0) + 1);
        }
      });

      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });
}
