import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface UserProfile {
  id: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  plano: 'free' | 'premium';
  status: 'active' | 'blocked' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface UserPublicProfile {
  id: string;
  user_id: string;
  nickname: string | null;
  nickname_normalized: string | null;
  avatar_url: string | null;
  avatar_status: 'default' | 'custom' | 'pending_review';
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFiscalData {
  id: string;
  user_id: string;
  cpf: string | null;
  cpf_validated: boolean;
  nome_fiscal: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tipo_plano: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  data_inicio: string;
  data_fim: string | null;
  origem: 'payment' | 'coupon' | 'beta' | 'admin' | 'promotion';
  trial_ends_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserGamificationStats {
  id: string;
  user_id: string;
  total_palpites: number;
  total_acertos: number;
  total_erros: number;
  acertos_placar_exato: number;
  pontuacao_total: number;
  sequencia_atual: number;
  maior_sequencia: number;
  last_palpite_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  action_category: string;
  details: Record<string, unknown>;
  ip_anonymized: string | null;
  user_agent_hash: string | null;
  session_id: string | null;
  created_at: string;
}

// Hook para perfil básico do usuário
export function useUserProfile(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['user-profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!targetUserId,
  });
}

// Hook para perfil público
export function useUserPublicProfile(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['user-public-profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('user_public_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserPublicProfile | null;
    },
    enabled: !!targetUserId,
  });
}

// Hook para dados fiscais
export function useUserFiscalData(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['user-fiscal-data', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('user_fiscal_data')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserFiscalData | null;
    },
    enabled: !!targetUserId,
  });
}

// Hook para assinatura
export function useUserSubscription(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['user-subscription', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserSubscription | null;
    },
    enabled: !!targetUserId,
  });
}

// Hook para estatísticas de gamificação
export function useUserGamificationStats(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['user-gamification-stats', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserGamificationStats | null;
    },
    enabled: !!targetUserId,
  });
}

// Hook para logs de atividade
export function useUserActivityLogs(userId?: string, limit: number = 50) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['user-activity-logs', targetUserId, limit],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as UserActivityLog[];
    },
    enabled: !!targetUserId,
  });
}

// Hook para validar nickname
export function useValidateNickname() {
  return useMutation({
    mutationFn: async ({ nickname, userId }: { nickname: string; userId?: string }) => {
      const { data, error } = await supabase
        .rpc('validate_nickname', { 
          p_nickname: nickname, 
          p_user_id: userId || null 
        });

      if (error) throw error;
      return data as { is_valid: boolean; error_message: string | null }[];
    },
  });
}

// Hook para atualizar perfil público
export function useUpdatePublicProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<UserPublicProfile> }) => {
      const { error } = await supabase
        .from('user_public_profiles')
        .update(data)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-public-profile', variables.userId] });
    },
  });
}

// Hook para atualizar dados fiscais
export function useUpdateFiscalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<UserFiscalData> }) => {
      const { error } = await supabase
        .from('user_fiscal_data')
        .update(data)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-fiscal-data', variables.userId] });
    },
  });
}

// Hook para registrar atividade
export function useLogActivity() {
  return useMutation({
    mutationFn: async ({
      userId,
      actionType,
      actionCategory,
      details = {},
    }: {
      userId: string;
      actionType: string;
      actionCategory: string;
      details?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('log_user_activity', {
        p_user_id: userId,
        p_action_type: actionType,
        p_action_category: actionCategory,
        p_details: details as unknown as Record<string, never>,
      });

      if (error) throw error;
      return data;
    },
  });
}
