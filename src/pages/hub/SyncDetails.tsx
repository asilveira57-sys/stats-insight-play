import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
  Clock,
  AlertCircle,
  Play,
  Pause,
  Database,
  Zap,
  ListFilter,
  Calendar,
  Trophy,
  Info,
  RotateCcw,
  ExternalLink
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { formatDistanceToNow } from "date-fns";

// CronJobStatus Component
const CronJobStatus = () => {
  const { data: lastSync, isLoading } = useQuery({
    queryKey: ['last-cron-sync'],
    queryFn: async () => {
      // Check for the most recently synced match
      const { data, error } = await supabase
        .from('partidas')
        .select('updated_at')
        .eq('detalhes_sincronizados', true)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data?.[0]?.updated_at || null;
    },
    refetchInterval: 60000 // Refetch every minute
  });

  return (
    <Card className="glass-card mb-8 border-secondary/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-secondary" />
          Sincronização Automática
        </CardTitle>
        <CardDescription>
          Cron job configurado para sincronizar detalhes automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/10">
          <CheckCircle className="w-6 h-6 text-secondary" />
          <div className="flex-1">
            <p className="font-medium">Agendamento Ativo</p>
            <p className="text-sm text-muted-foreground">
              Executa a cada 10 minutos, sincronizando 20 partidas por execução
            </p>
          </div>
          <Badge className="bg-secondary/20 text-secondary">
            */10 * * * *
          </Badge>
        </div>
        
        {/* Last execution indicator */}
        <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Última Sincronização</p>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : lastSync ? (
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}
                <span className="text-muted-foreground/60 ml-2">
                  ({format(new Date(lastSync), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })})
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma execução registrada</p>
            )}
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          Com 20 partidas a cada 10 minutos, serão sincronizadas ~2.880 partidas/dia automaticamente
        </p>
      </CardContent>
    </Card>
  );
};

// Free tier availability by source
const FREE_TIER_AVAILABILITY = {
  'football-data': {
    name: 'Football-Data.org',
    leagues: [
      { code: 'PL', name: 'Premier League', seasons: '2023-2025' },
      { code: 'PD', name: 'La Liga', seasons: '2023-2025' },
      { code: 'SA', name: 'Serie A', seasons: '2023-2025' },
      { code: 'BL1', name: 'Bundesliga', seasons: '2023-2025' },
      { code: 'FL1', name: 'Ligue 1', seasons: '2023-2025' },
      { code: 'CL', name: 'Champions League', seasons: '2023-2025' },
      { code: 'BSA', name: 'Brasileirão Série A', seasons: '2023-2025' },
      { code: 'EC', name: 'Eurocopa', seasons: '2024' },
      { code: 'WC', name: 'Copa do Mundo', seasons: '2022, 2026' },
    ],
    limit: '10 req/min',
  },
  'api-football': {
    name: 'API-Football',
    leagues: [
      { code: 'PL', name: 'Premier League', seasons: 'Últimos 3 dias' },
      { code: 'PD', name: 'La Liga', seasons: 'Últimos 3 dias' },
      { code: 'SA', name: 'Serie A', seasons: 'Últimos 3 dias' },
      { code: 'BL1', name: 'Bundesliga', seasons: 'Últimos 3 dias' },
      { code: 'FL1', name: 'Ligue 1', seasons: 'Últimos 3 dias' },
      { code: 'CL', name: 'Champions League', seasons: 'Últimos 3 dias' },
      { code: 'BSA', name: 'Brasileirão Série A', seasons: 'Últimos 3 dias' },
      { code: 'BSB', name: 'Brasileirão Série B', seasons: 'Últimos 3 dias' },
      { code: 'CDB', name: 'Copa do Brasil', seasons: 'Últimos 3 dias' },
      { code: 'CLI', name: 'Copa Libertadores', seasons: 'Últimos 3 dias' },
      { code: 'CSA', name: 'Copa Sudamericana', seasons: 'Últimos 3 dias' },
    ],
    limit: '100 req/dia',
    warning: '⚠️ IMPORTANTE: O plano gratuito só permite consultar partidas dos últimos 3 dias! Dados históricos NÃO são acessíveis.',
  },
};

