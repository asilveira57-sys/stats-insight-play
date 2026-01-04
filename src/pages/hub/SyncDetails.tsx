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
  Trophy
} from "lucide-react";
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
        .order('data', { ascending: false })
        .limit(100);
      
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
