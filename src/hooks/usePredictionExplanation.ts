import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PredictionExplanation {
  id: string;
  prediction_id: string;
  match_id: string | null;
  model_version: string;
  weights: Record<string, number>;
  rationale: string | null;
  top_factors: Array<{ key: string; label: string; weight: number; detail?: string }>;
}

export function usePredictionExplanation(matchId: string | undefined | null) {
  return useQuery({
    queryKey: ["prediction-explanation", matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prediction_explanations")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PredictionExplanation | null;
    },
    staleTime: 60_000,
  });
}
