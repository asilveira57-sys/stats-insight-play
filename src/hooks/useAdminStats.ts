import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, subHours, format } from "date-fns";

export interface SystemHealth {
  sources: {
    total: number;
    active: number;
    withErrors: number;
    status: 'ok' | 'warning' | 'error';
  };
  lastSync: {
    timestamp: string | null;
    source: string | null;
  };
  processedToday: number;
  errorsLast24h: number;
  contentQueue: {
    pending: number;
    processing: number;
    failed: number;
  };
  apiUsage: {
    footballData: number;
    apiFootball: number;
  };
}

export interface SyncSource {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  lastRun: string | null;
  nextRun: string | null;
  avgDuration: number;
  lastProcessed: number;
  errorRate: number;
  requestsToday: number;
  rateLimitPerDay: number | null;
}

export interface SyncLog {
  id: string;
  source_id: string | null;
  source_name?: string;
  entity_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  items_processed: number;
  items_created: number;
  items_updated: number;
  items_failed: number;
  error_message: string | null;
  details: any;
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin-system-health'],
    queryFn: async (): Promise<SystemHealth> => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const yesterday = format(subHours(now, 24), 'yyyy-MM-dd HH:mm:ss');

      // Fetch data sources
      const { data: sources } = await supabase
        .from('data_sources')
        .select('id, name, status, requests_today, rate_limit_per_day');

      // Fetch recent sync logs
      const { data: recentLogs } = await supabase
        .from('sync_logs')
        .select('*')
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false });

      // Fetch last sync
      const { data: lastSyncData } = await supabase
        .from('sync_logs')
        .select('completed_at, entity_type, source_id, data_sources(name)')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Count content queue (news pending)
      const { count: pendingContent } = await supabase
        .from('partidas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .is('detalhes_sincronizados', false);

      const activeCount = sources?.filter(s => s.status === 'active').length || 0;
      const errorCount = sources?.filter(s => s.status === 'error').length || 0;
      const totalSources = sources?.length || 0;

      const errorsLast24h = recentLogs?.filter(l => l.status === 'failed').length || 0;
      const processedToday = recentLogs?.reduce((sum, l) => sum + (l.items_processed || 0), 0) || 0;

      // API usage
      const footballDataSource = sources?.find(s => s.name?.toLowerCase().includes('football-data'));
      const apiFootballSource = sources?.find(s => s.name?.toLowerCase().includes('api-football'));

      return {
        sources: {
          total: totalSources,
          active: activeCount,
          withErrors: errorCount,
          status: errorCount > 0 ? 'error' : activeCount < totalSources ? 'warning' : 'ok'
        },
        lastSync: {
          timestamp: lastSyncData?.completed_at || null,
          source: (lastSyncData as any)?.data_sources?.name || lastSyncData?.entity_type || null
        },
        processedToday,
        errorsLast24h,
        contentQueue: {
          pending: pendingContent || 0,
          processing: 0,
          failed: 0
        },
        apiUsage: {
          footballData: footballDataSource?.requests_today || 0,
          apiFootball: apiFootballSource?.requests_today || 0
        }
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
}

export function useSyncSources() {
  return useQuery({
    queryKey: ['admin-sync-sources'],
    queryFn: async (): Promise<SyncSource[]> => {
      const { data: sources, error } = await supabase
        .from('data_sources')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;

      // Get last logs for each source
      const { data: logs } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const logsBySource = new Map<string, SyncLog[]>();
      logs?.forEach(log => {
        const key = log.source_id || 'unknown';
        if (!logsBySource.has(key)) {
          logsBySource.set(key, []);
        }
        logsBySource.get(key)!.push(log);
      });

      return (sources || []).map(source => {
        const sourceLogs = logsBySource.get(source.id) || [];
        const lastLog = sourceLogs[0];
        const failedLogs = sourceLogs.filter(l => l.status === 'failed').length;
        const totalLogs = sourceLogs.length;

        // Calculate average duration
        const completedLogs = sourceLogs.filter(l => l.started_at && l.completed_at);
        const avgDuration = completedLogs.length > 0
          ? completedLogs.reduce((sum, l) => {
              const start = new Date(l.started_at!).getTime();
              const end = new Date(l.completed_at!).getTime();
              return sum + (end - start);
            }, 0) / completedLogs.length / 1000
          : 0;

        return {
          id: source.id,
          name: source.name,
          type: source.type,
          status: source.status as 'active' | 'inactive' | 'error',
          lastRun: lastLog?.completed_at || null,
          nextRun: null, // Would need schedule config
          avgDuration: Math.round(avgDuration),
          lastProcessed: lastLog?.items_processed || 0,
          errorRate: totalLogs > 0 ? Math.round((failedLogs / totalLogs) * 100) : 0,
          requestsToday: source.requests_today || 0,
          rateLimitPerDay: source.rate_limit_per_day
        };
      });
    }
  });
}

export function useSyncLogs(filters?: {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  source?: string;
  status?: string;
  search?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['admin-sync-logs', filters],
    queryFn: async (): Promise<SyncLog[]> => {
      let query = supabase
        .from('sync_logs')
        .select('*, data_sources(name)')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters?.type) {
        query = query.eq('entity_type', filters.type);
      }
      if (filters?.source) {
        query = query.eq('source_id', filters.source);
      }
      if (filters?.status && (filters.status === 'pending' || filters.status === 'running' || filters.status === 'completed' || filters.status === 'failed')) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(log => ({
        ...log,
        source_name: (log as any).data_sources?.name
      }));
    }
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      const { count: premiumCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('plano', 'premium');

      const { count: activeSubscriptions } = await supabase
        .from('assinaturas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: cancelledSubscriptions } = await supabase
        .from('assinaturas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled' as const);

      return {
        total: totalProfiles || 0,
        free: (totalProfiles || 0) - (premiumCount || 0),
        premium: premiumCount || 0,
        activeSubscriptions: activeSubscriptions || 0,
        cancelledSubscriptions: cancelledSubscriptions || 0
      };
    }
  });
}

