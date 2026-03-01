import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeagueScoreFactors {
  structural_relevance: number;
  seo_potential: number;
  match_volume: number;
  engagement: number;
}

export interface TeamScoreFactors {
  popularity: number;
  frequency: number;
  performance: number;
  engagement: number;
}

export interface LeagueWithScore {
  id: string;
  nome: string;
  codigo_api: string | null;
  logo_url: string | null;
  priority_score: number | null;
  score_factors: Partial<LeagueScoreFactors> | null;
  score_updated_at: string | null;
}

export interface TeamWithScore {
  id: string;
  nome: string;
  escudo_url: string | null;
  priority_score: number | null;
  score_factors: Partial<TeamScoreFactors> | null;
  score_updated_at: string | null;
}

// Fetch leagues ordered by priority score
export function useLeaguesByPriority(limit?: number) {
  return useQuery({
    queryKey: ['leagues-by-priority', limit],
    queryFn: async () => {
      let query = supabase
        .from('ligas')
        .select('id, nome, codigo_api, logo_url, priority_score, score_factors, score_updated_at')
        .eq('ativa', true)
        .order('priority_score', { ascending: false, nullsFirst: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        score_factors: item.score_factors as Partial<LeagueScoreFactors> | null,
      })) as LeagueWithScore[];
    },
  });
}

// Fetch teams ordered by priority score
export function useTeamsByPriority(limit?: number) {
  return useQuery({
    queryKey: ['teams-by-priority', limit],
    queryFn: async () => {
      let query = supabase
        .from('times')
        .select('id, nome, escudo_url, priority_score, score_factors, score_updated_at')
        .order('priority_score', { ascending: false, nullsFirst: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        score_factors: item.score_factors as Partial<TeamScoreFactors> | null,
      })) as TeamWithScore[];
    },
  });
}

// Calculate combined content priority score
export function calculateContentPriorityScore(
  leagueScore: number | null,
  team1Score: number | null,
  team2Score: number | null,
  contentTypeWeight: 'high' | 'medium' | 'low' = 'medium'
): number {
  const weights = {
    high: 20,    // Pre-game important, seasonal series
    medium: 10,  // Round overview, post-game
    low: 5,      // Secondary content
  };

  const league = leagueScore || 50;
  const t1 = team1Score || 50;
  const t2 = team2Score || 50;
  const typeWeight = weights[contentTypeWeight];

  // Weighted calculation: league 40%, teams 30% each, content type bonus
  return Math.round(
    league * 0.4 +
    t1 * 0.3 +
    t2 * 0.3 +
    typeWeight
  );
}

// Get priority level based on score
export function getPriorityLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

// Mutation to recalculate scores (with batching loop for teams)
export function useRecalculatePriorityScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { target?: 'all' | 'leagues' | 'teams'; onProgress?: (msg: string) => void } = {}) => {
      const { target = 'all', onProgress } = params;
      
      // First pass: leagues (always completes in one call)
      if (target === 'all' || target === 'leagues') {
        onProgress?.('Calculando scores de ligas...');
        const { data, error } = await supabase.functions.invoke('calculate-priority-scores', {
          body: { target: 'leagues' },
        });
        if (error) throw error;
        onProgress?.(`Ligas atualizadas: ${data?.leagues_updated || 0}`);
      }

      // Second pass: teams in batches
      if (target === 'all' || target === 'teams') {
        let offset = 0;
        let totalUpdated = 0;
        let hasMore = true;

        while (hasMore) {
          onProgress?.(`Processando times (offset: ${offset})...`);
          const { data, error } = await supabase.functions.invoke('calculate-priority-scores', {
            body: { target: 'teams', offset },
          });
          if (error) throw error;

          totalUpdated += data?.teams_updated || 0;
          hasMore = data?.has_more || false;
          offset += 50; // BATCH_SIZE

          onProgress?.(`Times atualizados: ${totalUpdated}/${data?.teams_total || '?'}`);
        }

        onProgress?.(`Concluído! Total de times atualizados: ${totalUpdated}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues-by-priority'] });
      queryClient.invalidateQueries({ queryKey: ['teams-by-priority'] });
    },
  });
}

// Get matches ordered by combined priority
export function useMatchesByPriority(days: number = 7) {
  return useQuery({
    queryKey: ['matches-by-priority', days],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const { data: matches, error } = await supabase
        .from('partidas')
        .select(`
          id,
          data,
          hora,
          status,
          liga:ligas!partidas_liga_id_fkey(id, nome, priority_score),
          time_casa:times!partidas_time_casa_id_fkey(id, nome, escudo_url, priority_score),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, escudo_url, priority_score)
        `)
        .eq('status', 'scheduled')
        .gte('data', today.toISOString().split('T')[0])
        .lte('data', futureDate.toISOString().split('T')[0])
        .order('data', { ascending: true });

      if (error) throw error;

      // Calculate combined priority and sort
      const matchesWithPriority = (matches || []).map((match: any) => {
        const combinedScore = calculateContentPriorityScore(
          match.liga?.priority_score,
          match.time_casa?.priority_score,
          match.time_fora?.priority_score
        );

        return {
          ...match,
          combined_priority_score: combinedScore,
          priority_level: getPriorityLevel(combinedScore),
        };
      });

      // Sort by priority score (descending), then by date
      return matchesWithPriority.sort((a, b) => {
        if (b.combined_priority_score !== a.combined_priority_score) {
          return b.combined_priority_score - a.combined_priority_score;
        }
        return new Date(a.data).getTime() - new Date(b.data).getTime();
      });
    },
  });
}
