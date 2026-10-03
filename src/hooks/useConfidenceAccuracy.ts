import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConfidenceBand = "alta" | "media" | "baixa";

export interface ConfidenceAccuracyRow {
  model_version: string;
  competition_code: string;
  confidence_band: ConfidenceBand;
  total_matches: number;
  accuracy_winner: number;
  accuracy_trend: number;
  accuracy_diff: number;
  accuracy_exact: number;
  avg_score: number;
}

/**
 * Histórico de acerto por faixa de confiança.
 * Retorna mapa { alta: 82, media: 61, baixa: 47 } (% de acerto vencedor).
 */
export function useConfidenceAccuracy(competitionCode: string = "ALL") {
  return useQuery({
    queryKey: ["confidence-accuracy", competitionCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("confidence_accuracy")
        .select("*")
        .eq("competition_code", competitionCode)
        .eq("model_version", "aleball-ai-v1");
      if (error) throw error;
      const rows = (data ?? []) as ConfidenceAccuracyRow[];
      const byBand: Record<ConfidenceBand, ConfidenceAccuracyRow | null> = {
        alta: null,
        media: null,
        baixa: null,
      };
      for (const r of rows) byBand[r.confidence_band as ConfidenceBand] = r;
      return { rows, byBand };
    },
    staleTime: 60_000,
  });
}
