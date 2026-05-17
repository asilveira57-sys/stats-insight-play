import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllRecords, countAllRecords } from '@/lib/supabaseHelpers';

/**
 * Approximate count for huge tables. Uses RPC estimated_count() if available
 * (instant — reads pg_class statistics), falls back to null on failure.
 * Never blocks the dashboard with a full count(*) on millions of rows.
 */
async function approxCount(table: string): Promise<number | null> {
  try {
    const { data, error } = await (supabase as any).rpc('estimated_count', { table_name: table });
    if (error) return null;
    return typeof data === 'number' ? data : Number(data) || null;
  } catch {
    return null;
  }
}

// ---- KPIs: split into FAST (mount) and SLOW (lazy) ----

// Fast KPIs — only queries that hit an index. Runs on mount.
export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis-fast'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
        try { return await p; } catch { return fallback; }
      };

      const [leagues, liveMatches, todayMatches, lastSync] = await Promise.all([
        safe(countAllRecords('ligas', q => q.eq('ativa', true)), 0),
        safe(countAllRecords('partidas', q => q.eq('status', 'live')), 0),
        safe(countAllRecords('partidas', q => q.eq('data', today)), 0),
        safe((async () => {
          const r = await supabase.from('sync_logs')
            .select('completed_at')
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(1);
          return r.data?.[0]?.completed_at || null;
        })(), null as string | null),
      ]);

      return {
        leagues,
        liveMatches,
        todayMatches,
        lastSync,
        // Heavy totals filled by useDashboardKPIsTotals
        matches: 0,
        teams: 0,
        scorers: 0,
      };
    },
    staleTime: 60_000,
    retry: 1,
  });
}

// Slow KPIs — approximate totals for huge tables. Enable lazily (in viewport).
export function useDashboardKPIsTotals(enabled: boolean = false) {
  return useQuery({
    queryKey: ['dashboard-kpis-totals'],
    queryFn: async () => {
      const [matches, teams, scorers] = await Promise.all([
        approxCount('partidas'),
        approxCount('times'),
        approxCount('artilharia_agregada'),
      ]);
      return {
        matches: matches ?? 0,
        teams: teams ?? 0,
        scorers: scorers ?? 0,
      };
    },
    enabled,
    staleTime: 5 * 60_000,
    retry: 0,
  });
}

// Today's matches with team and league details — region filter pushed to server when possible
export function useTodayMatches(focusRegion: string) {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['dashboard-today-matches', today, focusRegion],
    queryFn: async () => {
      let query = supabase
        .from('partidas')
        .select('*, time_casa:times!partidas_time_casa_id_fkey(id,nome,escudo_url,slug,pais,cores,short_code), time_fora:times!partidas_time_fora_id_fkey(id,nome,escudo_url,slug,pais,cores,short_code), liga:ligas!partidas_liga_id_fkey!inner(id,nome,logo_url,pais,slug)')
        .eq('data', today)
        .order('hora', { ascending: true });

      // Server-side region filter
      if (focusRegion === 'BR') {
        query = query.in('liga.pais', ['Brazil', 'Brasil']);
      } else if (focusRegion === 'INT') {
        query = query.not('liga.pais', 'in', '("Brazil","Brasil")');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
    retry: 1,
  });
}

// Live matches with polling
export function useLiveMatches() {
  return useQuery({
    queryKey: ['dashboard-live-matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidas')
        .select('*, time_casa:times!partidas_time_casa_id_fkey(id,nome,escudo_url,slug,cores,short_code), time_fora:times!partidas_time_fora_id_fkey(id,nome,escudo_url,slug,cores,short_code), liga:ligas!partidas_liga_id_fkey(id,nome,logo_url,slug)')
        .eq('status', 'live');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}

// User prediction stats
export function useUserPredictionStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard-user-predictions', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const safe = async <T,>(p: Promise<T>, fb: T): Promise<T> => {
        try { return await p; } catch { return fb; }
      };

      const [totalPalpites, gamification, streak] = await Promise.all([
        safe(countAllRecords('palpites_usuarios', q => q.eq('user_id', user.id)), 0),
        safe(supabase.from('user_gamification_stats').select('*').eq('user_id', user.id).maybeSingle(), { data: null } as any),
        safe(supabase.from('user_xp').select('current_streak_days, total_xp, level').eq('user_id', user.id).maybeSingle(), { data: null } as any),
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
    retry: 1,
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

      const data = await fetchAllRecords<any>(
        'comparativo_resultados',
        '*',
        (q) => q.gte('created_at', since.toISOString())
      );

      const total = data.length;
      const acertosResultado = data.filter((d: any) => d.sistema_acertou_resultado).length;
      const acertosPlacar = data.filter((d: any) => d.sistema_acertou_placar).length;

      return {
        total,
        pctResultado: total > 0 ? Math.round((acertosResultado / total) * 100) : 0,
        pctPlacar: total > 0 ? Math.round((acertosPlacar / total) * 100) : 0,
        totalUsuarios: data.reduce((s: number, d: any) => s + (d.total_usuarios_palpitaram || 0), 0),
        usuariosAcertaram: data.reduce((s: number, d: any) => s + (d.usuarios_acertaram_resultado || 0), 0),
      };
    },
    staleTime: 120_000,
    enabled: false, // lazy: only when explicitly enabled
  });
}

// AI prediction stats
export function useAIPredictionStats() {
  return useQuery({
    queryKey: ['dashboard-ai-predictions'],
    queryFn: async () => {
      const data = await fetchAllRecords<any>(
        'comparativo_resultados',
        'sistema_acertou_resultado, sistema_acertou_placar'
      );

      const total = data.length;
      const acertosResultado = data.filter((d: any) => d.sistema_acertou_resultado).length;
      const acertosPlacar = data.filter((d: any) => d.sistema_acertou_placar).length;

      return {
        total,
        pctResultado: total > 0 ? Math.round((acertosResultado / total) * 100) : 0,
        pctPlacar: total > 0 ? Math.round((acertosPlacar / total) * 100) : 0,
      };
    },
    staleTime: 120_000,
    enabled: false, // lazy
  });
}

// Data integrity alerts — heavy, must be triggered explicitly.
export function useIntegrityAlerts(enabled: boolean = false) {
  return useQuery({
    queryKey: ['dashboard-integrity-alerts'],
    queryFn: async () => {
      const safe = async <T,>(p: Promise<T>, fb: T): Promise<T> => {
        try { return await p; } catch { return fb; }
      };

      const [noScore, noApiId, noSlug, failedSyncs] = await Promise.all([
        safe(countAllRecords('partidas', q => q.eq('status', 'finished').is('gols_casa', null)), 0),
        safe(countAllRecords('partidas', q => q.is('api_id', null)), 0),
        safe(countAllRecords('times', q => q.is('slug', null)), 0),
        safe(supabase.from('sync_logs').select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .then(r => r.count || 0), 0),
      ]);

      return { noScore, noApiId, noSlug, failedSyncs };
    },
    staleTime: 300_000,
    enabled,
    retry: 0,
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
