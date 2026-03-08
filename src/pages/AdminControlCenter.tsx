import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useSystemHealth, useSyncSources, useSyncLogs, useUserStats, useContentStats, usePriorityStats } from "@/hooks/useAdminStats";
import { useRetroactiveArticles } from "@/hooks/useRetroactiveArticles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, RefreshCw, Play, Pause, AlertTriangle, CheckCircle, XCircle,
  Database, Zap, FileText, Users, Settings, BarChart3, Search, 
  Clock, TrendingUp, Shield, Crown, Eye, Copy, RotateCcw, 
  Activity, Server, Calendar, Newspaper, Trophy, Target, ExternalLink, MapPin
} from "lucide-react";
import { Link } from "react-router-dom";
import { TeamBadge } from "@/components/ui/TeamBadge";

// Health Status Card Component
function HealthCard({ 
  title, 
  value, 
  subtitle, 
  status, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  status?: 'ok' | 'warning' | 'error';
  icon: any;
}) {
  const statusColors = {
    ok: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted ${status ? statusColors[status] : 'text-muted-foreground'}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sync Source Row Component
function SyncSourceRow({ 
  source, 
  onSync, 
  onPause, 
  syncing 
}: { 
  source: any; 
  onSync: () => void; 
  onPause: () => void;
  syncing: boolean;
}) {
  const statusBadge = {
    active: <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Ativo</Badge>,
    inactive: <Badge variant="outline">Pausado</Badge>,
    error: <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Erro</Badge>
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{source.name}</h4>
          {statusBadge[source.status as keyof typeof statusBadge]}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          {source.lastRun && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(source.lastRun), { addSuffix: true, locale: ptBR })}
            </span>
          )}
          <span>{source.lastProcessed} itens</span>
          <span>{source.avgDuration}s média</span>
          {source.errorRate > 0 && (
            <span className="text-red-500">{source.errorRate}% erros</span>
          )}
          {source.rateLimitPerDay && (
            <span>{source.requestsToday}/{source.rateLimitPerDay} req/dia</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onSync}
          disabled={syncing}
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onPause}>
          <Pause className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Log Entry Component
function LogEntry({ log, onReprocess }: { log: any; onReprocess: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
    running: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    pending: <Clock className="w-4 h-4 text-yellow-500" />
  };

  return (
    <div className="border-b border-border last:border-0">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {statusIcon[log.status as keyof typeof statusIcon] || <Clock className="w-4 h-4" />}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{log.entity_type}</span>
              {log.source_name && (
                <Badge variant="outline" className="text-xs">{log.source_name}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {log.started_at && format(new Date(log.started_at), 'dd/MM HH:mm', { locale: ptBR })}
              {' • '}
              {log.items_processed} processados, {log.items_created} criados, {log.items_failed} falhas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {log.status === 'failed' && (
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onReprocess(); }}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="p-3 bg-muted/30 text-xs">
          {log.error_message && (
            <div className="mb-2 p-2 bg-red-500/10 rounded text-red-500">
              {log.error_message}
            </div>
          )}
          {log.details && (
            <pre className="overflow-auto max-h-40 text-muted-foreground">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          )}
          <Button size="sm" variant="outline" className="mt-2" onClick={() => navigator.clipboard.writeText(JSON.stringify(log, null, 2))}>
            <Copy className="w-3 h-3 mr-1" /> Copiar
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminControlCenter() {
  const { isAdmin, isLoading } = useAdminAccess();
  const { toast } = useToast();
  
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useSystemHealth();
  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = useSyncSources();
  const { data: userStats } = useUserStats();
  const { data: contentStats } = useContentStats();
  const { data: priorityStats } = usePriorityStats();
  
  // Retroactive articles generation
  const {
    progress: retroactiveProgress,
    progressPercentage,
    progressLoading: retroactiveLoading,
    isGenerating,
    lastResults,
    startGeneration,
    refetchProgress: refetchRetroactive,
  } = useRetroactiveArticles();
  const [batchSize, setBatchSize] = useState(10);
  
  const [logFilters, setLogFilters] = useState({ status: '', type: '', limit: 50 });
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useSyncLogs(logFilters);
  
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingEstaduais, setSyncingEstaduais] = useState(false);

  // Bulk CSV import state
  const [csvImportState, setCsvImportState] = useState<{
    running: boolean;
    currentFile: string;
    log: string[];
    results: { file: string; status: 'pending' | 'ok' | 'fail' | 'processing'; inserted: number; updated: number; error?: string }[];
  }>({ running: false, currentFile: '', log: [], results: [] });

  const CSV_FILES = [
    { file: 'Brasileirao_Matches.csv', league_id: 'c47cb84c-8cb0-444b-a2b7-9f328c20cc72', country: 'Brasil', label: 'Brasileirão Série A' },
    { file: 'Brazilian_Cup_Matches.csv', league_id: 'dadb34d3-3d0b-4e0a-a25c-10cbde5dbafd', country: 'Brasil', label: 'Copa do Brasil' },
    { file: 'Libertadores_Matches.csv', league_id: 'a05c6f7e-7a3e-493a-81ab-5c54f59c8b05', country: 'América do Sul', label: 'Copa Libertadores' },
  ];

  const runBulkCsvImport = async () => {
    setCsvImportState({
      running: true,
      currentFile: '',
      log: ['🚀 Iniciando importação em lote dos 3 CSVs...'],
      results: CSV_FILES.map(f => ({ file: f.label, status: 'pending', inserted: 0, updated: 0 })),
    });

    for (let fi = 0; fi < CSV_FILES.length; fi++) {
      const csvFile = CSV_FILES[fi];
      setCsvImportState(prev => ({
        ...prev,
        currentFile: csvFile.label,
        log: [...prev.log, `📂 Baixando ${csvFile.file}...`],
        results: prev.results.map((r, i) => i === fi ? { ...r, status: 'processing' } : r),
      }));

      try {
        // Fetch CSV from public folder
        const res = await fetch(`/data/${csvFile.file}`);
        if (!res.ok) throw new Error(`Falha ao baixar ${csvFile.file}: HTTP ${res.status}`);
        const csvText = await res.text();

        setCsvImportState(prev => ({
          ...prev,
          log: [...prev.log, `📊 ${csvFile.label}: ${csvText.split('\\n').length - 1} linhas detectadas. Enviando para importação...`],
        }));

        // Call edge function with continuation support
        let offset = 0;
        let batchId: string | undefined;
        let totalInserted = 0;
        let totalUpdated = 0;

        while (true) {
          const { data, error } = await supabase.functions.invoke('import-csv-direct', {
            body: {
              csv_text: csvText,
              league_id: csvFile.league_id,
              country: csvFile.country,
              file_name: csvFile.file,
              batch_id: batchId,
              offset,
            },
          });

          if (error) throw error;

          totalInserted = data.inserted || 0;
          totalUpdated = data.updated || 0;
          batchId = data.batch_id;

          if (data.status === 'partial') {
            offset = data.next_offset;
            setCsvImportState(prev => ({
              ...prev,
              log: [...prev.log, `⏳ ${csvFile.label}: ${offset}/${data.total} processados (parcial). Continuando...`],
              results: prev.results.map((r, i) => i === fi ? { ...r, inserted: totalInserted, updated: totalUpdated } : r),
            }));
            continue;
          }

          // Completed
          setCsvImportState(prev => ({
            ...prev,
            log: [...prev.log, `✅ ${csvFile.label}: ${totalInserted} inseridos, ${totalUpdated} atualizados`],
            results: prev.results.map((r, i) => i === fi ? { ...r, status: 'ok', inserted: totalInserted, updated: totalUpdated } : r),
          }));
          break;
        }
      } catch (e) {
        const errMsg = String(e);
        setCsvImportState(prev => ({
          ...prev,
          log: [...prev.log, `❌ ${csvFile.label}: ${errMsg}`],
          results: prev.results.map((r, i) => i === fi ? { ...r, status: 'fail', error: errMsg } : r),
        }));
      }
    }

    setCsvImportState(prev => ({
      ...prev,
      running: false,
      currentFile: '',
      log: [...prev.log, '🏁 Importação em lote concluída!'],
    }));
    toast({ title: 'Importação CSV concluída!', description: 'Os 3 arquivos foram processados.' });
  };

  // Background jobs state (synced from database via realtime)
  const [loopState, setLoopState] = useState<{
    predictions: { running: boolean; generated: number; failed: number; total: number; log: string[] };
    retroPredictions: { running: boolean; generated: number; failed: number; total: number; log: string[] };
    analyses: { running: boolean; generated: number; failed: number; total: number; log: string[]; tasks: { match: string; status: 'pending' | 'ok' | 'fail'; error?: string }[] };
    validations: { running: boolean; generated: number; failed: number; total: number; pending: number; log: string[]; articles: { slug: string; titulo: string; timeCasa: string; timeFora: string; data: string }[] };
    imageFix: { running: boolean; fixed: number; failed: number; pending: number; log: string[]; results: { id: string; titulo: string; slug: string; success: boolean; error?: string }[] };
  }>({
    predictions: { running: false, generated: 0, failed: 0, total: 0, log: [] },
    retroPredictions: { running: false, generated: 0, failed: 0, total: 0, log: [] },
    analyses: { running: false, generated: 0, failed: 0, total: 0, log: [], tasks: [] },
    validations: { running: false, generated: 0, failed: 0, total: 0, pending: 0, log: [], articles: [] },
    imageFix: { running: false, fixed: 0, failed: 0, pending: 0, log: [], results: [] },
  });

  // Sync background_jobs table → loopState via realtime
  useEffect(() => {
    const syncJob = (job: any) => {
      if (!job) return;
      const p = job.progress || {};
      const running = job.status === 'running';
      const logArr = p.last_log ? [p.last_log] : [];

      switch (job.job_type) {
        case 'predictions':
          setLoopState(prev => ({ ...prev, predictions: { running, generated: p.generated || 0, failed: p.failed || 0, total: p.total || 0, log: logArr } }));
          break;
        case 'retro_predictions':
          setLoopState(prev => ({ ...prev, retroPredictions: { running, generated: p.generated || 0, failed: p.failed || 0, total: p.total || 0, log: logArr } }));
          break;
        case 'analyses':
          setLoopState(prev => ({ ...prev, analyses: { running, generated: p.generated || 0, failed: p.failed || 0, total: p.total || 0, log: logArr, tasks: [] } }));
          break;
        case 'validations':
          setLoopState(prev => ({ ...prev, validations: { running, generated: p.generated || 0, failed: p.failed || 0, total: p.total || 0, pending: p.pending || 0, log: logArr, articles: p.last_articles || [] } }));
          break;
        case 'image_fix':
          setLoopState(prev => ({ ...prev, imageFix: { running, fixed: p.fixed || 0, failed: p.failed || 0, pending: p.pending || 0, log: logArr, results: p.last_results || [] } }));
          break;
      }
    };

    // Initial fetch
    (supabase as any).from('background_jobs').select('*').then(({ data }: any) => {
      (data || []).forEach(syncJob);
    });

    // Realtime subscription
    const channel = supabase
      .channel('bg-jobs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'background_jobs' }, (payload) => {
        syncJob(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const startJob = async (jobType: string) => {
    const { error } = await (supabase as any).from('background_jobs')
      .update({
        status: 'running',
        progress: {},
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('job_type', jobType);

    if (error) {
      toast({ title: 'Erro ao iniciar job', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Job iniciado!', description: 'O processamento roda em background. Você pode navegar livremente.' });
    }
  };

  const stopJob = async (jobType: string) => {
    const { error } = await (supabase as any).from('background_jobs')
      .update({
        status: 'stopped',
        updated_at: new Date().toISOString()
      })
      .eq('job_type', jobType);

    if (error) {
      toast({ title: 'Erro ao parar job', description: error.message, variant: 'destructive' });
    }
  };

  // Sync handlers
  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      // Sync in order of dependency
      await supabase.functions.invoke('sync-football-data');
      await supabase.functions.invoke('sync-api-football', { body: { leagues: [73, 13, 11] } });
      
      toast({ title: "Sincronização completa!", description: "Todas as fontes foram sincronizadas." });
      refetchHealth();
      refetchSources();
      refetchLogs();
    } catch (error) {
      toast({ title: "Erro na sincronização", description: String(error), variant: "destructive" });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncSource = async (sourceId: string, sourceName: string) => {
    setSyncingSource(sourceId);
    try {
      let functionName = '';
      if (sourceName.toLowerCase().includes('football-data')) {
        functionName = 'sync-football-data';
      } else if (sourceName.toLowerCase().includes('api-football')) {
        functionName = 'sync-api-football';
      } else if (sourceName.toLowerCase().includes('openfootball')) {
        functionName = 'sync-openfootball';
      } else if (sourceName.toLowerCase().includes('scorebat')) {
        functionName = 'sync-highlights';
      }

      if (functionName) {
        await supabase.functions.invoke(functionName);
        toast({ title: "Sincronização concluída!", description: `${sourceName} sincronizado.` });
        refetchSources();
        refetchLogs();
      }
    } catch (error) {
      toast({ title: "Erro", description: String(error), variant: "destructive" });
    } finally {
      setSyncingSource(null);
    }
  };

  const handleRecalculatePriorities = async () => {
    try {
      await supabase.functions.invoke('calculate-priority-scores');
      toast({ title: "Prioridades recalculadas!" });
    } catch (error) {
      toast({ title: "Erro", description: String(error), variant: "destructive" });
    }
  };

  const handleGenerateContent = async (type: string) => {
    try {
      let fn = '';
      switch (type) {
        case 'predictions': fn = 'generate-predictions'; break;
        case 'analysis': fn = 'generate-match-analysis'; break;
        case 'weekly': fn = 'generate-weekly-validation'; break;
        case 'validation': fn = 'generate-validation-article'; break;
        case 'team-pillar': fn = 'generate-team-pillar'; break;
        case 'league-pillar': fn = 'generate-league-pillar'; break;
      }
      if (fn) {
        await supabase.functions.invoke(fn);
        toast({ title: "Conteúdo gerado!", description: `${type} processado.` });
      }
    } catch (error) {
      toast({ title: "Erro", description: String(error), variant: "destructive" });
    }
  };

  const handleRebuildArtilharia = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('rebuild-artilharia');
      if (error) throw error;
      toast({ 
        title: "Artilharia reconstruída!", 
        description: `${data.goals_processed} gols processados, ${data.aggregations_created} agregações criadas.` 
      });
      refetchLogs();
    } catch (error) {
      toast({ 
        title: "Erro ao reconstruir artilharia", 
        description: String(error), 
        variant: "destructive" 
      });
    }
  };



  const handleSyncEstaduais = async () => {
    setSyncingEstaduais(true);
    try {
      toast({ 
        title: "Sincronização de estaduais iniciada!", 
        description: "Descobrindo temporadas disponíveis para 11 ligas. Isso pode levar até 2 minutos com rate limiting." 
      });
      const { data, error } = await supabase.functions.invoke('sync-estaduais-bulk');
      if (error) throw error;
      const desc = data.stoppedEarly
        ? `Parou cedo por tempo. ${data.leaguesSynced} ligas, ${data.seasonsSynced} temporadas, ${data.matchesUpserted} partidas. API: ${data.apiRequestsMade} req usadas.`
        : `${data.leaguesSynced} ligas, ${data.seasonsSynced} temporadas, ${data.matchesUpserted} partidas importadas. API: ${data.apiRequestsMade} req usadas, ${data.apiRemainingQuota} restantes.`;
      toast({ title: "Estaduais sincronizados!", description: desc });
      refetchLogs();
    } catch (error) {
      toast({ 
        title: "Erro ao sincronizar estaduais", 
        description: String(error), 
        variant: "destructive" 
      });
    } finally {
      setSyncingEstaduais(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <Helmet>
        <title>Admin Control Center | Statball</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <AdminLayout>
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Admin Control Center
              </h1>
              <p className="text-muted-foreground text-sm">Controle centralizado do sistema</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/admin/privacidade/lgpd">
                  <Shield className="w-4 h-4 mr-2" />
                  LGPD
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/integracoes/analytics">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/times">
                  <Users className="w-4 h-4 mr-2" />
                  Times
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/qualidade-dados">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Qualidade
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/usuarios">
                  <Users className="w-4 h-4 mr-2" />
                  Usuários
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/planos">
                  <Crown className="w-4 h-4 mr-2" />
                  Planos
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/webhooks">
                  <Zap className="w-4 h-4 mr-2" />
                  Webhooks
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/csv-import">
                  <FileText className="w-4 h-4 mr-2" />
                  CSV Import
                </Link>
              </Button>
              <Button 
                onClick={handleSyncAll} 
                disabled={syncingAll}
                className="bg-primary"
              >
                {syncingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sincronizar Tudo
              </Button>
            </div>
          </div>

          {/* Health Dashboard */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
            {healthLoading ? (
              [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : (
              <>
                <HealthCard 
                  title="Fontes de Dados" 
                  value={`${health?.sources.active}/${health?.sources.total}`}
                  subtitle={health?.sources.withErrors ? `${health.sources.withErrors} com erro` : 'Todas OK'}
                  status={health?.sources.status}
                  icon={Database}
                />
                <HealthCard 
                  title="Última Sync" 
                  value={health?.lastSync.timestamp ? formatDistanceToNow(new Date(health.lastSync.timestamp), { locale: ptBR }) : 'N/A'}
                  subtitle={health?.lastSync.source || ''}
                  icon={Clock}
                />
                <HealthCard 
                  title="Processados Hoje" 
                  value={health?.processedToday || 0}
                  icon={Activity}
                />
                <HealthCard 
                  title="Erros 24h" 
                  value={health?.errorsLast24h || 0}
                  status={health?.errorsLast24h && health.errorsLast24h > 5 ? 'error' : health?.errorsLast24h && health.errorsLast24h > 0 ? 'warning' : 'ok'}
                  icon={AlertTriangle}
                />
                <HealthCard 
                  title="Football-Data" 
                  value={`${health?.apiUsage.footballData || 0} req`}
                  subtitle="Uso hoje"
                  icon={Server}
                />
                <HealthCard 
                  title="API-Football" 
                  value={`${health?.apiUsage.apiFootball || 0} req`}
                  subtitle="Uso hoje"
                  icon={Server}
                />
              </>
            )}
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="syncs" className="space-y-4">
            <TabsList className="grid grid-cols-6 w-full max-w-3xl">
              <TabsTrigger value="syncs" className="flex items-center gap-1">
                <RefreshCw className="w-4 h-4" /> Syncs
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> Logs
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-1">
                <Newspaper className="w-4 h-4" /> Conteúdo
              </TabsTrigger>
              <TabsTrigger value="priority" className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Prioridade
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1">
                <Users className="w-4 h-4" /> Usuários
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex items-center gap-1">
                <Target className="w-4 h-4" /> SEO
              </TabsTrigger>
            </TabsList>

            {/* Syncs Tab */}
            <TabsContent value="syncs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Sincronizações
                  </CardTitle>
                  <CardDescription>Gerencie todas as fontes de dados</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {sourcesLoading ? (
                    <div className="p-4"><Skeleton className="h-20" /></div>
                  ) : (
                    sources?.map(source => (
                      <SyncSourceRow 
                        key={source.id}
                        source={source}
                        onSync={() => handleSyncSource(source.id, source.name)}
                        onPause={() => {}}
                        syncing={syncingSource === source.id}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Logs e Diagnóstico
                      </CardTitle>
                      <CardDescription>Histórico de operações</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={logFilters.status} 
                        onValueChange={(v) => setLogFilters(prev => ({ ...prev, status: v }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="failed">Falha</SelectItem>
                          <SelectItem value="running">Rodando</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[500px] overflow-auto">
                  {logsLoading ? (
                    <div className="p-4"><Skeleton className="h-40" /></div>
                  ) : logs?.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">Nenhum log encontrado</div>
                  ) : (
                    logs?.map(log => (
                      <LogEntry key={log.id} log={log} onReprocess={() => {}} />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Retroactive Articles Generation Card */}
                <Card className="md:col-span-2 border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Newspaper className="w-5 h-5 text-primary" />
                      Geração Retroativa de Análises SEO
                    </CardTitle>
                    <CardDescription>
                      Gerar artigos de análise pré-jogo para partidas finalizadas sem notícia
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso geral</span>
                        <span className="font-medium">
                          {retroactiveLoading ? (
                            <Skeleton className="w-20 h-4 inline-block" />
                          ) : (
                            `${retroactiveProgress?.processed || 0} de ${retroactiveProgress?.total || 0} (${progressPercentage}%)`
                          )}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Partidas sem análise: {retroactiveProgress?.remaining || 0}</span>
                        <span>Meta: 100%</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Lote:</span>
                        <Select
                          value={String(batchSize)}
                          onValueChange={(v) => setBatchSize(Number(v))}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={() => startGeneration(batchSize)}
                        disabled={isGenerating}
                        className="bg-primary"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Iniciar Lote
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetchRetroactive()}
                        disabled={retroactiveLoading}
                      >
                        <RefreshCw className={`w-4 h-4 ${retroactiveLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    {/* Last Results */}
                    {lastResults.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Últimos processados:</h4>
                        <div className="max-h-40 overflow-auto space-y-1">
                          {lastResults.map((result, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between text-xs p-2 rounded ${
                                result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {result.success ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                                {result.success && result.slug ? (
                                  <a
                                    href={`/noticias/${result.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline hover:text-primary/80"
                                  >
                                    {result.time_casa} x {result.time_fora}
                                  </a>
                                ) : (
                                  <span>
                                    {result.time_casa} x {result.time_fora}
                                  </span>
                                )}
                                <span className="text-muted-foreground">
                                  ({new Date(result.data).toLocaleDateString('pt-BR')})
                                </span>
                              </div>
                              <span className="text-muted-foreground">
                                {result.success ? `${result.word_count} palavras` : result.error?.slice(0, 30)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Auto-Loop: Palpites Futuros */}
                <Card className="md:col-span-2 border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="w-5 h-5 text-primary" />
                      Geração Automática de Palpites (Futuros)
                    </CardTitle>
                    <CardDescription>Gera palpites para todas as partidas agendadas sem palpite, em loop até completar</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => startJob('predictions')}
                        disabled={loopState.predictions.running}
                        className="bg-primary"
                      >
                        {loopState.predictions.running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {loopState.predictions.running ? 'Processando...' : 'Iniciar Loop'}
                      </Button>
                      {loopState.predictions.running && (
                        <Button variant="destructive" size="sm" onClick={() => stopJob('predictions')}>
                          <Pause className="w-4 h-4 mr-1" /> Parar
                        </Button>
                      )}
                      {loopState.predictions.generated > 0 && (
                        <Badge variant="outline">{loopState.predictions.generated} gerados / {loopState.predictions.failed} falhas</Badge>
                      )}
                    </div>
                    {loopState.predictions.log.length > 0 && (
                      <div className="bg-muted/50 rounded p-3 max-h-32 overflow-auto text-xs font-mono space-y-1">
                        {loopState.predictions.log.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Auto-Loop: Palpites Retroativos */}
                <Card className="md:col-span-2 border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <RotateCcw className="w-5 h-5 text-primary" />
                      Geração Automática de Palpites (Retroativos)
                    </CardTitle>
                    <CardDescription>Gera palpites para partidas finalizadas sem palpite + processa comparativo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => startJob('retro_predictions')}
                        disabled={loopState.retroPredictions.running}
                        className="bg-primary"
                      >
                        {loopState.retroPredictions.running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {loopState.retroPredictions.running ? 'Processando...' : 'Iniciar Loop'}
                      </Button>
                      {loopState.retroPredictions.running && (
                        <Button variant="destructive" size="sm" onClick={() => stopJob('retro_predictions')}>
                          <Pause className="w-4 h-4 mr-1" /> Parar
                        </Button>
                      )}
                      {loopState.retroPredictions.generated > 0 && (
                        <Badge variant="outline">{loopState.retroPredictions.generated} gerados / {loopState.retroPredictions.failed} falhas</Badge>
                      )}
                    </div>
                    {loopState.retroPredictions.log.length > 0 && (
                      <div className="bg-muted/50 rounded p-3 max-h-32 overflow-auto text-xs font-mono space-y-1">
                        {loopState.retroPredictions.log.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Auto-Loop: Análises */}
                <Card className="md:col-span-2 border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-primary" />
                      Geração Automática de Análises Pré-Jogo
                    </CardTitle>
                    <CardDescription>Gera análises IA 1 por vez para todas as partidas pendentes, com tratamento de rate limit e retry automático</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        onClick={() => startJob('analyses')}
                        disabled={loopState.analyses.running}
                        className="bg-primary"
                      >
                        {loopState.analyses.running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {loopState.analyses.running ? 'Processando...' : 'Gerar Todas as Análises Pendentes'}
                      </Button>
                      {loopState.analyses.running && (
                        <Button variant="destructive" size="sm" onClick={() => stopJob('analyses')}>
                          <Pause className="w-4 h-4 mr-1" /> Parar
                        </Button>
                      )}
                      {(loopState.analyses.generated > 0 || loopState.analyses.failed > 0) && (
                        <Badge variant="outline">{loopState.analyses.generated} geradas / {loopState.analyses.failed} falhas</Badge>
                      )}
                    </div>
                    {/* Progress bar */}
                    {loopState.analyses.total > 0 && (
                      <div className="space-y-1">
                        <Progress value={(loopState.analyses.generated / loopState.analyses.total) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">{loopState.analyses.generated} de {loopState.analyses.total} ({Math.round((loopState.analyses.generated / loopState.analyses.total) * 100)}%)</p>
                      </div>
                    )}
                    {/* Task list */}
                    {loopState.analyses.tasks.length > 0 && (
                      <div className="border border-border rounded max-h-40 overflow-auto">
                        {loopState.analyses.tasks.slice(-20).map((task, i) => (
                          <div key={i} className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border last:border-0 ${task.status === 'ok' ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                            {task.status === 'ok' ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> : <XCircle className="w-3 h-3 text-red-500 shrink-0" />}
                            <span className="truncate">{task.match}</span>
                            {task.error && <span className="text-muted-foreground ml-auto truncate max-w-[200px]">{task.error}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Console log */}
                    {loopState.analyses.log.length > 0 && (
                      <div className="bg-muted/50 rounded p-3 max-h-32 overflow-auto text-xs font-mono space-y-1">
                        {loopState.analyses.log.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Auto-Loop: Artigos de Validação Pós-Jogo */}
                <Card className="md:col-span-2 border-green-500/30 bg-green-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Geração Automática de Artigos de Validação Pós-Jogo
                    </CardTitle>
                    <CardDescription>Gera artigos comparando palpite da IA x resultado real. 1 por vez com rate limit handling.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">Com comparativo</p>
                        <p className="text-lg font-bold">{loopState.validations.total || contentStats?.validationArticles || '—'}</p>
                      </div>
                      <div className="p-3 rounded bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">Com artigo</p>
                        <p className="text-lg font-bold text-green-600">{loopState.validations.generated > 0 ? (loopState.validations.total - loopState.validations.pending) : (contentStats?.validationArticles || '—')}</p>
                      </div>
                      <div className="p-3 rounded bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">Pendentes</p>
                        <p className="text-lg font-bold text-yellow-600">{loopState.validations.pending || '—'}</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        onClick={() => startJob('validations')}
                        disabled={loopState.validations.running}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {loopState.validations.running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {loopState.validations.running ? 'Gerando...' : 'Gerar Artigos de Validação'}
                      </Button>
                      {loopState.validations.running && (
                        <Button variant="destructive" size="sm" onClick={() => stopJob('validations')}>
                          <Pause className="w-4 h-4 mr-1" /> Parar
                        </Button>
                      )}
                      {(loopState.validations.generated > 0 || loopState.validations.failed > 0) && (
                        <Badge variant="outline">{loopState.validations.generated} gerados / {loopState.validations.failed} falhas</Badge>
                      )}
                    </div>

                    {/* Progress bar */}
                    {loopState.validations.total > 0 && loopState.validations.generated > 0 && (
                      <div className="space-y-1">
                        <Progress value={((loopState.validations.total - loopState.validations.pending) / loopState.validations.total) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {loopState.validations.total - loopState.validations.pending} de {loopState.validations.total} ({Math.round(((loopState.validations.total - loopState.validations.pending) / loopState.validations.total) * 100)}%)
                        </p>
                      </div>
                    )}

                    {/* Recently generated articles with clickable links */}
                    {loopState.validations.articles.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-1">
                          <Eye className="w-4 h-4" /> Últimos artigos gerados:
                        </h4>
                        <div className="border border-border rounded max-h-60 overflow-auto">
                          {loopState.validations.articles.map((article, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs border-b border-border last:border-0 bg-green-500/5">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                <a
                                  href={`/noticias/${article.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline hover:text-primary/80 truncate max-w-[300px]"
                                >
                                  {article.timeCasa} x {article.timeFora}
                                </a>
                                <span className="text-muted-foreground">
                                  ({new Date(article.data).toLocaleDateString('pt-BR')})
                                </span>
                              </div>
                              <a
                                href={`/noticias/${article.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Console log */}
                    {loopState.validations.log.length > 0 && (
                      <div className="bg-muted/50 rounded p-3 max-h-32 overflow-auto text-xs font-mono space-y-1">
                        {loopState.validations.log.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Auto-Loop: Correção Retroativa de Imagens */}
                <Card className="md:col-span-2 border-orange-500/30 bg-orange-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Eye className="w-5 h-5 text-orange-600" />
                      Correção Retroativa de Imagens (Thumbnails)
                    </CardTitle>
                    <CardDescription>
                      Substitui a imagem padrão do Unsplash por imagens únicas geradas via Gemini para cada artigo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">Pendentes</p>
                        <p className="text-lg font-bold text-orange-600">{loopState.imageFix.pending || '—'}</p>
                      </div>
                      <div className="p-3 rounded bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">Corrigidas</p>
                        <p className="text-lg font-bold text-green-600">{loopState.imageFix.fixed || 0}</p>
                      </div>
                      <div className="p-3 rounded bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">Erros</p>
                        <p className="text-lg font-bold text-red-600">{loopState.imageFix.failed || 0}</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        onClick={() => startJob('image_fix')}
                        disabled={loopState.imageFix.running}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        {loopState.imageFix.running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {loopState.imageFix.running ? 'Corrigindo...' : 'Iniciar Correção de Imagens'}
                      </Button>
                      {loopState.imageFix.running && (
                        <Button variant="destructive" size="sm" onClick={() => stopJob('image_fix')}>
                          <Pause className="w-4 h-4 mr-1" /> Parar
                        </Button>
                      )}
                      {(loopState.imageFix.fixed > 0 || loopState.imageFix.failed > 0) && (
                        <Badge variant="outline">{loopState.imageFix.fixed} corrigidas / {loopState.imageFix.failed} falhas</Badge>
                      )}
                    </div>

                    {/* Recent results */}
                    {loopState.imageFix.results.length > 0 && (
                      <div className="border border-border rounded max-h-48 overflow-auto">
                        {loopState.imageFix.results.slice(0, 30).map((r, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-1.5 text-xs border-b border-border last:border-0 ${r.success ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                            <div className="flex items-center gap-2">
                              {r.success ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> : <XCircle className="w-3 h-3 text-red-500 shrink-0" />}
                              {r.success && r.slug ? (
                                <a href={`/noticias/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 truncate max-w-[300px]">
                                  {r.titulo?.slice(0, 60)}
                                </a>
                              ) : (
                                <span className="truncate max-w-[300px]">{r.titulo?.slice(0, 60)}</span>
                              )}
                            </div>
                            {r.error && <span className="text-muted-foreground ml-2 truncate max-w-[200px]">{r.error}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Console log */}
                    {loopState.imageFix.log.length > 0 && (
                      <div className="bg-muted/50 rounded p-3 max-h-32 overflow-auto text-xs font-mono space-y-1">
                        {loopState.imageFix.log.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bulk CSV Import */}
                <Card className="md:col-span-2 border-secondary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Database className="w-5 h-5 text-secondary" />
                      Importar CSVs Históricos em Lote
                    </CardTitle>
                    <CardDescription>Importa Brasileirão, Copa do Brasil e Libertadores de uma só vez (dados pré-carregados)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        onClick={runBulkCsvImport}
                        disabled={csvImportState.running}
                        variant="secondary"
                      >
                        {csvImportState.running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {csvImportState.running ? `Importando ${csvImportState.currentFile}...` : 'Importar 3 CSVs'}
                      </Button>
                    </div>
                    {/* File status list */}
                    {csvImportState.results.length > 0 && (
                      <div className="border border-border rounded">
                        {csvImportState.results.map((r, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm border-b border-border last:border-0 ${
                            r.status === 'ok' ? 'bg-green-500/5' : r.status === 'fail' ? 'bg-red-500/5' : r.status === 'processing' ? 'bg-blue-500/5' : ''
                          }`}>
                            <div className="flex items-center gap-2">
                              {r.status === 'ok' && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {r.status === 'fail' && <XCircle className="w-4 h-4 text-red-500" />}
                              {r.status === 'processing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                              {r.status === 'pending' && <Clock className="w-4 h-4 text-muted-foreground" />}
                              <span>{r.file}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.status === 'ok' && `${r.inserted} inseridos, ${r.updated} atualizados`}
                              {r.status === 'fail' && r.error?.slice(0, 50)}
                              {r.status === 'processing' && 'Processando...'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Console */}
                    {csvImportState.log.length > 0 && (
                      <div className="bg-muted/50 rounded p-3 max-h-40 overflow-auto text-xs font-mono space-y-1">
                        {csvImportState.log.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Estatísticas de Conteúdo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Notícias publicadas</span>
                      <span className="font-medium">{contentStats?.publishedNews || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Artigos de validação</span>
                      <span className="font-medium">{contentStats?.validationArticles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validações semanais</span>
                      <span className="font-medium">{contentStats?.weeklyArticles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Páginas pilares (times)</span>
                      <span className="font-medium">{contentStats?.teamPillars || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Páginas pilares (ligas)</span>
                      <span className="font-medium">{contentStats?.leaguePillars || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Outras Ações</CardTitle>
                    <CardDescription>Geração avulsa de conteúdo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleGenerateContent('weekly')}>
                      <Calendar className="w-4 h-4 mr-2" /> Gerar Validação Semanal
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleGenerateContent('validation')}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Gerar Artigos de Validação
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleGenerateContent('team-pillar')}>
                      <Shield className="w-4 h-4 mr-2" /> Gerar Pilares de Times
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleGenerateContent('league-pillar')}>
                      <Trophy className="w-4 h-4 mr-2" /> Gerar Pilares de Ligas
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleRebuildArtilharia}>
                      <Trophy className="w-4 h-4 mr-2" /> Reconstruir Artilharia
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleSyncEstaduais} disabled={syncingEstaduais}>
                      {syncingEstaduais ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                      {syncingEstaduais ? 'Sincronizando Estaduais...' : 'Sincronizar Estaduais'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Priority Tab */}
            <TabsContent value="priority">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Campeonatos Prioritários</CardTitle>
                      <Button size="sm" variant="outline" onClick={handleRecalculatePriorities}>
                        <RefreshCw className="w-4 h-4 mr-1" /> Recalcular
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {priorityStats?.topLeagues.map((league: any, i: number) => (
                        <div key={league.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">#{i + 1}</span>
                            <span className="font-medium">{league.nome}</span>
                          </div>
                          <Badge variant="outline">{Math.round(league.priority_score)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Times Prioritários</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {priorityStats?.topTeams.map((team: any, i: number) => (
                        <div key={team.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">#{i + 1}</span>
                            <TeamBadge 
                              name={team.nome}
                              primaryColor={team.cores?.primary}
                              secondaryColor={team.cores?.secondary}
                              size="sm"
                            />
                            <span className="font-medium">{team.nome}</span>
                          </div>
                          <Badge variant="outline">{Math.round(team.priority_score)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="w-8 h-8 mx-auto text-primary mb-2" />
                    <p className="text-3xl font-bold">{userStats?.total || 0}</p>
                    <p className="text-muted-foreground text-sm">Total de usuários</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <Crown className="w-8 h-8 mx-auto text-secondary mb-2" />
                    <p className="text-3xl font-bold">{userStats?.premium || 0}</p>
                    <p className="text-muted-foreground text-sm">Assinantes Premium</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <Shield className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-3xl font-bold">{userStats?.free || 0}</p>
                    <p className="text-muted-foreground text-sm">Usuários Free</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Assinaturas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex justify-between p-3 rounded bg-green-500/10">
                      <span>Assinaturas ativas</span>
                      <Badge className="bg-green-500">{userStats?.activeSubscriptions || 0}</Badge>
                    </div>
                    <div className="flex justify-between p-3 rounded bg-red-500/10">
                      <span>Canceladas</span>
                      <Badge variant="destructive">{userStats?.cancelledSubscriptions || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo">
              <Card>
                <CardHeader>
                  <CardTitle>SEO e Indexação</CardTitle>
                  <CardDescription>Monitoramento de qualidade SEO</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-medium">Páginas indexáveis</span>
                      </div>
                      <p className="text-2xl font-bold">{(contentStats?.publishedNews || 0) + (contentStats?.teamPillars || 0) + (contentStats?.leaguePillars || 0)}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="font-medium">Artigos SEO</span>
                      </div>
                      <p className="text-2xl font-bold">{contentStats?.publishedNews || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="font-medium">Pilares de Times</span>
                      </div>
                      <p className="text-2xl font-bold">{contentStats?.teamPillars || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        <span className="font-medium">Pilares de Ligas</span>
                      </div>
                      <p className="text-2xl font-bold">{contentStats?.leaguePillars || 0}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Ações SEO</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" /> Auditar Metas
                      </Button>
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-1" /> Verificar Slugs
                      </Button>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="w-4 h-4 mr-1" /> Analisar Links
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  );
}
