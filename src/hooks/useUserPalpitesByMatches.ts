import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserPalpitesByMatches(matchIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-palpites-by-matches', user?.id, matchIds],
    queryFn: async () => {
      if (!user || matchIds.length === 0) return new Map<string, boolean>();

      const { data, error } = await supabase
        .from('palpites_usuarios')
        .select('partida_id')
        .eq('user_id', user.id)
        .in('partida_id', matchIds);

      if (error) throw error;

      const map = new Map<string, boolean>();
      (data || []).forEach(p => map.set(p.partida_id, true));
      return map;
    },
    enabled: !!user && matchIds.length > 0,
  });
}
