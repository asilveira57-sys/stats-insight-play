import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PlanType = 'free' | 'premium';

interface UserPlan {
  plano: PlanType;
  assinaturaStatus: 'active' | 'cancelled' | 'expired' | null;
  isPremium: boolean;
  canSavePalpites: boolean;
  canAccessAdvancedStats: boolean;
  canExportData: boolean;
  canUseSimulator: boolean;
  dailyPalpitesLimit: number | null;
}

export function useUserPlan(): { data: UserPlan | null; isLoading: boolean } {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: async (): Promise<UserPlan> => {
      if (!user) {
        return {
          plano: 'free',
          assinaturaStatus: null,
          isPremium: false,
          canSavePalpites: false,
          canAccessAdvancedStats: false,
          canExportData: false,
          canUseSimulator: false,
          dailyPalpitesLimit: 3,
        };
      }

      // Fetch user's subscription
      const { data: assinatura, error } = await supabase
        .from('assinaturas')
        .select('tipo_plano, status')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      }

      const plano = (assinatura?.tipo_plano as PlanType) || 'free';
      const isPremium = plano === 'premium' && assinatura?.status === 'active';

      return {
        plano,
        assinaturaStatus: assinatura?.status || null,
        isPremium,
        canSavePalpites: isPremium,
        canAccessAdvancedStats: isPremium,
        canExportData: isPremium,
        canUseSimulator: isPremium,
        dailyPalpitesLimit: isPremium ? null : 3,
      };
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return { 
    data: data || null, 
    isLoading 
  };
}