export function useContentStats() {
  return useQuery({
    queryKey: ['admin-content-stats'],
    queryFn: async () => {
      const { count: totalNews } = await supabase
        .from('noticias')
        .select('id', { count: 'exact', head: true });

      const { count: publishedNews } = await supabase
        .from('noticias')
        .select('id', { count: 'exact', head: true })
        .eq('publicada', true);

      const { count: validationArticles } = await supabase
        .from('noticias')
        .select('id', { count: 'exact', head: true })
        .like('slug', 'validacao-%');

      const { count: weeklyArticles } = await supabase
        .from('noticias')
        .select('id', { count: 'exact', head: true })
        .like('slug', 'validacao-semana-%');

      const { count: teamPillars } = await supabase
        .from('times')
        .select('id', { count: 'exact', head: true })
        .not('pillar_content', 'is', null);

      const { count: leaguePillars } = await supabase
        .from('ligas')
        .select('id', { count: 'exact', head: true })
        .not('pillar_content', 'is', null);

      return {
        totalNews: totalNews || 0,
        publishedNews: publishedNews || 0,
        unpublishedNews: (totalNews || 0) - (publishedNews || 0),
        validationArticles: validationArticles || 0,
        weeklyArticles: weeklyArticles || 0,
        teamPillars: teamPillars || 0,
        leaguePillars: leaguePillars || 0
      };
    }
  });
}

export function usePriorityStats() {
  return useQuery({
    queryKey: ['admin-priority-stats'],
    queryFn: async () => {
      const { data: topLeagues } = await supabase
        .from('ligas')
        .select('id, nome, priority_score, score_updated_at')
        .not('priority_score', 'is', null)
        .order('priority_score', { ascending: false })
        .limit(10);

      const { data: topTeams } = await supabase
        .from('times')
        .select('id, nome, priority_score, score_updated_at')
        .not('priority_score', 'is', null)
        .order('priority_score', { ascending: false })
        .limit(10);

      return {
        topLeagues: topLeagues || [],
        topTeams: topTeams || []
      };
    }
  });
}
