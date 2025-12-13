import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Activity, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Zap,
  Trophy,
  Users,
  Play,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function HubDashboard() {
  // Fetch data sources
  const { data: sources } = useQuery({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent sync logs
  const { data: syncLogs } = useQuery({
    queryKey: ['sync-logs-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*, data_sources(name)')
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['hub-stats'],
    queryFn: async () => {
      const [matches, teams, leagues, liveMatches] = await Promise.all([
        supabase.from('partidas').select('id', { count: 'exact', head: true }),
        supabase.from('times').select('id', { count: 'exact', head: true }),
        supabase.from('ligas').select('id', { count: 'exact', head: true }).eq('ativa', true),
        supabase.from('partidas').select('id', { count: 'exact', head: true }).eq('status', 'live')
      ]);
      return {
        matches: matches.count || 0,
        teams: teams.count || 0,
        leagues: leagues.count || 0,
        liveMatches: liveMatches.count || 0
      };
    }
  });

  // Fetch today's matches
  const { data: todayMatches } = useQuery({
    queryKey: ['today-matches'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('partidas')
        .select('id')
        .eq('data', today);
      if (error) throw error;
      return data?.length || 0;
    }
  });

  // Get active sources count
  const activeSources = sources?.filter(s => s.status === 'active').length || 0;
  
  // Get error count from last 24h
  const recentErrors = syncLogs?.filter(log => log.status === 'failed').length || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-secondary" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'running': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'inactive': return 'bg-muted text-muted-foreground border-border';
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text mb-2">
              Hub de Dados do Futebol
            </h1>
            <p className="text-muted-foreground">
              Central unificada de dados de múltiplas fontes
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/hub/sources">
              <Button variant="outline" className="border-primary/50">
                <Database className="w-4 h-4 mr-2" />
                Gerenciar Fontes
              </Button>
            </Link>
            <Button className="bg-primary hover:bg-primary/90">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar Tudo
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="glass-card hover-glow">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-2">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{todayMatches}</div>
              <div className="text-xs text-muted-foreground">Jogos Hoje</div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-glow">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center mx-auto mb-2">
                <Activity className="w-5 h-5 text-destructive" />
              </div>
              <div className="text-2xl font-bold">{stats?.liveMatches || 0}</div>
              <div className="text-xs text-muted-foreground">Ao Vivo</div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-glow">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-5 h-5 text-secondary" />
              </div>
              <div className="text-2xl font-bold">{stats?.leagues || 0}</div>
              <div className="text-xs text-muted-foreground">Competições</div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-glow">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div className="text-2xl font-bold">{stats?.teams || 0}</div>
              <div className="text-xs text-muted-foreground">Times</div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-glow">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-2">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{activeSources}</div>
              <div className="text-xs text-muted-foreground">Fontes Ativas</div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-glow">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div className="text-2xl font-bold">{recentErrors}</div>
              <div className="text-xs text-muted-foreground">Erros 24h</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Data Sources */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-display">Fontes de Dados</CardTitle>
              <Link to="/hub/sources">
                <Button variant="ghost" size="sm">Ver todas</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {sources?.slice(0, 5).map((source) => (
                <div key={source.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{source.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {source.type === 'api' ? 'API' : 'GitHub'} • {source.requests_today || 0}/{source.rate_limit_per_day} req/dia
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(source.status)}>
                    {source.status === 'active' ? 'Ativo' : source.status}
                  </Badge>
                </div>
              ))}
              {(!sources || sources.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma fonte configurada
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Syncs */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-display">Sincronizações Recentes</CardTitle>
              <Link to="/hub/logs">
                <Button variant="ghost" size="sm">Ver todas</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {syncLogs?.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="font-medium text-sm">
                        {(log.data_sources as any)?.name || 'Fonte desconhecida'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.entity_type} • {log.items_processed || 0} itens
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {log.started_at && format(new Date(log.started_at), "HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
              {(!syncLogs || syncLogs.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma sincronização recente
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Link to="/hub/matches">
            <Card className="glass-card hover-glow cursor-pointer transition-transform hover:scale-[1.02]">
              <CardContent className="p-4 text-center">
                <Play className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="font-medium">Explorar Partidas</div>
                <div className="text-xs text-muted-foreground">{stats?.matches || 0} partidas</div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/hub/competitions">
            <Card className="glass-card hover-glow cursor-pointer transition-transform hover:scale-[1.02]">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-secondary mx-auto mb-2" />
                <div className="font-medium">Competições</div>
                <div className="text-xs text-muted-foreground">{stats?.leagues || 0} ligas</div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/hub/teams">
            <Card className="glass-card hover-glow cursor-pointer transition-transform hover:scale-[1.02]">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-accent mx-auto mb-2" />
                <div className="font-medium">Times</div>
                <div className="text-xs text-muted-foreground">{stats?.teams || 0} times</div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/hub/highlights">
            <Card className="glass-card hover-glow cursor-pointer transition-transform hover:scale-[1.02]">
              <CardContent className="p-4 text-center">
                <Play className="w-8 h-8 text-destructive mx-auto mb-2" />
                <div className="font-medium">Highlights</div>
                <div className="text-xs text-muted-foreground">Vídeos e gols</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
