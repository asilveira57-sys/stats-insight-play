import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/ads/AdSlot";
import { PremiumCTA } from "@/components/news/PremiumCTA";
import { 
  TrendingUp, TrendingDown, Minus, Brain, Users, Target, 
  ArrowRight, BarChart3, Calendar, Trophy, ChevronRight,
  LineChart, Award, Zap
} from "lucide-react";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { format, startOfWeek, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeeklyData {
  week: string;
  weekLabel: string;
  iaAccuracy: number;
  humanAccuracy: number;
  totalGames: number;
  iaCorrect: number;
  humanCorrect: number;
}

export default function Evolucao() {
  // Buscar dados dos últimos 3 meses
  const { data: comparisonData, isLoading } = useQuery({
    queryKey: ['evolucao-data'],
    queryFn: async () => {
      const threeMonthsAgo = subMonths(new Date(), 3).toISOString();
      
      const { data, error } = await supabase
        .from('comparativo_resultados')
        .select(`
          id,
          created_at,
          sistema_acertou_resultado,
          usuarios_acertaram_resultado,
          total_usuarios_palpitaram,
          partida_id,
          partidas!inner (
            data,
            liga_id,
            ligas (nome)
          )
        `)
        .gte('created_at', threeMonthsAgo)
        .not('sistema_acertou_resultado', 'is', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Calcular estatísticas semanais
  const weeklyStats = useMemo(() => {
    if (!comparisonData?.length) return [];

    const weekMap = new Map<string, WeeklyData>();

    comparisonData.forEach((item: any) => {
      const matchDate = item.partidas?.data;
      if (!matchDate) return;

      const weekStart = startOfWeek(parseISO(matchDate), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const weekLabel = format(weekStart, "dd/MM", { locale: ptBR });

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          week: weekKey,
          weekLabel,
          iaAccuracy: 0,
          humanAccuracy: 0,
          totalGames: 0,
          iaCorrect: 0,
          humanCorrect: 0,
        });
      }

      const stats = weekMap.get(weekKey)!;
      stats.totalGames++;

      if (item.sistema_acertou_resultado) {
        stats.iaCorrect++;
      }

      const totalUsers = item.total_usuarios_palpitaram || 0;
      const usersCorrect = item.usuarios_acertaram_resultado || 0;
      if (totalUsers > 0 && usersCorrect > 0) {
        stats.humanCorrect += usersCorrect > totalUsers / 2 ? 1 : 0;
      }
    });

    // Calcular porcentagens
    return Array.from(weekMap.values())
      .map(week => ({
        ...week,
        iaAccuracy: week.totalGames > 0 ? Math.round((week.iaCorrect / week.totalGames) * 100) : 0,
        humanAccuracy: week.totalGames > 0 ? Math.round((week.humanCorrect / week.totalGames) * 100) : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12); // Últimas 12 semanas
  }, [comparisonData]);

  // Estatísticas gerais
  const overallStats = useMemo(() => {
    if (!weeklyStats.length) return null;

    const totalGames = weeklyStats.reduce((sum, w) => sum + w.totalGames, 0);
    const totalIaCorrect = weeklyStats.reduce((sum, w) => sum + w.iaCorrect, 0);
    const totalHumanCorrect = weeklyStats.reduce((sum, w) => sum + w.humanCorrect, 0);

    const currentWeek = weeklyStats[weeklyStats.length - 1];
    const previousWeek = weeklyStats[weeklyStats.length - 2];

    const iaTrend = previousWeek 
      ? currentWeek.iaAccuracy - previousWeek.iaAccuracy 
      : 0;
    const humanTrend = previousWeek 
      ? currentWeek.humanAccuracy - previousWeek.humanAccuracy 
      : 0;

    return {
      totalGames,
      iaAccuracy: totalGames > 0 ? Math.round((totalIaCorrect / totalGames) * 100) : 0,
      humanAccuracy: totalGames > 0 ? Math.round((totalHumanCorrect / totalGames) * 100) : 0,
      currentWeek,
      iaTrend,
      humanTrend,
      weeksAnalyzed: weeklyStats.length,
    };
  }, [weeklyStats]);

  // Identificar destaques
  const highlights = useMemo(() => {
    if (!weeklyStats.length) return null;

    const bestIaWeek = [...weeklyStats].sort((a, b) => b.iaAccuracy - a.iaAccuracy)[0];
    const bestHumanWeek = [...weeklyStats].sort((a, b) => b.humanAccuracy - a.humanAccuracy)[0];
    const mostGamesWeek = [...weeklyStats].sort((a, b) => b.totalGames - a.totalGames)[0];

    return { bestIaWeek, bestHumanWeek, mostGamesWeek };
  }, [weeklyStats]);

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/performance/previsoes" className="hover:text-foreground transition-colors">Performance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Evolução</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">Evolução da Performance</h1>
              <p className="text-muted-foreground">
                Acompanhe como a precisão das previsões evolui ao longo do tempo
              </p>
            </div>
          </div>
        </div>

        {/* Introdução */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg mb-2">Como interpretar os dados</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Este módulo mostra a <strong>evolução temporal</strong> da precisão das previsões matemáticas (IA) 
                  comparada com os palpites dos usuários. Os gráficos revelam tendências, padrões sazonais e 
                  permitem identificar períodos de maior ou menor assertividade. Use esses insights para 
                  entender melhor o comportamento do modelo ao longo das rodadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas atuais */}
        {overallStats && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Precisão IA (Geral)</p>
                    <p className="text-2xl font-bold text-primary">{overallStats.iaAccuracy}%</p>
                  </div>
                  <Brain className="w-8 h-8 text-primary/20" />
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <TrendIcon value={overallStats.iaTrend} />
                  <span className={overallStats.iaTrend >= 0 ? "text-green-500" : "text-red-500"}>
                    {overallStats.iaTrend > 0 ? "+" : ""}{overallStats.iaTrend}% vs semana anterior
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Precisão Humanos (Geral)</p>
                    <p className="text-2xl font-bold text-secondary">{overallStats.humanAccuracy}%</p>
                  </div>
                  <Users className="w-8 h-8 text-secondary/20" />
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <TrendIcon value={overallStats.humanTrend} />
                  <span className={overallStats.humanTrend >= 0 ? "text-green-500" : "text-red-500"}>
                    {overallStats.humanTrend > 0 ? "+" : ""}{overallStats.humanTrend}% vs semana anterior
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Jogos Analisados</p>
                    <p className="text-2xl font-bold">{overallStats.totalGames}</p>
                  </div>
                  <Target className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Últimas {overallStats.weeksAnalyzed} semanas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Vantagem IA</p>
                    <p className="text-2xl font-bold">
                      {overallStats.iaAccuracy - overallStats.humanAccuracy > 0 ? "+" : ""}
                      {overallStats.iaAccuracy - overallStats.humanAccuracy}%
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {overallStats.iaAccuracy > overallStats.humanAccuracy 
                    ? "IA está à frente" 
                    : overallStats.iaAccuracy < overallStats.humanAccuracy 
                      ? "Humanos à frente"
                      : "Empate técnico"
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <AdSlot position="article-intro" />

        {/* Gráfico de Evolução */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-primary" />
              Evolução Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
              </div>
            ) : weeklyStats.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyStats}>
                    <defs>
                      <linearGradient id="iaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="humanGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="weekLabel" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value}%`,
                        name === 'iaAccuracy' ? 'IA' : 'Humanos'
                      ]}
                      labelFormatter={(label) => `Semana de ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="iaAccuracy" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#iaGradient)"
                      strokeWidth={2}
                      name="iaAccuracy"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="humanAccuracy" 
                      stroke="hsl(var(--secondary))" 
                      fill="url(#humanGradient)"
                      strokeWidth={2}
                      name="humanAccuracy"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Dados insuficientes para exibir o gráfico
              </div>
            )}
            
            {/* Legenda */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Modelo Matemático (IA)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-sm text-muted-foreground">Palpites Humanos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destaques */}
        {highlights && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Melhor Semana IA</h3>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">{highlights.bestIaWeek.iaAccuracy}%</p>
                <p className="text-sm text-muted-foreground">
                  Semana de {highlights.bestIaWeek.weekLabel} • {highlights.bestIaWeek.totalGames} jogos
                </p>
              </CardContent>
            </Card>

            <Card className="border-secondary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-secondary" />
                  <h3 className="font-semibold">Melhor Semana Humanos</h3>
                </div>
                <p className="text-2xl font-bold text-secondary mb-1">{highlights.bestHumanWeek.humanAccuracy}%</p>
                <p className="text-sm text-muted-foreground">
                  Semana de {highlights.bestHumanWeek.weekLabel} • {highlights.bestHumanWeek.totalGames} jogos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold">Semana Mais Ativa</h3>
                </div>
                <p className="text-2xl font-bold mb-1">{highlights.mostGamesWeek.totalGames} jogos</p>
                <p className="text-sm text-muted-foreground">
                  Semana de {highlights.mostGamesWeek.weekLabel}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <PremiumCTA />

        {/* Links relacionados */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Explore mais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link to="/performance/previsoes" className="group">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      Dashboard de Performance
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Visão completa da precisão do modelo matemático
                  </p>
                </div>
              </Link>

              <Link to="/validacao/semanal" className="group">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      Série Semanal
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Validações detalhadas semana a semana
                  </p>
                </div>
              </Link>

              <Link to="/ranking/ia-vs-humanos" className="group">
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <Award className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      IA vs Humanos
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ranking comparativo detalhado
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <AdSlot position="article-end" />

        {/* SEO Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-semibold mb-4">Sobre a Evolução de Performance</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-muted-foreground text-sm leading-relaxed">
              O módulo de Evolução do Statball oferece uma análise temporal única da precisão das previsões 
              matemáticas. Ao acompanhar a evolução semanal, você pode identificar padrões, entender melhor 
              o comportamento do modelo em diferentes períodos da temporada e comparar objetivamente a 
              performance da inteligência artificial com os palpites da comunidade. Esta análise é 
              fundamental para validar a metodologia e aprimorar continuamente a precisão das previsões.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
