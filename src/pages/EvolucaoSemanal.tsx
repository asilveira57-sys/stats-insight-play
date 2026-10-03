import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Brain, 
  Users, 
  Target,
  Calendar,
  Trophy,
  ArrowRight,
  BarChart3,
  FileText
} from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdSlot } from "@/components/ads/AdSlot";
import { PremiumCTA } from "@/components/news/PremiumCTA";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";

interface WeeklyRow {
  week_start: string;
  total_games: number;
  ia_correct: number;
  human_total: number;
  human_correct: number;
}

interface ChampionshipRow {
  liga_nome: string;
  liga_slug: string | null;
  ia_total: number;
  ia_correct: number;
  human_total: number;
  human_correct: number;
}


interface WeeklyStats {
  weekNumber: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalGames: number;
  iaAccuracy: number;
  humanAccuracy: number;
  iaCorrect: number;
  humanCorrect: number;
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function getWeekLabel(weekNum: number, year: number): string {
  return `S${weekNum}`;
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;
}

export default function EvolucaoSemanal() {
  const { data: weeklyRows, isLoading } = useQuery({
    queryKey: ['weekly-evolution-agg'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_prediction_evolution', { p_weeks: 12 });
      if (error) throw error;
      return (data ?? []) as WeeklyRow[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: championshipRows } = useQuery({
    queryKey: ['weekly-evolution-championships'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_championship_prediction_stats', { p_days: 14, p_limit: 5 });
      if (error) throw error;
      return (data ?? []) as ChampionshipRow[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const weeklyStats = useMemo<WeeklyStats[]>(() => {
    if (!weeklyRows || weeklyRows.length === 0) return [];

    return weeklyRows.map((row) => {
      const startDate = new Date(`${row.week_start}T00:00:00`);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const totalGames = Number(row.total_games) || 0;
      const iaCorrect = Number(row.ia_correct) || 0;
      const humanTotal = Number(row.human_total) || 0;
      const humanCorrect = Number(row.human_correct) || 0;
      const weekNum = getWeekNumber(startDate);

      return {
        weekNumber: weekNum,
        weekLabel: getWeekLabel(weekNum, startDate.getFullYear()),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalGames,
        iaAccuracy: totalGames > 0 ? (iaCorrect / totalGames) * 100 : 0,
        humanAccuracy: humanTotal > 0 ? (humanCorrect / humanTotal) * 100 : 0,
        iaCorrect,
        humanCorrect,
      };
    });
  }, [weeklyRows]);


  const currentWeek = weeklyStats[weeklyStats.length - 1];
  const previousWeek = weeklyStats[weeklyStats.length - 2];

  const iaTrend = useMemo(() => {
    if (!currentWeek || !previousWeek) return { direction: 'neutral' as const, value: 0 };
    const diff = currentWeek.iaAccuracy - previousWeek.iaAccuracy;
    return {
      direction: diff > 1 ? 'up' as const : diff < -1 ? 'down' as const : 'neutral' as const,
      value: Math.abs(diff),
    };
  }, [currentWeek, previousWeek]);

  const humanTrend = useMemo(() => {
    if (!currentWeek || !previousWeek) return { direction: 'neutral' as const, value: 0 };
    const diff = currentWeek.humanAccuracy - previousWeek.humanAccuracy;
    return {
      direction: diff > 1 ? 'up' as const : diff < -1 ? 'down' as const : 'neutral' as const,
      value: Math.abs(diff),
    };
  }, [currentWeek, previousWeek]);

  const bestIaWeek = useMemo(() => {
    if (weeklyStats.length === 0) return null;
    return weeklyStats.reduce((best, week) => 
      week.iaAccuracy > best.iaAccuracy ? week : best
    , weeklyStats[0]);
  }, [weeklyStats]);

  const bestHumanWeek = useMemo(() => {
    if (weeklyStats.length === 0) return null;
    return weeklyStats.reduce((best, week) => 
      week.humanAccuracy > best.humanAccuracy ? week : best
    , weeklyStats[0]);
  }, [weeklyStats]);

  const championshipStats = useMemo(() => {
    if (!championshipRows) return [];
    return championshipRows.map((row) => ({
      name: row.liga_nome,
      slug: row.liga_slug,
      iaTotal: Number(row.ia_total) || 0,
      iaCorrect: Number(row.ia_correct) || 0,
      humanTotal: Number(row.human_total) || 0,
      humanCorrect: Number(row.human_correct) || 0,
    }));
  }, [championshipRows]);


  const chartConfig = {
    ia: {
      label: "IA",
      color: "hsl(var(--primary))",
    },
    humanos: {
      label: "Humanos",
      color: "hsl(var(--secondary))",
    },
  };

  const chartData = weeklyStats.map(week => ({
    name: week.weekLabel,
    ia: Math.round(week.iaAccuracy * 10) / 10,
    humanos: Math.round(week.humanAccuracy * 10) / 10,
    games: week.totalGames,
  }));

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
    if (direction === 'up') return <TrendingUp className="w-4 h-4 text-secondary" />;
    if (direction === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
          <span>/</span>
          <Link to="/performance/previsoes" className="hover:text-foreground transition-colors">Performance</Link>
          <span>/</span>
          <span className="text-foreground">Evolução Semanal</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Evolução Semanal de Previsões
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Visualize como o desempenho das previsões evolui semana a semana. 
            Este dashboard compara a precisão da IA com os palpites dos usuários, 
            sempre com base nos resultados reais das partidas.
          </p>
        </header>

        <AdSlot position="article-intro" className="mb-8" />

        {/* Key Metrics Cards */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Indicadores da Semana Atual
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Brain className="w-8 h-8 text-primary" />
                    <div className="flex items-center gap-1">
                      <TrendIcon direction={iaTrend.direction} />
                      <span className="text-xs text-muted-foreground">
                        {iaTrend.value.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {currentWeek ? `${currentWeek.iaAccuracy.toFixed(1)}%` : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Acerto IA</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-secondary" />
                    <div className="flex items-center gap-1">
                      <TrendIcon direction={humanTrend.direction} />
                      <span className="text-xs text-muted-foreground">
                        {humanTrend.value.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {currentWeek ? `${currentWeek.humanAccuracy.toFixed(1)}%` : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Acerto Humanos</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">
                    {currentWeek ? currentWeek.totalGames : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Jogos Analisados</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{weeklyStats.length}</p>
                  <p className="text-sm text-muted-foreground">Semanas no Histórico</p>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* Weekly Evolution Chart */}
        <section className="mb-10">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Evolução ao Longo das Semanas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comparação da taxa de acerto entre IA e palpites humanos nas últimas {weeklyStats.length} semanas
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value: number) => [`${value}%`, '']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ia"
                        name="IA"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="humanos"
                        name="Humanos"
                        stroke="hsl(var(--secondary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                O gráfico mostra a evolução semana a semana. Variações são esperadas 
                devido à natureza imprevisível do futebol — o importante é observar tendências de longo prazo.
              </p>
            </CardContent>
          </Card>
        </section>

        <AdSlot position="article-mid" className="mb-8" />

        {/* Week Highlights */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Destaques do Período
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Melhor Semana da IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bestIaWeek ? (
                  <>
                    <p className="text-2xl font-bold text-primary">
                      {bestIaWeek.iaAccuracy.toFixed(1)}% de acerto
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Semana {bestIaWeek.weekNumber} • {bestIaWeek.totalGames} jogos analisados
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateRange(bestIaWeek.startDate, bestIaWeek.endDate)}
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-16" />
                )}
              </CardContent>
            </Card>

            <Card className="border-secondary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary" />
                  Melhor Semana dos Humanos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bestHumanWeek ? (
                  <>
                    <p className="text-2xl font-bold text-secondary">
                      {bestHumanWeek.humanAccuracy.toFixed(1)}% de acerto
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Semana {bestHumanWeek.weekNumber} • {bestHumanWeek.totalGames} jogos analisados
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateRange(bestHumanWeek.startDate, bestHumanWeek.endDate)}
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-16" />
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Championship Breakdown */}
        {championshipStats.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Desempenho por Campeonato (Últimas 2 Semanas)
            </h2>

            <div className="grid gap-3">
              {championshipStats.map((champ) => (
                <Card key={champ.name} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{champ.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {champ.iaTotal} jogos analisados
                        </p>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-primary">
                            {((champ.iaCorrect / champ.iaTotal) * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">IA</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-secondary">
                            {champ.humanTotal > 0 
                              ? ((champ.humanCorrect / champ.humanTotal) * 100).toFixed(0) 
                              : '-'}%
                          </p>
                          <p className="text-xs text-muted-foreground">Humanos</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <PremiumCTA variant="subtle" />

        {/* Navigation Links */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Conteúdos Relacionados
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/performance/previsoes">
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <Target className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Performance de Previsões</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Metodologia completa e análise consolidada de performance
                  </p>
                  <span className="text-sm text-primary flex items-center gap-1">
                    Acessar <ArrowRight className="w-4 h-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link to="/ranking/ia-vs-humanos">
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <Trophy className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Ranking Histórico</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Comparação completa entre IA e humanos ao longo do tempo
                  </p>
                  <span className="text-sm text-primary flex items-center gap-1">
                    Ver ranking <ArrowRight className="w-4 h-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link to="/validacao/semanal">
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <Calendar className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">Validações Semanais</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Análises detalhadas de cada semana de previsões
                  </p>
                  <span className="text-sm text-primary flex items-center gap-1">
                    Ver validações <ArrowRight className="w-4 h-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        <PremiumCTA variant="prominent" />

        {/* SEO Footer */}
        <footer className="mt-12 pt-8 border-t border-border">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Sobre Este Dashboard
            </h2>
            <p>
              O dashboard de evolução semanal do Aleball oferece uma visão clara e transparente 
              de como as previsões de futebol evoluem ao longo do tempo. Comparamos sistematicamente 
              o desempenho da nossa IA com os palpites dos usuários, sempre utilizando os resultados 
              reais das partidas como base de validação.
            </p>
            <p>
              Os dados são atualizados automaticamente ao final de cada semana esportiva, 
              mantendo um histórico contínuo que permite identificar tendências e padrões 
              de longo prazo. Este dashboard complementa nossa página de performance de previsões 
              e o ranking histórico, oferecendo diferentes perspectivas sobre a mesma base de dados.
            </p>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
