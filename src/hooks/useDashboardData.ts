import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllRecords, countAllRecords } from '@/lib/supabaseHelpers';

// KPI stats
export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const [leagues, matches, teams, scorers, liveMatches, todayMatches, lastSync] = await Promise.all([
        countAllRecords('ligas', q => q.eq('ativa', true)),
        countAllRecords('partidas'),
        countAllRecords('times'),
        countAllRecords('artilharia_agregada'),
        countAllRecords('partidas', q => q.eq('status', 'live')),
        countAllRecords('partidas', q => q.eq('data', new Date().toISOString().split('T')[0])),
        supabase.from('sync_logs').select('completed_at').order('completed_at', { ascending: false }).limit(1).then(r => r.data?.[0]?.completed_at || null),
      ]);
      return { leagues, matches, teams, scorers, liveMatches, todayMatches, lastSync };
    },
    staleTime: 60_000,
  });
}

// Today's matches with team and league details
export function useTodayMatches(focusRegion: string) {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['dashboard-today-matches', today, focusRegion],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidas')
        .select('*, time_casa:times!partidas_time_casa_id_fkey(id,nome,escudo_url,slug,pais), time_fora:times!partidas_time_fora_id_fkey(id,nome,escudo_url,slug,pais), liga:ligas!partidas_liga_id_fkey(id,nome,logo_url,pais,slug)')
        .eq('data', today)
        .order('hora', { ascending: true });
      if (error) throw error;

      // Sort: Brazil first, then international
      const sorted = (data || []).sort((a: any, b: any) => {
        const aIsBR = a.liga?.pais === 'Brazil' || a.liga?.pais === 'Brasil';
        const bIsBR = b.liga?.pais === 'Brazil' || b.liga?.pais === 'Brasil';
        if (focusRegion === 'BR') {
          if (aIsBR && !bIsBR) return -1;
          if (!aIsBR && bIsBR) return 1;
        }
        return 0;
      });
      return sorted;
    },
    staleTime: 30_000,
  });
}

// Live matches with polling
export function useLiveMatches() {
  return useQuery({
    queryKey: ['dashboard-live-matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidas')
        .select('*, time_casa:times!partidas_time_casa_id_fkey(id,nome,escudo_url,slug), time_fora:times!partidas_time_fora_id_fkey(id,nome,escudo_url,slug), liga:ligas!partidas_liga_id_fkey(id,nome,logo_url,slug)')
        .eq('status', 'live');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000, // Poll every 60s
    staleTime: 30_000,
  });
}

// User prediction stats
export function useUserPredictionStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard-user-predictions', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const [totalPalpites, gamification, streak] = await Promise.all([
        countAllRecords('palpites_usuarios', q => q.eq('user_id', user.id)),
        supabase.from('user_gamification_stats').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_xp').select('current_streak_days, total_xp, level').eq('user_id', user.id).maybeSingle(),
      ]);

      const stats = gamification.data;
      return {
        totalPalpites: stats?.total_palpites || totalPalpites || 0,
        totalAcertos: stats?.total_acertos || 0,
        acertosPlacarExato: stats?.acertos_placar_exato || 0,
        pontuacaoTotal: stats?.pontuacao_total || 0,
        accuracyPct: stats?.total_palpites ? Math.round((stats.total_acertos / stats.total_palpites) * 100) : 0,
        streak: streak.data?.current_streak_days || 0,
        totalXp: streak.data?.total_xp || 0,
        level: streak.data?.level || 1,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

// General prediction stats by period
export function useGeneralPredictionStats(period: '1d' | '7d' | '30d') {
  return useQuery({
    queryKey: ['dashboard-general-predictions', period],
    queryFn: async () => {
      const daysAgo = period === '1d' ? 1 : period === '7d' ? 7 : 30;
      const since = new Date();
      since.setDate(since.getDate() - daysAgo);
      
      const { data, error } = await supabase
        .from('comparativo_resultados')
        .select('*')
        .gte('created_at', since.toISOString());
      if (error) throw error;
      
      const total = data?.length || 0;
      const acertosResultado = data?.filter(d => d.sistema_acertou_resultado).length || 0;
      const acertosPlacar = data?.filter(d => d.sistema_acertou_placar).length || 0;
      
      return {
        total,
        pctResultado: total > 0 ? Math.round((acertosResultado / total) * 100) : 0,
        pctPlacar: total > 0 ? Math.round((acertosPlacar / total) * 100) : 0,
        totalUsuarios: data?.reduce((s, d) => s + (d.total_usuarios_palpitaram || 0), 0) || 0,
        usuariosAcertaram: data?.reduce((s, d) => s + (d.usuarios_acertaram_resultado || 0), 0) || 0,
      };
    },
    staleTime: 120_000,
  });
}

// AI prediction stats
export function useAIPredictionStats() {
  return useQuery({
    queryKey: ['dashboard-ai-predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparativo_resultados')
        .select('sistema_acertou_resultado, sistema_acertou_placar');
      if (error) throw error;
      
      const total = data?.length || 0;
      const acertosResultado = data?.filter(d => d.sistema_acertou_resultado).length || 0;
      const acertosPlacar = data?.filter(d => d.sistema_acertou_placar).length || 0;
      
      return {
        total,
        pctResultado: total > 0 ? Math.round((acertosResultado / total) * 100) : 0,
        pctPlacar: total > 0 ? Math.round((acertosPlacar / total) * 100) : 0,
      };
    },
    staleTime: 120_000,
  });
}

// Data integrity alerts
export function useIntegrityAlerts() {
  return useQuery({
    queryKey: ['dashboard-integrity-alerts'],
    queryFn: async () => {
      const [noScore, noApiId, noSlug, failedSyncs] = await Promise.all([
        countAllRecords('partidas', q => q.eq('status', 'finished').is('gols_casa', null)),
        countAllRecords('partidas', q => q.is('api_id', null)),
        countAllRecords('times', q => q.is('slug', null)),
        supabase.from('sync_logs').select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .then(r => r.count || 0),
      ]);
      
      return { noScore, noApiId, noSlug, failedSyncs };
    },
    staleTime: 300_000,
  });
}

// System log helper
export function useSystemLog() {
  const { user } = useAuth();
  
  const logAction = async (action: string, metadata: Record<string, any> = {}) => {
    if (!user) return;
    try {
      await supabase.from('system_logs').insert({
        module: 'dashboard_home',
        action,
        user_id: user.id,
        metadata,
      });
    } catch (e) {
      console.warn('Failed to log action:', e);
    }
  };
  
  return { logAction };
}
