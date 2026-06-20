import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IAPerformanceKPIs {
  total: number;
  level1: number; // winner
  level2: number; // trend
  level3: number; // diff
  level4: number; // exact
  avgScore: number;
  accuracyWinner: number;
  accuracyTrend: number;
  accuracyDiff: number;
  accuracyExact: number;
}

export interface PerformanceByConfidence {
  band: string;
  total: number;
  accuracy_winner: number;
  accuracy_trend: number;
  accuracy_diff: number;
  accuracy_exact: number;
  avg_score: number;
}

export interface PerformanceByCompetition {
  competition: string;
  total: number;
  winner: number;
  exact: number;
  avg_score: number;
}

export interface PerformanceByStage {
  stage: string;
  total: number;
  winner: number;
  avg_score: number;
}

export interface PerformanceEvolutionPoint {
  date: string;
  total: number;
  winner: number;
  exact: number;
  avg_score: number;
}

async function fetchAll(competitionCode?: string) {
  let query = supabase.from("prediction_performance").select("*");
  if (competitionCode) query = query.eq("competition_code", competitionCode);

  // Paginated fetch (no limit policy)
  const pageSize = 1000;
  let from = 0;
  let all: any[] = [];
  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export function useIAPerformance(competitionCode?: string) {
  return useQuery({
    queryKey: ["ia-performance", competitionCode ?? "all"],
    queryFn: async () => {
      const rows = await fetchAll(competitionCode);
      const total = rows.length;
      const sum = (k: string) => rows.reduce((a, r) => a + (r[k] ? 1 : 0), 0);
      const l1 = sum("level1_winner_correct");
      const l2 = sum("level2_trend_correct");
      const l3 = sum("level3_diff_correct");
      const l4 = sum("level4_exact_correct");
      const avg = total
        ? rows.reduce((a, r) => a + (r.prediction_score ?? 0), 0) / total
        : 0;

      const kpis: IAPerformanceKPIs = {
        total,
        level1: l1,
        level2: l2,
        level3: l3,
        level4: l4,
        avgScore: Number(avg.toFixed(1)),
        accuracyWinner: total ? Number(((l1 / total) * 100).toFixed(1)) : 0,
        accuracyTrend: total ? Number(((l2 / total) * 100).toFixed(1)) : 0,
        accuracyDiff: total ? Number(((l3 / total) * 100).toFixed(1)) : 0,
        accuracyExact: total ? Number(((l4 / total) * 100).toFixed(1)) : 0,
      };

      // Group by confidence band
      const byBandMap = new Map<string, any[]>();
      rows.forEach((r) => {
        const b = r.confidence_band || "unknown";
        if (!byBandMap.has(b)) byBandMap.set(b, []);
        byBandMap.get(b)!.push(r);
      });
      const byConfidence: PerformanceByConfidence[] = Array.from(
        byBandMap.entries()
      ).map(([band, arr]) => {
        const n = arr.length;
        return {
          band,
          total: n,
          accuracy_winner: Number(
            ((arr.filter((r) => r.level1_winner_correct).length / n) * 100).toFixed(1)
          ),
          accuracy_trend: Number(
            ((arr.filter((r) => r.level2_trend_correct).length / n) * 100).toFixed(1)
          ),
          accuracy_diff: Number(
            ((arr.filter((r) => r.level3_diff_correct).length / n) * 100).toFixed(1)
          ),
          accuracy_exact: Number(
            ((arr.filter((r) => r.level4_exact_correct).length / n) * 100).toFixed(1)
          ),
          avg_score: Number(
            (arr.reduce((a, r) => a + (r.prediction_score ?? 0), 0) / n).toFixed(1)
          ),
        };
      });

      // By competition
      const byCompMap = new Map<string, any[]>();
      rows.forEach((r) => {
        const c = r.competition_code || "—";
        if (!byCompMap.has(c)) byCompMap.set(c, []);
        byCompMap.get(c)!.push(r);
      });
      const byCompetition: PerformanceByCompetition[] = Array.from(
        byCompMap.entries()
      ).map(([competition, arr]) => {
        const n = arr.length;
        return {
          competition,
          total: n,
          winner: Number(
            ((arr.filter((r) => r.level1_winner_correct).length / n) * 100).toFixed(1)
          ),
          exact: Number(
            ((arr.filter((r) => r.level4_exact_correct).length / n) * 100).toFixed(1)
          ),
          avg_score: Number(
            (arr.reduce((a, r) => a + (r.prediction_score ?? 0), 0) / n).toFixed(1)
          ),
        };
      });

      // By stage
      const byStageMap = new Map<string, any[]>();
      rows.forEach((r) => {
        const s = r.stage || "—";
        if (!byStageMap.has(s)) byStageMap.set(s, []);
        byStageMap.get(s)!.push(r);
      });
      const byStage: PerformanceByStage[] = Array.from(byStageMap.entries()).map(
        ([stage, arr]) => {
          const n = arr.length;
          return {
            stage,
            total: n,
            winner: Number(
              ((arr.filter((r) => r.level1_winner_correct).length / n) * 100).toFixed(1)
            ),
            avg_score: Number(
              (arr.reduce((a, r) => a + (r.prediction_score ?? 0), 0) / n).toFixed(1)
            ),
          };
        }
      );

      // Evolution over time (by day of frozen_at)
      const byDayMap = new Map<string, any[]>();
      rows.forEach((r) => {
        const d = (r.frozen_at || r.created_at || "").slice(0, 10);
        if (!d) return;
        if (!byDayMap.has(d)) byDayMap.set(d, []);
        byDayMap.get(d)!.push(r);
      });
      const evolution: PerformanceEvolutionPoint[] = Array.from(byDayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, arr]) => {
          const n = arr.length;
          return {
            date,
            total: n,
            winner: Number(
              ((arr.filter((r) => r.level1_winner_correct).length / n) * 100).toFixed(1)
            ),
            exact: Number(
              ((arr.filter((r) => r.level4_exact_correct).length / n) * 100).toFixed(1)
            ),
            avg_score: Number(
              (arr.reduce((a, r) => a + (r.prediction_score ?? 0), 0) / n).toFixed(1)
            ),
          };
        });

      // Cumulative avg_score
      let cumScore = 0;
      let cumCount = 0;
      const cumulativeEvolution = evolution.map((p) => {
        cumScore += p.avg_score * p.total;
        cumCount += p.total;
        return { ...p, cumulative_avg_score: Number((cumScore / cumCount).toFixed(1)) };
      });

      return {
        kpis,
        byConfidence,
        byCompetition,
        byStage,
        evolution: cumulativeEvolution,
      };
    },
    staleTime: 60_000,
  });
}
