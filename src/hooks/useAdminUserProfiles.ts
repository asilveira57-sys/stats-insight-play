import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUserProfileView {
  user_id: string;
  email: string | null;
  nome: string | null;
  status: string | null;
  plano: string | null;
  created_at: string;
  nickname: string | null;
  avatar_url: string | null;
  tipo_plano: string | null;
  assinatura_status: string | null;
  origem: string | null;
  total_palpites: number | null;
  total_acertos: number | null;
  pontuacao_total: number | null;
}

// Hook para listar todos os usuários (admin)
export function useAdminUsersList(search?: string, limit: number = 50) {
  return useQuery({
    queryKey: ['admin-users-list', search, limit],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          nome,
          status,
          plano,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (search) {
        query = query.or(`email.ilike.%${search}%,nome.ilike.%${search}%`);
      }

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      // Buscar dados complementares para cada usuário
      const enrichedProfiles = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Perfil público
          const { data: publicProfile } = await supabase
            .from('user_public_profiles')
            .select('nickname, avatar_url')
            .eq('user_id', profile.user_id)
            .single();

          // Assinatura
          const { data: subscription } = await supabase
            .from('assinaturas')
            .select('tipo_plano, status, origem')
            .eq('user_id', profile.user_id)
            .single();

          // Gamificação
          const { data: gamification } = await supabase
            .from('user_gamification_stats')
            .select('total_palpites, total_acertos, pontuacao_total')
            .eq('user_id', profile.user_id)
            .single();

          return {
            ...profile,
            nickname: publicProfile?.nickname || null,
            avatar_url: publicProfile?.avatar_url || null,
            tipo_plano: subscription?.tipo_plano || null,
            assinatura_status: subscription?.status || null,
            origem: subscription?.origem || null,
            total_palpites: gamification?.total_palpites || 0,
            total_acertos: gamification?.total_acertos || 0,
            pontuacao_total: gamification?.pontuacao_total || 0,
          } as AdminUserProfileView;
        })
      );

      return enrichedProfiles;
    },
  });
}

// Hook para detalhes completos de um usuário (admin)
export function useAdminUserDetails(userId: string) {
  return useQuery({
    queryKey: ['admin-user-details', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Perfil básico
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Perfil público
      const { data: publicProfile } = await supabase
        .from('user_public_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Dados fiscais
      const { data: fiscalData } = await supabase
        .from('user_fiscal_data')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Assinatura
      const { data: subscription } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Gamificação
      const { data: gamification } = await supabase
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Últimas atividades
      const { data: activities } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      return {
        profile,
        publicProfile,
        fiscalData,
        subscription,
        gamification,
        activities: activities || [],
        roles: roles?.map((r) => r.role) || [],
      };
    },
    enabled: !!userId,
  });
}

// Hook para estatísticas gerais de usuários (admin)
export function useAdminUsersStats() {
  return useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: async () => {
      // Total de usuários
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Usuários ativos
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Usuários premium
      const { count: premiumUsers } = await supabase
        .from('assinaturas')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_plano', 'premium')
        .eq('status', 'active');

      // Usuários com palpites
      const { count: usersWithPalpites } = await supabase
        .from('user_gamification_stats')
        .select('*', { count: 'exact', head: true })
        .gt('total_palpites', 0);

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        premiumUsers: premiumUsers || 0,
        usersWithPalpites: usersWithPalpites || 0,
      };
    },
  });
}
