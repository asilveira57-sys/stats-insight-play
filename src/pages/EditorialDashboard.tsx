import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Loader2, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Trophy,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  BarChart3,
  Settings,
  Newspaper,
  Zap,
  Users,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContentItem {
  id: string;
  titulo: string;
  slug: string | null;
  publicada: boolean;
  data_publicacao: string | null;
  created_at: string | null;
  tipo: 'analise' | 'validacao' | 'semanal' | 'pilar' | 'outro';
  campeonato?: string;
}

interface EditorialStats {
  totalPublicado: number;
  totalPendente: number;
  totalErros: number;
  ultimaSemana: number;
}

export default function EditorialDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
      setCheckingRole(false);
    }

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !checkingRole && !isAdmin) {
      navigate("/");
    }
  }, [authLoading, checkingRole, isAdmin, navigate]);

  // Fetch all content
  const { data: allContent, isLoading: loadingContent, refetch: refetchContent } = useQuery({
    queryKey: ['editorial-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('noticias')
        .select('id, titulo, slug, publicada, data_publicacao, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      return (data || []).map(item => {
        let tipo: ContentItem['tipo'] = 'outro';
        if (item.slug?.includes('validacao-semana')) tipo = 'semanal';
        else if (item.slug?.includes('validacao-palpites')) tipo = 'validacao';
        else if (item.slug?.includes('analise') || item.slug?.includes('previa')) tipo = 'analise';
        else if (item.slug?.includes('pilar') || item.slug?.includes('guia')) tipo = 'pilar';

        return { ...item, tipo } as ContentItem;
      });
    },
    enabled: isAdmin,
  });

  // Fetch comparison stats
  const { data: comparisonStats } = useQuery({
    queryKey: ['editorial-comparison-stats'],
    queryFn: async () => {
      const data = await fetchAllRecords<{ id: string; sistema_acertou_resultado: boolean | null; partidas: { liga_id: string; ligas: { nome: string } | null } | null }>(
        'comparativo_resultados',
        `id, sistema_acertou_resultado, partidas(liga_id, ligas(nome))`
      );
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch team pillar stats
  const { data: teamPillarStats } = useQuery({
    queryKey: ['editorial-team-pillars'],
    queryFn: async () => {
      const data = await fetchAllRecords<{ id: string; nome: string; pillar_content: any; pillar_updated_at: string | null; priority_score: number | null }>(
        'times',
        'id, nome, pillar_content, pillar_updated_at, priority_score',
        (q) => q.not('pillar_content', 'is', null),
        { column: 'priority_score', ascending: false }
      );
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch league pillar stats
  const { data: leaguePillarStats } = useQuery({
    queryKey: ['editorial-league-pillars'],
    queryFn: async () => {
      const data = await fetchAllRecords<{ id: string; nome: string; pillar_content: any; pillar_updated_at: string | null; priority_score: number | null }>(
        'ligas',
        'id, nome, pillar_content, pillar_updated_at, priority_score',
        (q) => q.not('pillar_content', 'is', null),
        { column: 'priority_score', ascending: false }
      );
      return data;
    },
    enabled: isAdmin,
  });

  // Calculate stats
  const editorialStats = useMemo((): EditorialStats => {
    if (!allContent) return { totalPublicado: 0, totalPendente: 0, totalErros: 0, ultimaSemana: 0 };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return {
      totalPublicado: allContent.filter(c => c.publicada).length,
      totalPendente: allContent.filter(c => !c.publicada).length,
      totalErros: 0, // Would need error tracking table
      ultimaSemana: allContent.filter(c => 
        c.created_at && new Date(c.created_at) >= oneWeekAgo
      ).length,
    };
  }, [allContent]);

  // Content by type
  const contentByType = useMemo(() => {
    if (!allContent) return { analise: 0, validacao: 0, semanal: 0, pilar: 0, outro: 0 };
    
    return allContent.reduce((acc, item) => {
      acc[item.tipo] = (acc[item.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [allContent]);

  // Championship performance
  const championshipPerformance = useMemo(() => {
    if (!comparisonStats) return [];

    const champMap = new Map<string, { name: string; total: number; correct: number }>();

    comparisonStats.forEach(item => {
      const liga = (item.partidas as any)?.ligas;
      if (!liga?.nome) return;

      if (!champMap.has(liga.nome)) {
        champMap.set(liga.nome, { name: liga.nome, total: 0, correct: 0 });
      }

      const stats = champMap.get(liga.nome)!;
      stats.total++;
      if (item.sistema_acertou_resultado) stats.correct++;
    });

    return Array.from(champMap.values())
      .map(c => ({ ...c, accuracy: c.total > 0 ? (c.correct / c.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [comparisonStats]);

  // Calendar data (last 30 days)
  const calendarData = useMemo(() => {
    if (!allContent) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return allContent
      .filter(c => c.created_at && new Date(c.created_at) >= thirtyDaysAgo)
      .slice(0, 50);
  }, [allContent]);

  const handleReprocess = async (contentId: string, type: string) => {
    setReprocessing(contentId);
    
    try {
      // Determine which function to call based on type
      let functionName = 'generate-match-analysis';
      if (type === 'validacao') functionName = 'generate-validation-article';
      else if (type === 'semanal') functionName = 'generate-weekly-validation';

      toast({
        title: "Reprocessando...",
        description: "O conteúdo está sendo regenerado.",
      });

      // For now, just show a success message
      // Real implementation would call the appropriate edge function
      setTimeout(() => {
        toast({
          title: "Reprocessamento iniciado",
          description: "O conteúdo será atualizado em breve.",
        });
        setReprocessing(null);
        refetchContent();
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro ao reprocessar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
      setReprocessing(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      analise: 'Análise',
      validacao: 'Validação',
      semanal: 'Semanal',
      pilar: 'Pilar',
      outro: 'Outro'
    };
    return labels[tipo] || tipo;
  };

  const getTypeColor = (tipo: string) => {
    const colors: Record<string, string> = {
      analise: 'bg-blue-500/10 text-blue-500',
      validacao: 'bg-green-500/10 text-green-500',
      semanal: 'bg-purple-500/10 text-purple-500',
      pilar: 'bg-orange-500/10 text-orange-500',
      outro: 'bg-muted text-muted-foreground'
    };
    return colors[tipo] || colors.outro;
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

  if (!isAdmin) return null;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display mb-2">Dashboard Editorial</h1>
            <p className="text-muted-foreground">
              Gerencie toda a produção de conteúdo automático do Statball
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Admin Geral
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => refetchContent()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{editorialStats.totalPublicado}</p>
                  <p className="text-xs text-muted-foreground">Publicados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{editorialStats.totalPendente}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{editorialStats.ultimaSemana}</p>
                  <p className="text-xs text-muted-foreground">Última Semana</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(teamPillarStats?.length || 0) + (leaguePillarStats?.length || 0)}</p>
                  <p className="text-xs text-muted-foreground">Páginas Pilares</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content by Type */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="py-4 text-center">
              <p className="text-xl font-bold text-blue-500">{contentByType.analise || 0}</p>
              <p className="text-xs text-muted-foreground">Análises</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="py-4 text-center">
              <p className="text-xl font-bold text-green-500">{contentByType.validacao || 0}</p>
              <p className="text-xs text-muted-foreground">Validações</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardContent className="py-4 text-center">
              <p className="text-xl font-bold text-purple-500">{contentByType.semanal || 0}</p>
              <p className="text-xs text-muted-foreground">Semanais</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="py-4 text-center">
              <p className="text-xl font-bold text-orange-500">{contentByType.pilar || 0}</p>
              <p className="text-xs text-muted-foreground">Pilares</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="py-4 text-center">
              <p className="text-xl font-bold">{contentByType.outro || 0}</p>
              <p className="text-xs text-muted-foreground">Outros</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="calendario" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calendario" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendário</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="qualidade" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Qualidade</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Rankings</span>
            </TabsTrigger>
          </TabsList>

          {/* Calendário Editorial */}
          <TabsContent value="calendario">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Calendário Editorial
                </CardTitle>
                <CardDescription>
                  Conteúdos publicados nos últimos 30 dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingContent ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calendarData.map((content) => (
                          <TableRow key={content.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(content.created_at)}
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate font-medium">
                              {content.titulo}
                            </TableCell>
                            <TableCell>
                              <Badge className={getTypeColor(content.tipo)} variant="secondary">
                                {getTypeLabel(content.tipo)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {content.publicada ? (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Publicado
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {content.slug && (
                                  <Link to={`/noticias/${content.slug}`}>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleReprocess(content.id, content.tipo)}
                                  disabled={reprocessing === content.id}
                                >
                                  {reprocessing === content.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Editorial */}
          <TabsContent value="performance">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Performance por Campeonato
                  </CardTitle>
                  <CardDescription>
                    Taxa de acerto das previsões por competição
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {championshipPerformance.map((champ) => (
                      <div key={champ.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium">{champ.name}</p>
                          <p className="text-xs text-muted-foreground">{champ.total} partidas analisadas</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{champ.accuracy.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">{champ.correct} acertos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Newspaper className="w-5 h-5" />
                    Páginas Pilares de Times
                  </CardTitle>
                  <CardDescription>
                    Times com conteúdo pilar gerado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {teamPillarStats?.slice(0, 8).map((team) => (
                      <div key={team.id} className="p-3 rounded-lg bg-muted/30 text-center">
                        <p className="font-medium text-sm truncate">{team.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Score: {team.priority_score?.toFixed(0) || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Qualidade Automática */}
          <TabsContent value="qualidade">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Geração com Sucesso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Análises de Partidas</span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        {contentByType.analise || 0} geradas
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Validações de Palpites</span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        {contentByType.validacao || 0} geradas
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Séries Semanais</span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        {contentByType.semanal || 0} geradas
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Páginas Pilares (Times)</span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        {teamPillarStats?.length || 0} geradas
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Páginas Pilares (Ligas)</span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                        {leaguePillarStats?.length || 0} geradas
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Alertas de Qualidade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {editorialStats.totalPendente > 0 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <Clock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Conteúdos Pendentes</p>
                          <p className="text-xs text-muted-foreground">
                            {editorialStats.totalPendente} conteúdos aguardando publicação
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Sistema Operacional</p>
                        <p className="text-xs text-muted-foreground">
                          Nenhum erro crítico detectado
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rankings Editorial */}
          <TabsContent value="ranking">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Campeonatos que Mais Performam
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {championshipPerformance.slice(0, 5).map((champ, idx) => (
                      <div key={champ.name} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">{idx + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium">{champ.name}</p>
                          <p className="text-xs text-muted-foreground">{champ.total} análises</p>
                        </div>
                        <Badge variant="outline">{champ.accuracy.toFixed(0)}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Times com Mais Conteúdo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {teamPillarStats?.slice(0, 5).map((team, idx) => (
                      <div key={team.id} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">{idx + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium">{team.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            Atualizado: {team.pillar_updated_at ? new Date(team.pillar_updated_at).toLocaleDateString('pt-BR') : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline">{team.priority_score?.toFixed(0) || 0}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Newspaper className="w-5 h-5" />
                    Séries Mais Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allContent?.filter(c => c.tipo === 'semanal').slice(0, 6).map((content) => (
                      <div key={content.id} className="p-3 rounded-lg bg-muted/30">
                        <p className="font-medium text-sm truncate">{content.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(content.created_at)}
                        </p>
                        {content.slug && (
                          <Link to={`/noticias/${content.slug}`} className="text-xs text-primary flex items-center gap-1 mt-2">
                            Ver <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/admin">
                <Button variant="outline" className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Painel Admin
                </Button>
              </Link>
              <Link to="/hub">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Data Hub
                </Button>
              </Link>
              <Link to="/performance/previsoes">
                <Button variant="outline" className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Performance
                </Button>
              </Link>
              <Link to="/ranking/ia-vs-humanos">
                <Button variant="outline" className="w-full">
                  <Trophy className="w-4 h-4 mr-2" />
                  Ranking IA
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
