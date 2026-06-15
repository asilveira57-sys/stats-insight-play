import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export function useUserPalpitesByMatches(matchIds: string[]) {
  const { user } = useAuth();
  const uniqueMatchIds = Array.from(new Set(matchIds)).sort();

  return useQuery({
    queryKey: ['user-palpites-by-matches', user?.id, uniqueMatchIds],
    queryFn: async () => {
      if (!user || uniqueMatchIds.length === 0) return new Map<string, boolean>();

      const results = await Promise.all(
        chunk(uniqueMatchIds, 100).map((ids) =>
          supabase
            .from('palpites_usuarios')
            .select('partida_id')
            .eq('user_id', user.id)
            .in('partida_id', ids)
        )
      );

      for (const result of results) {
        if (result.error) throw result.error;
      }

      const map = new Map<string, boolean>();
      results.forEach((result) => {
        (result.data || []).forEach((p) => p.partida_id && map.set(p.partida_id, true));
      });
      return map;
    },
    enabled: !!user && uniqueMatchIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
