import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HubLogs() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: sources } = useQuery({
    queryKey: ['data-sources-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_sources')
        .select('id, name');
      if (error) throw error;
      return data;
    }
  });

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['sync-logs', statusFilter, sourceFilter],
    queryFn: async () => {
      // Fetch ALL logs without the 1000-row limit using pagination
      const allLogs: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('sync_logs')
          .select('*, data_sources(name)')
          .order('started_at', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter as any);
        }

        if (sourceFilter !== 'all') {
          query = query.eq('source_id', sourceFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allLogs.push(...data);
          offset += batchSize;
          if (data.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      return allLogs;
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-secondary" />;
      case 'failed': return <XCircle className="w-5 h-5 text-destructive" />;
      case 'running': return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'pending': return <Clock className="w-5 h-5 text-muted-foreground" />;
      default: return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-secondary/20 text-secondary border-secondary/30">Concluído</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Falhou</Badge>;
      case 'running':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Executando</Badge>;
      case 'pending':
        return <Badge className="bg-muted text-muted-foreground">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'Em andamento...';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    if (diff < 1000) return `${diff}ms`;
    if (diff < 60000) return `${Math.round(diff / 1000)}s`;
    return `${Math.round(diff / 60000)}min`;
  };

  // Stats
  const stats = {
    total: logs?.length || 0,
    completed: logs?.filter(l => l.status === 'completed').length || 0,
    failed: logs?.filter(l => l.status === 'failed').length || 0,
    running: logs?.filter(l => l.status === 'running').length || 0,
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/hub">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Logs de Sincronização</h1>
            <p className="text-muted-foreground text-sm">
              Histórico de todas as sincronizações
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-secondary">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Concluídos</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Falharam</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.running}</div>
              <div className="text-xs text-muted-foreground">Em execução</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-muted/50 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="running">Executando</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-48 bg-muted/50 border-border">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fontes</SelectItem>
              {sources?.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          {logs?.map((log) => (
            <Card key={log.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="mt-1">
                    {getStatusIcon(log.status)}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {(log.data_sources as any)?.name || 'Fonte desconhecida'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.entity_type}
                      </Badge>
                      {getStatusBadge(log.status)}
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {log.started_at && formatDistanceToNow(new Date(log.started_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                      <span>•</span>
                      <span>Duração: {getDuration(log.started_at, log.completed_at)}</span>
                      <span>•</span>
                      <span>{log.requests_made || 0} requisições</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-secondary">
                        +{log.items_created || 0} criados
                      </span>
                      <span className="text-primary">
                        ~{log.items_updated || 0} atualizados
                      </span>
                      {(log.items_failed || 0) > 0 && (
                        <span className="text-destructive">
                          ✗{log.items_failed} falharam
                        </span>
                      )}
                    </div>

                    {/* Error Message */}
                    {log.error_message && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                        {log.error_message}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    {log.started_at && format(new Date(log.started_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Activity className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!logs || logs.length === 0) && (
          <Card className="glass-card p-12 text-center">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum log encontrado</h3>
            <p className="text-muted-foreground">
              Execute uma sincronização para ver os logs aqui
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
