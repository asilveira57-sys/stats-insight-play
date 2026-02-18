import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Brain, Users, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { fetchAllRecords } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ComparisonData {
  id: string;
  sistema_acertou_resultado: boolean | null;
  total_usuarios_palpitaram: number | null;
  usuarios_acertaram_resultado: number | null;
  created_at: string | null;
  partidas?: {
    data: string;
  } | null;
}

interface WeeklyStats {
  weekLabel: string;
  iaAccuracy: number;
  humanAccuracy: number;
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

export function WeeklyEvolutionWidget() {
  const { data: comparisonData, isLoading } = useQuery({
    queryKey: ['weekly-evolution-widget'],
    queryFn: async () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      const data = await fetchAllRecords<ComparisonData>(
        'comparativo_resultados',
        `id, sistema_acertou_resultado, total_usuarios_palpitaram,
         usuarios_acertaram_resultado, created_at, partidas(data)`,
        (q) => q.gte('created_at', twoMonthsAgo.toISOString()),
        { column: 'created_at', ascending: true }
      );
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const weeklyStats = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return [];

    const weekMap = new Map<string, {
      weekNumber: number;
      year: number;
      iaCorrect: number;
      iaTotal: number;
      humanCorrect: number;
      humanTotal: number;
    }>();

    comparisonData.forEach(item => {
      const date = new Date(item.partidas?.data || item.created_at || '');
      const weekNum = getWeekNumber(date);
      const year = date.getFullYear();
      const key = `${year}-${weekNum}`;

      if (!weekMap.has(key)) {
        weekMap.set(key, {
          weekNumber: weekNum,
          year,
          iaCorrect: 0,
          iaTotal: 0,
          humanCorrect: 0,
          humanTotal: 0,
        });
      }
      
      const stats = weekMap.get(key)!;
      stats.iaTotal++;
      if (item.sistema_acertou_resultado) stats.iaCorrect++;
      
      if (item.total_usuarios_palpitaram && item.total_usuarios_palpitaram > 0) {
        stats.humanTotal += item.total_usuarios_palpitaram;
        stats.humanCorrect += item.usuarios_acertaram_resultado || 0;
      }
    });

    const result: WeeklyStats[] = [];
    const sortedKeys = Array.from(weekMap.keys()).sort();
    
    sortedKeys.slice(-4).forEach(key => {
      const stats = weekMap.get(key)!;
      result.push({
        weekLabel: `S${stats.weekNumber}`,
        iaAccuracy: stats.iaTotal > 0 ? (stats.iaCorrect / stats.iaTotal) * 100 : 0,
        humanAccuracy: stats.humanTotal > 0 ? (stats.humanCorrect / stats.humanTotal) * 100 : 0,
      });
    });

    return result;
  }, [comparisonData]);

  const currentWeek = weeklyStats[weeklyStats.length - 1];
  const previousWeek = weeklyStats[weeklyStats.length - 2];

  const iaTrend = useMemo(() => {
    if (!currentWeek || !previousWeek) return 'neutral';
    const diff = currentWeek.iaAccuracy - previousWeek.iaAccuracy;
    return diff > 1 ? 'up' : diff < -1 ? 'down' : 'neutral';
  }, [currentWeek, previousWeek]);

  const humanTrend = useMemo(() => {
    if (!currentWeek || !previousWeek) return 'neutral';
    const diff = currentWeek.humanAccuracy - previousWeek.humanAccuracy;
    return diff > 1 ? 'up' : diff < -1 ? 'down' : 'neutral';
  }, [currentWeek, previousWeek]);

  const TrendIcon = ({ direction }: { direction: string }) => {
    if (direction === 'up') return <TrendingUp className="w-3 h-3 text-secondary" />;
    if (direction === 'down') return <TrendingDown className="w-3 h-3 text-destructive" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (weeklyStats.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card border-border/50 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Evolução Semanal
          </CardTitle>
          <Link to="/performance/evolucao-semanal">
            <Button variant="ghost" size="sm" className="text-primary text-xs">
              Ver completo
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Desempenho das previsões nas últimas semanas
        </p>
      </CardHeader>
      <CardContent>
        {/* Mini Chart - Visual bars */}
        <div className="flex items-end justify-between gap-1 h-16 mb-4">
          {weeklyStats.map((week, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end h-12">
                <div 
                  className="flex-1 bg-primary/80 rounded-t transition-all"
                  style={{ height: `${Math.max(week.iaAccuracy, 5)}%` }}
                  title={`IA: ${week.iaAccuracy.toFixed(1)}%`}
                />
                <div 
                  className="flex-1 bg-secondary/80 rounded-t transition-all"
                  style={{ height: `${Math.max(week.humanAccuracy, 5)}%` }}
                  title={`Humanos: ${week.humanAccuracy.toFixed(1)}%`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{week.weekLabel}</span>
            </div>
          ))}
        </div>

        {/* Current Week Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
            <Brain className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">IA</p>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm">
                  {currentWeek ? `${currentWeek.iaAccuracy.toFixed(0)}%` : '-'}
                </span>
                <TrendIcon direction={iaTrend} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/5">
            <Users className="w-4 h-4 text-secondary" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Humanos</p>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm">
                  {currentWeek ? `${currentWeek.humanAccuracy.toFixed(0)}%` : '-'}
                </span>
                <TrendIcon direction={humanTrend} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
