import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, FileText, Shield, Calendar, Sparkles, History, RefreshCw, TrendingUp, Trophy, Users, CheckCircle2, CalendarDays, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { useLeaguesByPriority, useTeamsByPriority, useRecalculatePriorityScores, getPriorityLevel } from "@/hooks/usePriorityScores";

interface ScheduledMatch {
  id: string;
  data: string;
  hora: string;
  time_casa: { nome: string; cores: { primary: string; secondary: string } };
  time_fora: { nome: string; cores: { primary: string; secondary: string } };
  liga: { nome: string };
  has_news: boolean;
  has_palpite: boolean;
}

interface FinishedMatchStats {
  total: number;
  withPalpite: number;
  withoutPalpite: number;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [matches, setMatches] = useState<ScheduledMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ generated: 0, failed: 0, pending: 0, log: '' });
  const [generatingPalpites, setGeneratingPalpites] = useState(false);
  const [generatingRetroactive, setGeneratingRetroactive] = useState(false);
  const [syncingFootballData, setSyncingFootballData] = useState(false);
  const [syncingApiFootball, setSyncingApiFootball] = useState(false);
  const [generatingValidation, setGeneratingValidation] = useState(false);
  const [generatingWeeklyValidation, setGeneratingWeeklyValidation] = useState(false);
  const [finishedStats, setFinishedStats] = useState<FinishedMatchStats>({ total: 0, withPalpite: 0, withoutPalpite: 0 });
  const [validationStats, setValidationStats] = useState({ withComparativo: 0, withValidationArticle: 0 });
  const [weeklyValidationStats, setWeeklyValidationStats] = useState({ total: 0 });

  // Check if user is admin
  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
      }

      setIsAdmin(!!data);
      setCheckingRole(false);
    }

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && !checkingRole && !isAdmin) {
      navigate("/");
    }
  }, [authLoading, checkingRole, isAdmin, navigate]);

  // Fetch scheduled matches
  useEffect(() => {
    async function fetchMatches() {
      const today = new Date().toISOString().split("T")[0];
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

      const { data: matchesData, error } = await supabase
        .from("partidas")
        .select(`
          id,
          data,
          hora,
          time_casa:times!partidas_time_casa_id_fkey(nome, cores),
          time_fora:times!partidas_time_fora_id_fkey(nome, cores),
          liga:ligas(nome)
        `)
        .eq("status", "scheduled")
        .gte("data", today)
        .lte("data", sevenDaysLater.toISOString().split("T")[0])
        .order("data", { ascending: true })
        .order("hora", { ascending: true });

      if (error) {
        console.error("Error fetching matches:", error);
        setLoadingMatches(false);
        return;
      }

      const matchIds = matchesData?.map(m => m.id) || [];

      // Chunk .in() queries to avoid URI Too Long errors when matchIds is large
      const chunk = <T,>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };
      const idChunks = chunk(matchIds, 100);

      const newsMatchIds = new Set<string>();
      const palpiteMatchIds = new Set<string>();
      try {
        await Promise.all(
          idChunks.flatMap(ids => [
            supabase.from("noticias").select("partida_id").in("partida_id", ids).then(r => {
              (r.data || []).forEach((n: any) => newsMatchIds.add(n.partida_id));
            }),
            supabase.from("palpites").select("partida_id").in("partida_id", ids).then(r => {
              (r.data || []).forEach((p: any) => palpiteMatchIds.add(p.partida_id));
            }),
          ])
        );
      } catch (e) {
        console.error("Error fetching news/palpites:", e);
      }

      const formattedMatches: ScheduledMatch[] = (matchesData || []).map(m => {
        const timeCasa = Array.isArray(m.time_casa) ? m.time_casa[0] : m.time_casa;
        const timeFora = Array.isArray(m.time_fora) ? m.time_fora[0] : m.time_fora;
        const liga = Array.isArray(m.liga) ? m.liga[0] : m.liga;

        return {
          id: m.id,
          data: m.data,
          hora: m.hora,
          time_casa: timeCasa || { nome: "Time Casa", cores: { primary: "#333", secondary: "#fff" } },
          time_fora: timeFora || { nome: "Time Fora", cores: { primary: "#333", secondary: "#fff" } },
          liga: liga || { nome: "Liga" },
          has_news: newsMatchIds.has(m.id),
          has_palpite: palpiteMatchIds.has(m.id)
        };
      });

      setMatches(formattedMatches);
      setLoadingMatches(false);
    }

    async function fetchFinishedStats() {
      // Get total finished matches
      const { count: totalFinished } = await supabase
        .from("partidas")
        .select("id", { count: "exact", head: true })
        .eq("status", "finished");

      // Count palpites for finished matches using distinct partida_id count
      const { count: withPalpiteCount } = await supabase
        .from("palpites")
        .select("partida_id", { count: "exact", head: true });

      const total = totalFinished || 0;
      const withPalpite = withPalpiteCount || 0;

      setFinishedStats({
        total,
        withPalpite,
        withoutPalpite: Math.max(0, total - withPalpite)
      });
    }

    async function fetchValidationStats() {
      // Count matches with comparativo_resultados
      const { count: withComparativo } = await supabase
        .from("comparativo_resultados")
        .select("partida_id", { count: "exact", head: true });

      // Count validation articles (slug contains "validacao-palpites")
      const { count: withValidationArticle } = await supabase
        .from("noticias")
        .select("id", { count: "exact", head: true })
        .like("slug", "%validacao-palpites%");

      setValidationStats({
        withComparativo: withComparativo || 0,
        withValidationArticle: withValidationArticle || 0
      });

      // Count weekly validation articles
      const { count: weeklyArticles } = await supabase
        .from("noticias")
        .select("id", { count: "exact", head: true })
        .like("slug", "validacao-semana-%");

      setWeeklyValidationStats({
        total: weeklyArticles || 0
      });
    }

    if (isAdmin) {
      fetchMatches();
      fetchFinishedStats();
      fetchValidationStats();
    }
  }, [isAdmin]);

  const generateAnalysis = async (matchId: string) => {
    setGenerating(true);
    
    try {
      const response = await supabase.functions.invoke("generate-match-analysis", {
        body: { match_id: matchId }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      if (result.success && result.results.created > 0) {
        toast({
          title: "Análise gerada!",
          description: "A análise foi criada e publicada com sucesso.",
        });
        
        // Update local state
        setMatches(prev => prev.map(m => 
          m.id === matchId ? { ...m, has_news: true } : m
        ));
      } else if (result.results.skipped > 0) {
        toast({
          title: "Análise já existe",
          description: "Já existe uma análise publicada para esta partida.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Não foi possível gerar",
          description: result.results.errors?.[0] || "Verifique se a partida tem palpite gerado.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({
        title: "Erro ao gerar análise",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateAllAnalyses = async () => {
    setGeneratingAll(true);
    setAnalysisProgress({ generated: 0, failed: 0, pending: 0, log: 'Iniciando job em background...' });

    try {
      const { error } = await (supabase as any).from('background_jobs')
        .update({
          status: 'running',
          progress: {},
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('job_type', 'analyses');

      if (error) throw error;

      toast({
        title: "Job iniciado!",
        description: "As análises serão geradas em background. Você pode navegar livremente.",
      });
      setAnalysisProgress(prev => ({ ...prev, log: '🚀 Processamento rodando em background. Acompanhe no Control Center.' }));
    } catch (error) {
      toast({
        title: "Erro ao iniciar job",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setGeneratingAll(false);
    }
  };

  const stopAllAnalyses = async () => {
    await (supabase as any).from('background_jobs')
      .update({ status: 'stopped', updated_at: new Date().toISOString() })
      .eq('job_type', 'analyses');
    setAnalysisProgress(prev => ({ ...prev, log: '⏹ Parado.' }));
  };

  const generateMissingPalpites = async () => {
    setGeneratingPalpites(true);
    
    try {
      const response = await supabase.functions.invoke("generate-predictions", {
        body: {}
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      toast({
        title: "Palpites gerados!",
        description: `${result.generated || 0} palpites criados, ${result.failed || 0} falhas.`,
      });

      // Refresh matches list
      window.location.reload();
    } catch (error) {
      console.error("Error generating predictions:", error);
      toast({
        title: "Erro ao gerar palpites",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setGeneratingPalpites(false);
    }
  };

  const generateRetroactivePredictions = async () => {
    setGeneratingRetroactive(true);
    
    try {
      const response = await supabase.functions.invoke("generate-retroactive-predictions", {
        body: { limit: 500 }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      toast({
        title: "Palpites retroativos gerados!",
        description: `${result.generated || 0} palpites criados, ${result.failed || 0} falhas. ${result.matchesSample ? `Amostra: ${result.matchesSample.length} IDs` : ''}`,
      });

      // Refresh stats
      window.location.reload();
    } catch (error) {
      console.error("Error generating retroactive predictions:", error);
      toast({
        title: "Erro ao gerar palpites retroativos",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setGeneratingRetroactive(false);
    }
  };

  const syncFootballData = async () => {
    setSyncingFootballData(true);
    
    try {
      const response = await supabase.functions.invoke("sync-football-data", {
        body: {}
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      toast({
        title: "Sincronização concluída!",
        description: `${result.stats?.matchesSynced || 0} partidas sincronizadas do Football-Data.org`,
      });

      window.location.reload();
    } catch (error) {
      console.error("Error syncing Football-Data:", error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setSyncingFootballData(false);
    }
  };

  const syncApiFootball = async () => {
    setSyncingApiFootball(true);
    
    try {
      const response = await supabase.functions.invoke("sync-api-football", {
        body: { leagues: [73, 13, 11] } // Copa do Brasil, Libertadores, Sudamericana
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      toast({
        title: "Sincronização concluída!",
        description: `${result.matchesUpserted || 0} partidas e ${result.teamsUpserted || 0} times sincronizados da API-Football`,
      });

      window.location.reload();
    } catch (error) {
      console.error("Error syncing API-Football:", error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setSyncingApiFootball(false);
    }
  };

  const generateValidationArticles = async () => {
    setGeneratingValidation(true);
    
    try {
      // Use background job system instead of direct call
      const { data: existing } = await (supabase as any)
        .from('background_jobs')
        .select('id')
        .eq('job_type', 'validations')
        .maybeSingle();

      if (existing) {
        await (supabase as any).from('background_jobs')
          .update({
            status: 'running',
            progress: {},
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('job_type', 'validations');
      } else {
        await (supabase as any).from('background_jobs')
          .insert({
            job_type: 'validations',
            status: 'running',
            progress: {},
            started_at: new Date().toISOString()
          });
      }

      toast({
        title: "Job de validação iniciado!",
        description: "Artigos serão gerados continuamente em background. Acompanhe no Control Center.",
      });
    } catch (error) {
      console.error("Error starting validation job:", error);
      toast({
        title: "Erro ao iniciar job",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setGeneratingValidation(false);
    }
  };

  const generateWeeklyValidation = async () => {
    setGeneratingWeeklyValidation(true);
    
    try {
      const response = await supabase.functions.invoke("generate-weekly-validation", {
        body: {}
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      toast({
        title: "Validação semanal gerada!",
        description: `Semana ${result.week}/${result.year}: ${result.results?.created || 0} artigos criados, ${result.results?.skipped || 0} ignorados.`,
      });

      window.location.reload();
    } catch (error) {
      console.error("Error generating weekly validation:", error);
      toast({
        title: "Erro ao gerar validação semanal",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setGeneratingWeeklyValidation(false);
    }
  };

  if (authLoading || checkingRole) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const selectedMatchData = matches.find(m => m.id === selectedMatch);

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Generate Single Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Gerar Análise Individual
              </CardTitle>
              <CardDescription>
                Selecione uma partida para gerar análise com IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingMatches ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma partida..." />
                    </SelectTrigger>
                    <SelectContent>
                      {matches.map(match => (
                        <SelectItem key={match.id} value={match.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(match.data).toLocaleDateString('pt-BR')}
                            </span>
                            <span>{match.time_casa.nome} x {match.time_fora.nome}</span>
                            {match.has_news && (
                              <Badge variant="secondary" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                Publicada
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedMatchData && (
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TeamBadge 
                            name={selectedMatchData.time_casa.nome}
                            primaryColor={selectedMatchData.time_casa.cores?.primary}
                            secondaryColor={selectedMatchData.time_casa.cores?.secondary}
                            size="sm"
                          />
                          <span className="font-medium">{selectedMatchData.time_casa.nome}</span>
                        </div>
                        <span className="text-muted-foreground">vs</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{selectedMatchData.time_fora.nome}</span>
                          <TeamBadge 
                            name={selectedMatchData.time_fora.nome}
                            primaryColor={selectedMatchData.time_fora.cores?.primary}
                            secondaryColor={selectedMatchData.time_fora.cores?.secondary}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(selectedMatchData.data).toLocaleDateString('pt-BR')} às {selectedMatchData.hora?.substring(0, 5)}
                        </div>
                        <Badge variant="outline">{selectedMatchData.liga.nome}</Badge>
                      </div>
                      <div className="flex gap-2">
                        {selectedMatchData.has_palpite ? (
                          <Badge variant="default">Palpite Gerado</Badge>
                        ) : (
                          <Badge variant="destructive">Sem Palpite</Badge>
                        )}
                        {selectedMatchData.has_news && (
                          <Badge variant="secondary">Análise Publicada</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={() => generateAnalysis(selectedMatch)}
                    disabled={!selectedMatch || generating || !selectedMatchData?.has_palpite}
                    className="w-full"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando análise...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Gerar Análise com IA
                      </>
                    )}
                  </Button>

                  {selectedMatchData && !selectedMatchData.has_palpite && (
                    <p className="text-sm text-destructive">
                      Esta partida ainda não tem palpite gerado. Execute a função de geração de palpites primeiro.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Batch Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Geração em Lote
              </CardTitle>
              <CardDescription>
                Gerar análises para todas as partidas dos próximos 3 dias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Estatísticas</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total de partidas</p>
                    <p className="text-2xl font-bold">{matches.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Com análise</p>
                    <p className="text-2xl font-bold text-primary">
                      {matches.filter(m => m.has_news).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Com palpite</p>
                    <p className="text-2xl font-bold text-green-500">
                      {matches.filter(m => m.has_palpite).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {matches.filter(m => m.has_palpite && !m.has_news).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={generateMissingPalpites}
                  disabled={generatingPalpites}
                  variant="outline"
                  className="w-full"
                >
                  {generatingPalpites ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando palpites...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Gerar Palpites Faltantes
                    </>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button 
                    onClick={generateAllAnalyses}
                    disabled={generatingAll}
                    variant="secondary"
                    className="flex-1"
                  >
                    {generatingAll ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando ({analysisProgress.generated} geradas)...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Gerar Todas as Análises Pendentes
                      </>
                    )}
                  </Button>
                  {generatingAll && (
                    <Button onClick={stopAllAnalyses} variant="destructive" size="icon">
                      <Square className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {analysisProgress.log && (
                <p className="text-xs text-muted-foreground">
                  {analysisProgress.log}
                </p>
              )}
              {!analysisProgress.log && (
                <p className="text-xs text-muted-foreground">
                  Processa uma análise por vez até finalizar todas as pendentes.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Retroactive Predictions */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Palpites Retroativos
              </CardTitle>
              <CardDescription>
                Gerar palpites para partidas finalizadas que não possuem palpite
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Estatísticas de Partidas Finalizadas</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total finalizadas</p>
                    <p className="text-2xl font-bold">{finishedStats.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Com palpite</p>
                    <p className="text-2xl font-bold text-green-500">
                      {finishedStats.withPalpite}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sem palpite</p>
                    <p className="text-2xl font-bold text-destructive">
                      {finishedStats.withoutPalpite}
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={generateRetroactivePredictions}
                disabled={generatingRetroactive || finishedStats.withoutPalpite === 0}
                className="w-full"
              >
                {generatingRetroactive ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando palpites históricos...
                  </>
                ) : (
                  <>
                    <History className="mr-2 h-4 w-4" />
                    Gerar Palpites Históricos ({finishedStats.withoutPalpite} pendentes)
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Processa até 500 partidas por vez. Execute múltiplas vezes para popular todos os dados históricos.
              </p>
            </CardContent>
          </Card>

          {/* Validation Articles */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Artigos de Validação Pós-Jogo
              </CardTitle>
              <CardDescription>
                Gerar artigos comparando palpite da IA x resultado real
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Estatísticas de Validação</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Com comparativo</p>
                    <p className="text-2xl font-bold">{validationStats.withComparativo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Com artigo</p>
                    <p className="text-2xl font-bold text-green-500">{validationStats.withValidationArticle}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-500">{Math.max(0, validationStats.withComparativo - validationStats.withValidationArticle)}</p>
                  </div>
                </div>
              </div>
              <Button onClick={generateValidationArticles} disabled={generatingValidation} className="w-full">
                {generatingValidation ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Gerar Artigos de Validação</>}
              </Button>
              <p className="text-xs text-muted-foreground">Gera artigos comparando previsões da IA com resultados reais.</p>
            </CardContent>
          </Card>

          {/* Weekly Validation */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Série Semanal de Validação
              </CardTitle>
              <CardDescription>
                Gerar boletins semanais resumindo validações por campeonato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Estatísticas Semanais</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Validações semanais publicadas</p>
                    <p className="text-2xl font-bold">{weeklyValidationStats.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ver todas</p>
                    <a href="/validacao/semanal" className="text-primary hover:underline text-sm">
                      Acessar página →
                    </a>
                  </div>
                </div>
              </div>
              <Button onClick={generateWeeklyValidation} disabled={generatingWeeklyValidation} className="w-full">
                {generatingWeeklyValidation ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><CalendarDays className="mr-2 h-4 w-4" />Gerar Validação Semanal</>}
              </Button>
              <p className="text-xs text-muted-foreground">Gera boletins semanais para a semana anterior de cada campeonato ativo.</p>
            </CardContent>
          </Card>

          {/* API Synchronization */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sincronização de APIs
              </CardTitle>
              <CardDescription>
                Sincronizar dados de competições das APIs externas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Football-Data.org</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Brasileirão, Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League
                  </p>
                  <Button 
                    onClick={syncFootballData}
                    disabled={syncingFootballData}
                    variant="outline"
                    className="w-full"
                  >
                    {syncingFootballData ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sincronizar Football-Data
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">API-Football</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Copa do Brasil, Copa Libertadores, Copa Sudamericana
                  </p>
                  <Button 
                    onClick={syncApiFootball}
                    disabled={syncingApiFootball}
                    variant="outline"
                    className="w-full"
                  >
                    {syncingApiFootball ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sincronizar API-Football
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                API-Football tem limite de 100 requisições/dia no plano gratuito. Use com moderação.
              </p>
            </CardContent>
          </Card>

          {/* Priority Scores Section */}
          <PriorityScoresSection />
        </div>
      </div>
    </AdminLayout>
  );
}

// Priority Scores Section Component
function PriorityScoresSection() {
  const { toast } = useToast();
  const { data: leagues, isLoading: leaguesLoading } = useLeaguesByPriority(10);
  const { data: teams, isLoading: teamsLoading } = useTeamsByPriority(15);
  const recalculateMutation = useRecalculatePriorityScores();

  const handleRecalculate = async () => {
    try {
      await recalculateMutation.mutateAsync({
        target: 'all',
        onProgress: (msg) => console.log('[PriorityScores]', msg),
      });
      toast({
        title: "Scores recalculados!",
        description: "Ligas e times atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao recalcular",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const getPriorityBadge = (score: number | null) => {
    const level = getPriorityLevel(score || 50);
    const variants = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
    } as const;
    const labels = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa',
    };
    return <Badge variant={variants[level]}>{labels[level]}</Badge>;
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Sistema de Priorização
        </CardTitle>
        <CardDescription>
          Scores dinâmicos para priorização de conteúdo no calendário automático
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-end">
          <Button 
            onClick={handleRecalculate}
            disabled={recalculateMutation.isPending}
            variant="outline"
          >
            {recalculateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recalculando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalcular Todos os Scores
              </>
            )}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Leagues */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Campeonatos Prioritários
            </h4>
            {leaguesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {leagues?.map((league, index) => (
                  <div key={league.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                      <span className="font-medium text-sm">{league.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {Math.round(league.priority_score || 0)}
                      </span>
                      {getPriorityBadge(league.priority_score)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Teams */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Times Prioritários
            </h4>
            {teamsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {teams?.map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                      <TeamBadge 
                        name={team.nome}
                        primaryColor={(team.score_factors as any)?.cores?.primary}
                        secondaryColor={(team.score_factors as any)?.cores?.secondary}
                        size="sm"
                      />
                      <span className="font-medium text-sm truncate max-w-[150px]">{team.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {Math.round(team.priority_score || 0)}
                      </span>
                      {getPriorityBadge(team.priority_score)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h5 className="font-medium text-sm mb-2">Como funciona:</h5>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>Campeonatos:</strong> Relevância estrutural (35%) + Potencial SEO (30%) + Volume de jogos (20%) + Engajamento (15%)</li>
            <li>• <strong>Times:</strong> Popularidade (30%) + Frequência (25%) + Desempenho recente (25%) + Engajamento (20%)</li>
            <li>• Scores combinados determinam prioridade no calendário automático de publicações</li>
            <li>• Campeonatos brasileiros recebem prioridade estrutural máxima</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
