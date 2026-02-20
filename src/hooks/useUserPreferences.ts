import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPreferences {
  id: string;
  user_id: string;
  theme_mode: 'light' | 'dark' | 'system';
  favorite_team_id: string | null;
  notifications_email: boolean;
  notifications_push: boolean;
  public_profile: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserPreferences | null;
    },
    enabled: !!user,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      if (!user) throw new Error('Not authenticated');

      // Try update first, then upsert if not found
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, ...data }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
    },
  });
}
