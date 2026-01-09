import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Calendar, 
  Award,
  CheckCircle2,
  XCircle,
  Users,
  Bot,
  Filter,
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { Link } from "react-router-dom";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from "recharts";
import { AdSlot } from "@/components/ads/AdSlot";
import { PremiumCTA } from "@/components/news/PremiumCTA";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ComparisonData {
  id: string;
  partida_id: string;
  placar_oficial_casa: number | null;
  placar_oficial_fora: number | null;
  resultado_oficial: string | null;
  sistema_placar_casa: number | null;
  sistema_placar_fora: number | null;
  sistema_resultado_previsto: string | null;
  sistema_acertou_resultado: boolean | null;
  sistema_acertou_placar: boolean | null;
  total_usuarios_palpitaram: number | null;
  usuarios_acertaram_resultado: number | null;
  usuarios_acertaram_placar: number | null;
  created_at: string | null;
  partidas: {
    data: string;
    rodada: number | null;
    time_casa: { nome: string; escudo_url: string | null } | null;
    time_fora: { nome: string; escudo_url: string | null } | null;
    ligas: { nome: string; slug: string | null } | null;
  } | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getResultLabel(result: string | null): string {
  if (result === 'casa') return 'V. Casa';
  if (result === 'fora') return 'V. Fora';
  if (result === 'empate') return 'Empate';
  return '-';
}

function StatCard({ 
  icon, 
  label, 
  value, 
  sublabel, 
  highlight = false,
  variant = "default"
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  sublabel?: string;
  highlight?: boolean;
  variant?: "default" | "ia" | "humanos";
}) {
  const bgClass = variant === "ia" 
    ? "bg-primary/10 border-primary/30" 
    : variant === "humanos" 
    ? "bg-green-500/10 border-green-500/30" 
    : "bg-card/50 border-border/50";
  
  return (
    <Card className={`${bgClass} transition-all hover:scale-[1.02]`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-background/50">
            {icon}
          </div>
          {highlight && (
            <Badge variant="secondary" className="text-xs">Destaque</Badge>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground/80 mt-1">{sublabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const ITEMS_PER_PAGE = 20;

export default function RankingIAvsHumanos() {
  const [selectedCampeonato, setSelectedCampeonato] = useState<string>("all");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: comparisons, isLoading } = useQuery({
    queryKey: ['ranking-ia-vs-humanos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparativo_resultados')
        .select(`
          id,
          partida_id,
          placar_oficial_casa,
          placar_oficial_fora,
          resultado_oficial,
          sistema_placar_casa,
          sistema_placar_fora,
          sistema_resultado_previsto,
          sistema_acertou_resultado,
          sistema_acertou_placar,
          total_usuarios_palpitaram,
          usuarios_acertaram_resultado,
          usuarios_acertaram_placar,
          created_at,
          partidas!inner(
            data,
            rodada,
            time_casa:times!partidas_time_casa_id_fkey(nome, escudo_url),
            time_fora:times!partidas_time_fora_id_fkey(nome, escudo_url),
            ligas!inner(nome, slug)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ComparisonData[];
    }
  });

  // Extract unique campeonatos
  const campeonatos = useMemo(() => {
    if (!comparisons) return [];
    const set = new Set<string>();
    comparisons.forEach(c => {
      const liga = c.partidas?.ligas?.nome;
      if (liga) set.add(liga);
    });
    return Array.from(set).sort();
  }, [comparisons]);

  // Filter by campeonato and period
  const filteredData = useMemo(() => {
    if (!comparisons) return [];
    
    let filtered = comparisons;
    
    if (selectedCampeonato !== "all") {
      filtered = filtered.filter(c => c.partidas?.ligas?.nome === selectedCampeonato);
    }
    
    if (selectedPeriodo !== "all") {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (selectedPeriodo) {
        case "week":
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "season":
          cutoffDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          cutoffDate = new Date(0);
      }
      
      filtered = filtered.filter(c => {
        const date = c.partidas?.data ? new Date(c.partidas.data) : null;
        return date && date >= cutoffDate;
      });
    }
    
    return filtered;
  }, [comparisons, selectedCampeonato, selectedPeriodo]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!filteredData.length) return null;
    
    const total = filteredData.length;
    const iaAcertosResultado = filteredData.filter(c => c.sistema_acertou_resultado).length;
    const iaAcertosPlacar = filteredData.filter(c => c.sistema_acertou_placar).length;
    
    // For users, we need to aggregate
    let totalUsuariosPalpitaram = 0;
    let totalUsuariosAcertaramResultado = 0;
    let totalUsuariosAcertaramPlacar = 0;
    
    filteredData.forEach(c => {
      totalUsuariosPalpitaram += c.total_usuarios_palpitaram || 0;
      totalUsuariosAcertaramResultado += c.usuarios_acertaram_resultado || 0;
      totalUsuariosAcertaramPlacar += c.usuarios_acertaram_placar || 0;
    });
    
    const taxaUsuariosResultado = totalUsuariosPalpitaram > 0 
      ? (totalUsuariosAcertaramResultado / totalUsuariosPalpitaram) * 100 
      : 0;
    const taxaUsuariosPlacar = totalUsuariosPalpitaram > 0 
      ? (totalUsuariosAcertaramPlacar / totalUsuariosPalpitaram) * 100 
      : 0;
    
    return {
      total,
      ia: {
        acertosResultado: iaAcertosResultado,
        acertosPlacar: iaAcertosPlacar,
        taxaResultado: (iaAcertosResultado / total) * 100,
        taxaPlacar: (iaAcertosPlacar / total) * 100,
      },
      humanos: {
        totalPalpites: totalUsuariosPalpitaram,
        acertosResultado: totalUsuariosAcertaramResultado,
        acertosPlacar: totalUsuariosAcertaramPlacar,
        taxaResultado: taxaUsuariosResultado,
        taxaPlacar: taxaUsuariosPlacar,
      }
    };
  }, [filteredData]);

  // Stats by campeonato
  const statsByCampeonato = useMemo(() => {
    if (!comparisons) return [];
    
    const campStats: Record<string, {
      nome: string;
      slug: string | null;
      total: number;
      iaAcertos: number;
      iaPlacar: number;
      usuariosPalpites: number;
      usuariosAcertos: number;
    }> = {};
    
    comparisons.forEach(c => {
      const liga = c.partidas?.ligas;
      if (!liga?.nome) return;
      
      if (!campStats[liga.nome]) {
        campStats[liga.nome] = {
          nome: liga.nome,
          slug: liga.slug,
          total: 0,
          iaAcertos: 0,
          iaPlacar: 0,
          usuariosPalpites: 0,
          usuariosAcertos: 0,
        };
      }
      
      campStats[liga.nome].total++;
      if (c.sistema_acertou_resultado) campStats[liga.nome].iaAcertos++;
      if (c.sistema_acertou_placar) campStats[liga.nome].iaPlacar++;
      campStats[liga.nome].usuariosPalpites += c.total_usuarios_palpitaram || 0;
      campStats[liga.nome].usuariosAcertos += c.usuarios_acertaram_resultado || 0;
    });
    
    return Object.values(campStats)
      .map(s => ({
        ...s,
        taxaIA: s.total > 0 ? (s.iaAcertos / s.total) * 100 : 0,
        taxaHumanos: s.usuariosPalpites > 0 ? (s.usuariosAcertos / s.usuariosPalpites) * 100 : 0,
      }))
      .filter(s => s.total >= 5)
      .sort((a, b) => b.total - a.total);
  }, [comparisons]);

  // Chart data for comparison
  const chartData = useMemo(() => {
    return statsByCampeonato.slice(0, 8).map(s => ({
      campeonato: s.nome.length > 15 ? s.nome.slice(0, 15) + '...' : s.nome,
      fullName: s.nome,
      IA: Math.round(s.taxaIA),
      Humanos: Math.round(s.taxaHumanos),
      partidas: s.total,
    }));
  }, [statsByCampeonato]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRightIcon className="w-4 h-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Ranking IA vs Humanos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-green-500/20">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                Ranking Histórico: IA vs Humanos
              </h1>
              <p className="text-muted-foreground mt-1">
                Comparativo transparente de desempenho em previsões de resultados
              </p>
            </div>
          </div>
        </div>

        {/* Intro Section - SEO */}
        <Card className="bg-muted/30 border-border/50 mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-3">O que é o Ranking Histórico?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              O Ranking Histórico do Statball compara, de forma transparente e contínua, o desempenho 
              das previsões geradas pela <strong>Inteligência Artificial</strong> (modelo matemático 
              baseado em estatísticas) com os palpites da <strong>comunidade de usuários</strong> 
              (leitura humana coletiva).
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Cada jogo finalizado alimenta automaticamente este ranking, permitindo análise histórica 
              por campeonato, temporada e período. O objetivo é demonstrar transparência analítica e 
              gerar dados exclusivos para fortalecer a credibilidade do projeto.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="text-xs">
                <Bot className="w-3 h-3 mr-1" />
                IA: Modelo estatístico automatizado
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Humanos: Palpites da comunidade
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Ad Slot 1 - After Intro */}
        <AdSlot position="article-intro" className="mb-8" />

        {/* Filters */}
        <Card className="bg-card/50 border-border/50 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Campeonato:</span>
                <Select value={selectedCampeonato} onValueChange={(v) => { setSelectedCampeonato(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all">Todos</SelectItem>
                    {campeonatos.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Período:</span>
                <Select value={selectedPeriodo} onValueChange={(v) => { setSelectedPeriodo(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] bg-background">
                    <SelectValue placeholder="Todo período" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all">Todo período</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mês</SelectItem>
                    <SelectItem value="season">Temporada atual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(selectedCampeonato !== "all" || selectedPeriodo !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setSelectedCampeonato("all"); setSelectedPeriodo("all"); setCurrentPage(1); }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overall Stats Comparison */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : overallStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* IA Stats */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Inteligência Artificial</CardTitle>
                  </div>
                  <CardDescription>Modelo estatístico automatizado</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-background/50">
                      <p className="text-3xl font-bold text-primary">
                        {overallStats.ia.taxaResultado.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Acertos de Resultado</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {overallStats.ia.acertosResultado}/{overallStats.total} jogos
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-background/50">
                      <p className="text-3xl font-bold text-primary">
                        {overallStats.ia.taxaPlacar.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Placares Exatos</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {overallStats.ia.acertosPlacar}/{overallStats.total} jogos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Humanos Stats */}
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Comunidade</CardTitle>
                  </div>
                  <CardDescription>Palpites dos usuários agregados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-background/50">
                      <p className="text-3xl font-bold text-green-500">
                        {overallStats.humanos.taxaResultado.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Acertos de Resultado</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {overallStats.humanos.acertosResultado.toLocaleString()}/{overallStats.humanos.totalPalpites.toLocaleString()} palpites
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-background/50">
                      <p className="text-3xl font-bold text-green-500">
                        {overallStats.humanos.taxaPlacar.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Placares Exatos</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {overallStats.humanos.acertosPlacar.toLocaleString()}/{overallStats.humanos.totalPalpites.toLocaleString()} palpites
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Calendar className="h-5 w-5 text-primary" />}
                label="Jogos Analisados"
                value={overallStats.total.toLocaleString()}
                sublabel="partidas finalizadas"
              />
              <StatCard
                icon={<Target className="h-5 w-5 text-primary" />}
                label="Taxa IA"
                value={`${overallStats.ia.taxaResultado.toFixed(1)}%`}
                sublabel="acertos de resultado"
                variant="ia"
              />
              <StatCard
                icon={<Users className="h-5 w-5 text-green-500" />}
                label="Taxa Humanos"
                value={`${overallStats.humanos.taxaResultado.toFixed(1)}%`}
                sublabel="acertos de resultado"
                variant="humanos"
              />
              <StatCard
                icon={<Award className="h-5 w-5 text-primary" />}
                label="Total de Palpites"
                value={overallStats.humanos.totalPalpites.toLocaleString()}
                sublabel="da comunidade"
              />
            </div>
          </>
        )}

        {/* CTA Premium */}
        <PremiumCTA variant="inline" />

        {/* Tabs: By Campeonato / Historical Table */}
        <Tabs defaultValue="campeonatos" className="mt-8">
          <TabsList className="mb-6">
            <TabsTrigger value="campeonatos" className="gap-2">
              <Trophy className="h-4 w-4" />
              Por Campeonato
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <Calendar className="h-4 w-4" />
              Histórico de Jogos
            </TabsTrigger>
          </TabsList>

          {/* By Campeonato */}
          <TabsContent value="campeonatos">
            {chartData.length > 0 && (
              <Card className="bg-card/50 border-border/50 mb-6">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle>Comparativo por Campeonato</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="campeonato" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          formatter={(value: number, name: string) => [
                            `${value}%`,
                            name === 'IA' ? 'IA (Inteligência Artificial)' : 'Humanos (Comunidade)'
                          ]}
                          labelFormatter={(label, payload) => {
                            const item = payload?.[0]?.payload;
                            return `${item?.fullName || label} (${item?.partidas || 0} jogos)`;
                          }}
                        />
                        <Legend />
                        <Bar dataKey="IA" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Humanos" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ad Slot 2 - After Chart */}
            <AdSlot position="article-mid" className="mb-6" />

            {/* Table by Campeonato */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Ranking por Campeonato</CardTitle>
                <CardDescription>Ordenado por número de jogos analisados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campeonato</TableHead>
                        <TableHead className="text-center">Jogos</TableHead>
                        <TableHead className="text-center">Taxa IA</TableHead>
                        <TableHead className="text-center">Taxa Humanos</TableHead>
                        <TableHead className="text-center">Vantagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statsByCampeonato.map(s => {
                        const diff = s.taxaIA - s.taxaHumanos;
                        return (
                          <TableRow key={s.nome}>
                            <TableCell>
                              {s.slug ? (
                                <Link to={`/campeonato/${s.slug}`} className="hover:text-primary transition-colors">
                                  {s.nome}
                                </Link>
                              ) : s.nome}
                            </TableCell>
                            <TableCell className="text-center">{s.total}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{s.taxaIA.toFixed(1)}%</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{s.taxaHumanos.toFixed(1)}%</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={diff > 0 ? 'text-primary' : diff < 0 ? 'text-green-500' : 'text-muted-foreground'}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}% {diff > 0 ? 'IA' : diff < 0 ? 'Hum' : ''}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historical Table */}
          <TabsContent value="historico">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Histórico de Jogos Analisados</CardTitle>
                <CardDescription>
                  {filteredData.length} jogos • Página {currentPage} de {totalPages}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Jogo</TableHead>
                        <TableHead className="text-center">Placar</TableHead>
                        <TableHead className="text-center">Prev. IA</TableHead>
                        <TableHead className="text-center">IA</TableHead>
                        <TableHead className="text-center">Usuários</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map(c => {
                        const timeCasa = c.partidas?.time_casa;
                        const timeFora = c.partidas?.time_fora;
                        
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {c.partidas?.data ? formatDate(c.partidas.data) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[200px]">
                                <TeamBadge name={timeCasa?.nome || ''} size="sm" />
                                <span className="text-sm truncate max-w-[80px]">{timeCasa?.nome || '-'}</span>
                                <span className="text-muted-foreground">x</span>
                                <span className="text-sm truncate max-w-[80px]">{timeFora?.nome || '-'}</span>
                                <TeamBadge name={timeFora?.nome || ''} size="sm" />
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {c.placar_oficial_casa ?? '-'} x {c.placar_oficial_fora ?? '-'}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {c.sistema_placar_casa ?? '-'} x {c.sistema_placar_fora ?? '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {c.sistema_acertou_placar ? (
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Exato</Badge>
                              ) : c.sistema_acertou_resultado ? (
                                <Badge variant="secondary">Resultado</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">Erro</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {c.usuarios_acertaram_resultado || 0}/{c.total_usuarios_palpitaram || 0}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de {filteredData.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm px-3">{currentPage} / {totalPages}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Final CTA */}
        <div className="mt-10">
          <PremiumCTA variant="footer" />
        </div>

        {/* SEO Footer Text */}
        <div className="mt-12 p-6 rounded-xl bg-muted/30 border border-border/50">
          <h2 className="text-lg font-semibold mb-3">Metodologia do Ranking</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            O Ranking Histórico do Statball é atualizado automaticamente após cada jogo finalizado. 
            As previsões da IA são geradas por um modelo matemático baseado em estatísticas históricas, 
            força dos times, desempenho recente e fatores de mando de campo. Os palpites dos usuários 
            são agregados de forma anônima para calcular a taxa de acerto coletiva.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Tipos de acerto:</strong> "Resultado" significa acertar vitória do mandante, 
            visitante ou empate. "Placar Exato" significa acertar o resultado numérico completo 
            (ex: 2x1). Os dados apresentados são exclusivos do Statball e não constituem 
            recomendação de apostas.
          </p>
        </div>
      </div>
    </Layout>
  );
}