// Competitions available for top scorers sync (free tier)
const TOP_SCORERS_COMPETITIONS = [
  { code: 'PL', name: 'Premier League', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  { code: 'PD', name: 'La Liga', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  { code: 'SA', name: 'Serie A', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  { code: 'BL1', name: 'Bundesliga', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  { code: 'FL1', name: 'Ligue 1', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  { code: 'BSA', name: 'Brasileirão Série A', seasons: [2023, 2024, 2025] },
  { code: 'CL', name: 'Champions League', seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
];

interface SyncStats {
  total: number;
  sincronizadas: number;
  pendentes: number;
  finalizadasPendentes: number;
}

interface PendingMatch {
  id: string;
  data: string;
  hora: string | null;
  api_id: number | null;
  status: string;
  gols_casa: number | null;
  gols_fora: number | null;
  time_casa: { nome: string; escudo_url: string | null; cores: any } | null;
  time_fora: { nome: string; escudo_url: string | null; cores: any } | null;
  liga: { nome: string; codigo_api: string | null } | null;
}

export default function HubSyncDetails() {
  const queryClient = useQueryClient();
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [totalToSync, setTotalToSync] = useState(0);
  const [currentMatch, setCurrentMatch] = useState<string | null>(null);
  const abortRef = useRef(false);

  // Top scorers sync state
  const [selectedScorersCompetition, setSelectedScorersCompetition] = useState<string>("");
  const [selectedScorersSeasons, setSelectedScorersSeasons] = useState<number[]>([]);
  const [isSyncingScorers, setIsSyncingScorers] = useState(false);
  const [scorersSyncResult, setScorersSyncResult] = useState<any>(null);

  // API-Football sync state
  const [isSyncingApiFootball, setIsSyncingApiFootball] = useState(false);
  const [apiFootballResult, setApiFootballResult] = useState<any>(null);

  // Football-Data.org batch sync state
  const [isSyncingFootballData, setIsSyncingFootballData] = useState(false);
  const [footballDataResult, setFootballDataResult] = useState<any>(null);

  // Reset state
  const [isResetting, setIsResetting] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState<number | null>(null);

  // Fetch count of "orphaned" matches (marked as synced but have no data)
  const { data: orphanedData, refetch: refetchOrphaned } = useQuery({
    queryKey: ['orphaned-sync-count'],
    queryFn: async () => {
      // Get partidas marcadas como sincronizadas
      const { data: syncedPartidas, error } = await supabase
        .from('partidas')
        .select('id')
        .eq('status', 'finished')
        .eq('detalhes_sincronizados', true);
      
      if (error) throw error;
      if (!syncedPartidas || syncedPartidas.length === 0) return { count: 0, ids: [] };

      // Para cada uma, verificar se tem gols ou escalações
      const partidaIds = syncedPartidas.map(p => p.id);
      
      // Buscar quais têm gols
      const { data: withGoals } = await supabase
        .from('gols_partida')
        .select('partida_id')
        .in('partida_id', partidaIds);
      
      // Buscar quais têm escalações
      const { data: withLineups } = await supabase
        .from('escalacoes')
        .select('partida_id')
        .in('partida_id', partidaIds);
      
      const hasData = new Set([
        ...(withGoals?.map(g => g.partida_id) || []),
        ...(withLineups?.map(l => l.partida_id) || [])
      ]);
      
      // Partidas que estão marcadas como sincronizadas mas não têm dados
      const orphanedIds = partidaIds.filter(id => !hasData.has(id));
      
      return { count: orphanedIds.length, ids: orphanedIds };
    },
    refetchOnWindowFocus: false
  });

  // Reset orphaned matches function
  const resetOrphanedMatches = async () => {
    if (!orphanedData?.ids || orphanedData.ids.length === 0) return;
    
    setIsResetting(true);
    try {
      // Reset em batches de 50
      const batchSize = 50;
      let totalReset = 0;
      
      for (let i = 0; i < orphanedData.ids.length; i += batchSize) {
        const batch = orphanedData.ids.slice(i, i + batchSize);
        const { error } = await supabase
          .from('partidas')
          .update({ detalhes_sincronizados: false })
          .in('id', batch);
        
        if (error) throw error;
        totalReset += batch.length;
      }
      
      toast.success(`${totalReset} partidas resetadas para re-sincronização`);
      refetchStats();
      refetchMatches();
      refetchOrphaned();
    } catch (error) {
      console.error('Error resetting orphaned matches:', error);
      toast.error('Erro ao resetar partidas');
    } finally {
      setIsResetting(false);
    }
  };

  // Fetch sync statistics using pagination to avoid 1000-row limit
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['sync-details-stats'],
    queryFn: async (): Promise<SyncStats> => {
      // Fetch ALL partidas using pagination
      const allPartidas: { status: string | null; detalhes_sincronizados: boolean | null }[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('partidas')
          .select('status, detalhes_sincronizados')
          .range(offset, offset + batchSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allPartidas.push(...data);
          offset += batchSize;
          if (data.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      const total = allPartidas.length;
      const sincronizadas = allPartidas.filter(p => p.detalhes_sincronizados === true).length;
      const pendentes = total - sincronizadas;
      const finalizadasPendentes = allPartidas.filter(
        p => p.status === 'finished' && !p.detalhes_sincronizados
      ).length;
      
      return { total, sincronizadas, pendentes, finalizadasPendentes };
    }
  });

  // Fetch leagues for filter
  const { data: leagues } = useQuery({
    queryKey: ['sync-leagues-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ligas')
        .select('id, nome, codigo_api')
        .eq('ativa', true)
        .order('nome');
      if (error) throw error;
      return data;
    }
  });

  // Fetch pending matches
  const { data: pendingMatches, isLoading: loadingMatches, refetch: refetchMatches } = useQuery({
    queryKey: ['pending-sync-matches', selectedLeague],
    queryFn: async (): Promise<PendingMatch[]> => {
      let query = supabase
        .from('partidas')
        .select(`
          id, data, hora, api_id, status, gols_casa, gols_fora,
          time_casa:times!partidas_time_casa_id_fkey(nome, escudo_url, cores),
          time_fora:times!partidas_time_fora_id_fkey(nome, escudo_url, cores),
          liga:ligas!partidas_liga_id_fkey(nome, codigo_api)
        `)
        .eq('status', 'finished')
        .or('detalhes_sincronizados.is.null,detalhes_sincronizados.eq.false')
        .not('api_id', 'is', null)
        .order('data', { ascending: false });
      
      if (selectedLeague !== 'all') {
        query = query.eq('liga_id', selectedLeague);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PendingMatch[];
    }
  });

  // Sync single match mutation
  const syncSingleMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { data, error } = await supabase.functions.invoke('sync-match-details', {
        body: { matchId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-details-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-sync-matches'] });
    }
  });

  // Batch sync function
  const startBatchSync = async (limit: number) => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncedCount(0);
    setTotalToSync(limit);
    abortRef.current = false;

    try {
      // Get matches to sync
      let query = supabase
        .from('partidas')
        .select('id, api_id, time_casa:times!partidas_time_casa_id_fkey(nome), time_fora:times!partidas_time_fora_id_fkey(nome)')
        .eq('status', 'finished')
        .or('detalhes_sincronizados.is.null,detalhes_sincronizados.eq.false')
        .not('api_id', 'is', null)
        .order('data', { ascending: false })
        .limit(limit);
      
      if (selectedLeague !== 'all') {
        query = query.eq('liga_id', selectedLeague);
      }

      const { data: matchesToSync, error } = await query;
      if (error) throw error;

      if (!matchesToSync || matchesToSync.length === 0) {
        toast.info('Nenhuma partida para sincronizar');
        setIsSyncing(false);
        return;
      }

      setTotalToSync(matchesToSync.length);

      for (let i = 0; i < matchesToSync.length; i++) {
        if (abortRef.current) {
          toast.info('Sincronização interrompida');
          break;
        }

        const match = matchesToSync[i];
        setCurrentMatch(`${(match.time_casa as any)?.nome || '?'} vs ${(match.time_fora as any)?.nome || '?'}`);

        try {
          await supabase.functions.invoke('sync-match-details', {
            body: { matchId: match.id }
          });
          setSyncedCount(i + 1);
          setSyncProgress(((i + 1) / matchesToSync.length) * 100);
        } catch (err) {
          console.error('Error syncing match:', match.id, err);
        }

        // Rate limit: wait 6 seconds between requests (API limit is 10/min)
        if (i < matchesToSync.length - 1 && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 6000));
        }
      }

      toast.success(`Sincronização concluída: ${syncedCount} partidas`);
      refetchStats();
      refetchMatches();
    } catch (error) {
      console.error('Batch sync error:', error);
      toast.error('Erro na sincronização em lote');
    } finally {
      setIsSyncing(false);
      setCurrentMatch(null);
    }
  };

  const stopSync = () => {
    abortRef.current = true;
  };

  // Top Scorers sync function
  const syncTopScorers = async () => {
    if (!selectedScorersCompetition || selectedScorersSeasons.length === 0) {
      toast.error('Selecione uma competição e pelo menos uma temporada');
      return;
    }

    setIsSyncingScorers(true);
    setScorersSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-top-scorers', {
        body: { 
          competition: selectedScorersCompetition, 
          seasons: selectedScorersSeasons 
        }
      });

      if (error) throw error;

      setScorersSyncResult(data);
      toast.success(`Sincronização concluída: ${data.totalGoals} gols adicionados`);
    } catch (error) {
      console.error('Top scorers sync error:', error);
      toast.error('Erro na sincronização de artilheiros');
    } finally {
      setIsSyncingScorers(false);
    }
  };

  // API-Football European sync function
  const syncApiFootballDetails = async (limit: number) => {
    setIsSyncingApiFootball(true);
    setApiFootballResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-match-details-apifootball', {
        body: { limit }
      });

      if (error) throw error;

      setApiFootballResult(data);
      toast.success(`Sincronizado via API-Football: ${data.synced} partidas`);
      refetchStats();
      refetchMatches();
    } catch (error) {
      console.error('API-Football sync error:', error);
      toast.error('Erro na sincronização via API-Football');
    } finally {
      setIsSyncingApiFootball(false);
    }
  };

  // Football-Data.org batch sync function
  const syncFootballDataDetails = async (limit: number) => {
    setIsSyncingFootballData(true);
    setFootballDataResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-match-details', {
        body: { limit }
      });

      if (error) throw error;

      setFootballDataResult(data);
      toast.success(`Sincronizado via Football-Data.org: ${data.synced} partidas`);
      refetchStats();
      refetchMatches();
    } catch (error) {
      console.error('Football-Data sync error:', error);
      toast.error('Erro na sincronização via Football-Data.org');
    } finally {
      setIsSyncingFootballData(false);
    }
  };

  const toggleSeason = (season: number) => {
    setSelectedScorersSeasons(prev => 
      prev.includes(season) 
        ? prev.filter(s => s !== season)
        : [...prev, season].sort((a, b) => a - b)
    );
  };

  const selectAllSeasons = () => {
    const comp = TOP_SCORERS_COMPETITIONS.find(c => c.code === selectedScorersCompetition);
    if (comp) {
      setSelectedScorersSeasons(comp.seasons);
    }
  };

  const progressPercent = stats ? 
    ((stats.sincronizadas / stats.total) * 100).toFixed(1) : 
    0;

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
            <h1 className="text-2xl font-display font-bold">Sincronização de Detalhes</h1>
            <p className="text-muted-foreground text-sm">
              Gerenciar sincronização de gols, escalações e cartões
            </p>
          </div>
          <Button variant="outline" onClick={() => { refetchStats(); refetchMatches(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Partidas</p>
                  <p className="text-2xl font-bold">{stats?.total.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/20">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sincronizadas</p>
                  <p className="text-2xl font-bold">{stats?.sincronizadas.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes (Finalizadas)</p>
                  <p className="text-2xl font-bold">{stats?.finalizadasPendentes.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Zap className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progresso</p>
                  <p className="text-2xl font-bold">{progressPercent}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Progresso Geral</CardTitle>
            <CardDescription>
              {stats?.sincronizadas || 0} de {stats?.total || 0} partidas sincronizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={Number(progressPercent)} className="h-3" />
          </CardContent>
        </Card>

        {/* Cron Job Status */}
        <CronJobStatus />

        {/* Free Tier Availability */}
        <Card className="glass-card mb-8 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-green-500" />
              Disponibilidade Gratuita por Fonte
            </CardTitle>
            <CardDescription>
              Quais ligas e temporadas estão disponíveis em cada fonte de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Football-Data.org */}
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-green-400 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  {FREE_TIER_AVAILABILITY['football-data'].name}
                </h4>
                <Badge variant="outline" className="border-green-500/50 text-green-400">
                  {FREE_TIER_AVAILABILITY['football-data'].limit}
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Competição</TableHead>
                    <TableHead className="text-xs text-right">Temporadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FREE_TIER_AVAILABILITY['football-data'].leagues.map(league => (
                    <TableRow key={league.code} className="hover:bg-green-500/5">
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-xs">{league.code}</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-sm">{league.name}</TableCell>
                      <TableCell className="py-2 text-sm text-right text-muted-foreground">{league.seasons}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* API-Football */}
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {FREE_TIER_AVAILABILITY['api-football'].name}
                </h4>
                <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                  {FREE_TIER_AVAILABILITY['api-football'].limit}
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Competição</TableHead>
                    <TableHead className="text-xs text-right">Temporadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FREE_TIER_AVAILABILITY['api-football'].leagues.map(league => (
                    <TableRow key={league.code} className="hover:bg-blue-500/5">
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-xs">{league.code}</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-sm">{league.name}</TableCell>
                      <TableCell className="py-2 text-sm text-right text-muted-foreground">{league.seasons}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {FREE_TIER_AVAILABILITY['api-football'].warning && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-400">{FREE_TIER_AVAILABILITY['api-football'].warning}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reset Orphaned Matches */}
        <Card className="glass-card mb-8 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-500" />
              Resetar Partidas sem Dados
            </CardTitle>
            <CardDescription>
              Partidas que estão marcadas como "sincronizadas" mas não possuem gols nem escalações salvas.
              Essas partidas foram puladas pela API sem dados reais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="font-medium">Partidas órfãs detectadas</p>
                  <p className="text-sm text-muted-foreground">
                    {orphanedData?.count !== undefined 
                      ? `${orphanedData.count} partidas marcadas como sincronizadas mas sem dados reais`
                      : 'Calculando...'
                    }
                  </p>
                </div>
              </div>
              <Button 
                onClick={resetOrphanedMatches}
                disabled={isResetting || !orphanedData?.count}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Resetando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Resetar {orphanedData?.count || 0} partidas
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Após resetar, essas partidas aparecerão novamente na fila de sincronização.
              Use a sincronização via API-Football para buscar detalhes de ligas brasileiras e europeias.
            </p>
          </CardContent>
        </Card>

        {/* Batch Sync Controls */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Sincronização em Lote
            </CardTitle>
            <CardDescription>
              Sincronize múltiplas partidas de uma vez. Cada partida leva ~6 segundos devido ao rate limit da API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* League Filter */}
            <div className="flex items-center gap-4">
              <ListFilter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedLeague} onValueChange={setSelectedLeague} disabled={isSyncing}>
                <SelectTrigger className="w-64 bg-muted/50 border-border">
                  <SelectValue placeholder="Filtrar por competição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as competições</SelectItem>
                  {leagues?.map((league) => (
                    <SelectItem key={league.id} value={league.id}>
                      {league.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sync Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => startBatchSync(5)} 
                disabled={isSyncing}
                variant="outline"
              >
                <Play className="w-4 h-4 mr-2" />
                Sincronizar 5 partidas (~30s)
              </Button>
              <Button 
                onClick={() => startBatchSync(10)} 
                disabled={isSyncing}
                variant="outline"
              >
                <Play className="w-4 h-4 mr-2" />
                Sincronizar 10 partidas (~1min)
              </Button>
              <Button 
                onClick={() => startBatchSync(50)} 
                disabled={isSyncing}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Zap className="w-4 h-4 mr-2" />
                Sincronizar 50 partidas (~5min)
              </Button>
              {isSyncing && (
                <Button onClick={stopSync} variant="destructive">
                  <Pause className="w-4 h-4 mr-2" />
                  Parar
                </Button>
              )}
            </div>

            {/* Sync Progress */}
            {isSyncing && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between text-sm">
                  <span>Sincronizando: {currentMatch}</span>
                  <span>{syncedCount} / {totalToSync}</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Tempo restante estimado: ~{Math.ceil((totalToSync - syncedCount) * 6 / 60)} minutos
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Football-Data.org Batch Sync */}
        <Card className="glass-card mb-8 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-green-500" />
              Sincronização via Football-Data.org (Gols, Escalações, Cartões)
            </CardTitle>
            <CardDescription>
              Busca detalhes completos para ligas europeias e Brasileirão A (temporadas 2023-2025).
              <span className="block mt-1 text-xs text-green-400">
                ✓ Processa em lote automaticamente com rate limiting interno (10 req/min)
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm font-medium text-green-400 mb-2">Ligas Disponíveis (Free Tier):</p>
              <div className="flex flex-wrap gap-2">
                {FREE_TIER_AVAILABILITY['football-data'].leagues.map((league) => (
                  <Badge key={league.code} variant="outline" className="border-green-500/50 text-green-400">
                    {league.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => syncFootballDataDetails(5)} 
                disabled={isSyncingFootballData}
                variant="outline"
                className="border-green-500/50 hover:bg-green-500/10"
              >
                <Play className="w-4 h-4 mr-2" />
                5 partidas (~30s)
              </Button>
              <Button 
                onClick={() => syncFootballDataDetails(10)} 
                disabled={isSyncingFootballData}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                10 partidas (~1min)
              </Button>
              <Button 
                onClick={() => syncFootballDataDetails(20)} 
                disabled={isSyncingFootballData}
                variant="outline"
                className="border-green-500/50 hover:bg-green-500/10"
              >
                <Database className="w-4 h-4 mr-2" />
                20 partidas (~2min)
              </Button>
            </div>

            {isSyncingFootballData && (
              <div className="p-4 rounded-lg bg-green-500/10">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-green-500" />
                  <span className="text-sm">Sincronizando via Football-Data.org...</span>
                </div>
              </div>
            )}

            {footballDataResult && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Resultado da Sincronização:</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-500">{footballDataResult.synced || 0}</p>
                    <p className="text-xs text-muted-foreground">Sincronizadas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-500">{footballDataResult.skipped || 0}</p>
                    <p className="text-xs text-muted-foreground">Ignoradas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground">{footballDataResult.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
                {footballDataResult.errors && footballDataResult.errors.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-red-500/10 text-xs text-red-400 max-h-24 overflow-y-auto">
                    {footballDataResult.errors.slice(0, 5).map((err: string, idx: number) => (
                      <p key={idx}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API-Football Sync */}
        <Card className="glass-card mb-8 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Sincronização via API-Football (Escalações, Gols e Cartões)
            </CardTitle>
            <CardDescription>
              Busca escalações completas, gols e cartões para ligas europeias e brasileiras.
              <span className="block mt-1 text-xs text-yellow-500">
                ⚠️ Limite: 100 requests/dia no plano gratuito. Cada partida usa ~3 requests.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm font-medium text-blue-400 mb-2">Ligas Suportadas:</p>
              <div className="flex flex-wrap gap-2">
                {FREE_TIER_AVAILABILITY['api-football'].leagues.map((league) => (
                  <Badge key={league.code} variant="outline" className="border-blue-500/50 text-blue-400">
                    {league.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => syncApiFootballDetails(3)} 
                disabled={isSyncingApiFootball}
                variant="outline"
                className="border-blue-500/50 hover:bg-blue-500/10"
              >
                <Play className="w-4 h-4 mr-2" />
                Sincronizar 3 partidas (~9 req)
              </Button>
              <Button 
                onClick={() => syncApiFootballDetails(10)} 
                disabled={isSyncingApiFootball}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Sincronizar 10 partidas (~30 req)
              </Button>
              <Button 
                onClick={() => syncApiFootballDetails(30)} 
                disabled={isSyncingApiFootball}
                variant="outline"
                className="border-blue-500/50 hover:bg-blue-500/10"
              >
                <Database className="w-4 h-4 mr-2" />
                Sincronizar 30 partidas (~90 req)
              </Button>
            </div>

            {isSyncingApiFootball && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm">Sincronizando via API-Football...</span>
              </div>
            )}

            {apiFootballResult && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Resultado da Sincronização:</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-secondary">{apiFootballResult.synced || 0}</p>
                    <p className="text-xs text-muted-foreground">Sincronizadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-500">{apiFootballResult.skipped || 0}</p>
                    <p className="text-xs text-muted-foreground">Ignoradas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">{apiFootballResult.apiRequestsUsed || 0}</p>
                    <p className="text-xs text-muted-foreground">Requests Usados</p>
                  </div>
                </div>
                {apiFootballResult.errors?.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-medium">Erros ({apiFootballResult.errors.length}):</p>
                    <ul className="list-disc list-inside max-h-24 overflow-y-auto">
                      {apiFootballResult.errors.slice(0, 5).map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Scorers Sync */}
        <Card className="glass-card mb-8 border-accent/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Sincronização de Artilheiros
            </CardTitle>
            <CardDescription>
              Importe os principais artilheiros de cada temporada diretamente da API Football-Data.org
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Competition Select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Competição</label>
                <Select 
                  value={selectedScorersCompetition} 
                  onValueChange={(val) => {
                    setSelectedScorersCompetition(val);
                    setSelectedScorersSeasons([]);
                  }} 
                  disabled={isSyncingScorers}
                >
                  <SelectTrigger className="w-full bg-muted/50 border-border">
                    <SelectValue placeholder="Selecione uma competição" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOP_SCORERS_COMPETITIONS.map((comp) => (
                      <SelectItem key={comp.code} value={comp.code}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seasons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Temporadas</label>
                  {selectedScorersCompetition && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={selectAllSeasons}
                      disabled={isSyncingScorers}
                    >
                      Selecionar todas
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedScorersCompetition ? (
                    TOP_SCORERS_COMPETITIONS.find(c => c.code === selectedScorersCompetition)?.seasons.map((season) => (
                      <label 
                        key={season} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                          selectedScorersSeasons.includes(season) 
                            ? 'bg-accent/20 text-accent border border-accent/50' 
                            : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'
                        }`}
                      >
                        <Checkbox
                          checked={selectedScorersSeasons.includes(season)}
                          onCheckedChange={() => toggleSeason(season)}
                          disabled={isSyncingScorers}
                          className="sr-only"
                        />
                        <span className="text-sm">{season}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Selecione uma competição primeiro</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sync Button */}
            <div className="flex items-center gap-4">
              <Button 
                onClick={syncTopScorers} 
                disabled={isSyncingScorers || !selectedScorersCompetition || selectedScorersSeasons.length === 0}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isSyncingScorers ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Sincronizar Artilheiros
                  </>
                )}
              </Button>
              {selectedScorersSeasons.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedScorersSeasons.length} temporada(s) selecionada(s)
                  {selectedScorersSeasons.length > 1 && (
                    <span> • Tempo estimado: ~{selectedScorersSeasons.length * 6}s</span>
                  )}
                </p>
              )}
            </div>

            {/* Sync Results */}
            {scorersSyncResult && (
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                <h4 className="font-medium text-accent mb-2">Resultado da Sincronização</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Competição</p>
                    <p className="font-medium">{scorersSyncResult.competition}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Artilheiros</p>
                    <p className="font-medium">{scorersSyncResult.totalScorers}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gols Adicionados</p>
                    <p className="font-medium">{scorersSyncResult.totalGoals}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Temporadas</p>
                    <p className="font-medium">{scorersSyncResult.results?.length || 0}</p>
                  </div>
                </div>
                {scorersSyncResult.results && scorersSyncResult.results.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-accent/20">
                    <p className="text-sm text-muted-foreground mb-2">Detalhes por temporada:</p>
                    <div className="flex flex-wrap gap-2">
                      {scorersSyncResult.results.map((r: any) => (
                        <Badge 
                          key={r.season} 
                          variant={r.error ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          {r.season}: {r.error || `${r.scorers} artilheiros, ${r.goals} gols`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Matches List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Partidas Pendentes de Sincronização
            </CardTitle>
            <CardDescription>
              Mostrando até 100 partidas finalizadas que ainda não têm detalhes sincronizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMatches ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : pendingMatches && pendingMatches.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {pendingMatches.map((match) => (
                  <div 
                    key={match.id} 
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {/* Date */}
                    <div className="w-16 text-center text-sm text-muted-foreground">
                      {format(new Date(match.data), "dd/MM/yy", { locale: ptBR })}
                    </div>

                    {/* Teams */}
                    <div className="flex-1 flex items-center gap-2">
                      <TeamBadge
                        name={match.time_casa?.nome || '?'}
                        primaryColor={match.time_casa?.cores?.primary}
                        secondaryColor={match.time_casa?.cores?.secondary}
                        size="sm"
                      />
                      <span className="text-sm truncate max-w-[120px]">
                        {match.time_casa?.nome || 'TBD'}
                      </span>
                      <span className="text-muted-foreground mx-2">
                        {match.gols_casa ?? 0} - {match.gols_fora ?? 0}
                      </span>
                      <span className="text-sm truncate max-w-[120px]">
                        {match.time_fora?.nome || 'TBD'}
                      </span>
                      <TeamBadge
                        name={match.time_fora?.nome || '?'}
                        primaryColor={match.time_fora?.cores?.primary}
                        secondaryColor={match.time_fora?.cores?.secondary}
                        size="sm"
                      />
                    </div>

                    {/* League */}
                    <Badge variant="outline" className="text-xs">
                      {match.liga?.codigo_api || match.liga?.nome || '-'}
                    </Badge>

                    {/* API ID indicator */}
                    {match.api_id ? (
                      <Badge className="bg-secondary/20 text-secondary text-xs">
                        API ID: {match.api_id}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        Sem API ID
                      </Badge>
                    )}

                    {/* Sync Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        syncSingleMatch.mutate(match.id);
                        toast.info('Sincronizando...');
                      }}
                      disabled={syncSingleMatch.isPending || isSyncing}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncSingleMatch.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-secondary" />
                <p>Todas as partidas estão sincronizadas!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="glass-card mt-6 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Informações sobre a sincronização:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>A API Football-Data.org tem um limite de 10 requisições por minuto</li>
                  <li>Apenas partidas <strong>finalizadas</strong> com <strong>api_id</strong> podem ser sincronizadas</li>
                  <li>Os detalhes incluem: gols (marcador, minuto, assistência), escalações e cartões</li>
                  <li>Competições não cobertas pela API não terão detalhes disponíveis</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
