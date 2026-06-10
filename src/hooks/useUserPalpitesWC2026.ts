import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserPalpiteForWC2026Match(matchId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-palpite-wc2026', user?.id, matchId],
    queryFn: async () => {
      if (!user || !matchId) return null;
      const { data, error } = await supabase
        .from('palpites_usuarios').select('*')
        .eq('user_id', user.id).eq('wc2026_match_id', matchId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!matchId,
  });
}

export function useCreateUserPalpiteWC2026() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ matchId, placarCasa, placarFora }: { matchId: string; placarCasa: number; placarFora: number }) => {
      if (!user) throw new Error('Usuário não autenticado');
      // Manual upsert: the unique index on (user_id, wc2026_match_id) is partial
      // (WHERE wc2026_match_id IS NOT NULL), so PostgREST's ON CONFLICT cannot target it.
      const { data: existing } = await supabase
        .from('palpites_usuarios').select('id')
        .eq('user_id', user.id).eq('wc2026_match_id', matchId).maybeSingle();
      if (existing?.id) {
        const { data, error } = await supabase
          .from('palpites_usuarios')
          .update({ placar_casa: placarCasa, placar_fora: placarFora })
          .eq('id', existing.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('palpites_usuarios').insert({
            user_id: user.id,
            partida_id: null,
            wc2026_match_id: matchId,
            placar_casa: placarCasa,
            placar_fora: placarFora,
          }).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-palpite-wc2026'] });
      qc.invalidateQueries({ queryKey: ['user-palpites-wc2026-all'] });
    },
  });
}


export function useUserPalpitesWC2026All() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-palpites-wc2026-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('palpites_usuarios')
        .select(`id, placar_casa, placar_fora, created_at, wc2026_match_id,
          match:wc2026_match_id(
            id, match_date, status, home_score, away_score, stage, group_letter,
            home:home_team_id(name, slug, flag_url),
            away:away_team_id(name, slug, flag_url)
          )`)
        .eq('user_id', user.id)
        .not('wc2026_match_id', 'is', null)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });
}
