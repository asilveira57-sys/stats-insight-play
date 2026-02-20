import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface UserXP {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak_days: number;
  best_streak_days: number;
  last_activity_date: string | null;
  updated_at: string;
}

export interface XPEvent {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string | null;
  rule_key: string;
  xp_delta: number;
  description: string | null;
  match_id: string | null;
  competition_id: string | null;
  created_at: string;
}

export interface GamificationRule {
  id: string;
  rule_key: string;
  xp_value: number;
  is_enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  badge_key: string;
  name: string;
  description: string | null;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  source_type: string | null;
  source_id: string | null;
  badges?: Badge;
}

export interface RankingEntry {
  id: string;
  period: string;
  period_start: string;
  period_end: string;
  user_id: string;
  score: number;
  rank_position: number;
  updated_at: string;
  // Joined fields
  nickname?: string;
  avatar_url?: string;
  nome?: string;
  level?: number;
  current_streak_days?: number;
  country?: string;
}

// Calculate XP needed for next level
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.2));
}

export function xpProgress(totalXp: number, level: number) {
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progressXp = totalXp - currentLevelXp;
  const neededXp = nextLevelXp - currentLevelXp;
  return {
    current: Math.max(0, progressXp),
    needed: neededXp,
    percent: Math.min(100, Math.max(0, (progressXp / neededXp) * 100)),
  };
}

// Hook: Current user XP
export function useUserXP() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-xp', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return (data as UserXP) || { user_id: user.id, total_xp: 0, level: 1, current_streak_days: 0, best_streak_days: 0, last_activity_date: null, updated_at: '' };
    },
    enabled: !!user,
  });
}

// Hook: XP Events (recent)
export function useXPEvents(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['xp-events', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as XPEvent[];
    },
    enabled: !!user,
  });
}

// Hook: All badges
export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('badges').select('*').order('rarity');
      if (error) throw error;
      return data as Badge[];
    },
  });
}

// Hook: User badges
export function useUserBadges(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  return useQuery({
    queryKey: ['user-badges', targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', targetId)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return data as UserBadge[];
    },
    enabled: !!targetId,
  });
}

// Hook: Gamification rules (admin)
export function useGamificationRules() {
  return useQuery({
    queryKey: ['gamification-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gamification_rules').select('*').order('rule_key');
      if (error) throw error;
      return data as GamificationRule[];
    },
  });
}

// Hook: Update gamification rule (admin)
export function useUpdateGamificationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, xp_value, is_enabled }: { id: string; xp_value: number; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('gamification_rules')
        .update({ xp_value, is_enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gamification-rules'] }),
  });
}

// Hook: Rankings
export function useRankings(period: string, page = 0, pageSize = 50, search = '', countryFilter = '') {
  return useQuery({
    queryKey: ['rankings', period, page, search, countryFilter],
    queryFn: async () => {
      // Use the view for rich data
      let query = supabase
        .from('v_public_user_summary' as any)
        .select('*')
        .order('total_xp', { ascending: false });

      if (search) {
        query = query.or(`nickname.ilike.%${search}%,nome.ilike.%${search}%`);
      }
      if (countryFilter) {
        query = query.eq('country', countryFilter);
      }

      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any, i: number) => ({
        ...d,
        rank_position: page * pageSize + i + 1,
      }));
    },
  });
}

// Hook: Grant XP (via RPC)
export function useGrantXP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      ruleKey: string;
      sourceType?: string;
      sourceId?: string;
      matchId?: string;
      competitionId?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('grant_xp', {
        p_user_id: params.userId,
        p_rule_key: params.ruleKey,
        p_source_type: params.sourceType || 'prediction',
        p_source_id: params.sourceId || null,
        p_match_id: params.matchId || null,
        p_competition_id: params.competitionId || null,
        p_description: params.description || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-xp'] });
      queryClient.invalidateQueries({ queryKey: ['xp-events'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
    },
  });
}

// Hook: Update streak
export function useUpdateStreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('update_user_streak', { p_user_id: userId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-xp'] });
      queryClient.invalidateQueries({ queryKey: ['xp-events'] });
    },
  });
}
