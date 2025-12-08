import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook to subscribe to real-time updates for matches
export function useRealtimeMatches() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partidas',
        },
        (payload) => {
          console.log('Match update received:', payload);
          // Invalidate all match-related queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['db-matches'] });
          queryClient.invalidateQueries({ queryKey: ['db-live-matches'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
