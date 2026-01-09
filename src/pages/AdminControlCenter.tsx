import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useSystemHealth, useSyncSources, useSyncLogs, useUserStats, useContentStats, usePriorityStats } from "@/hooks/useAdminStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, RefreshCw, Play, Pause, AlertTriangle, CheckCircle, XCircle,
  Database, Zap, FileText, Users, Settings, BarChart3, Search, 
  Clock, TrendingUp, Shield, Crown, Eye, Copy, RotateCcw, 
  Activity, Server, Calendar, Newspaper, Trophy, Target
} from "lucide-react";

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
  
  const [logFilters, setLogFilters] = useState({ status: '', type: '', limit: 50 });
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useSyncLogs(logFilters);
  
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <Helmet>
        <title>Admin Control Center | Statball</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <Layout>
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
            <div className="flex items-center gap-2">
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
                    <CardTitle>Geração Manual</CardTitle>
                    <CardDescription>Gerar conteúdo sob demanda</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleGenerateContent('predictions')}>
                      <Zap className="w-4 h-4 mr-2" /> Gerar Palpites Faltantes
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleGenerateContent('analysis')}>
                      <FileText className="w-4 h-4 mr-2" /> Gerar Análises Pré-Jogo
                    </Button>
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
      </Layout>
    </>
  );
}
