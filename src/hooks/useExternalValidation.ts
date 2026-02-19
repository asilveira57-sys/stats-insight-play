import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ValidationEvidence {
  game: {
    match_id: string;
    data: string;
    liga_nome: string | null;
    mandante: string;
    visitante: string;
    gols_casa: number | null;
    gols_fora: number | null;
    context: string;
  };
  status: "verified_strong" | "verified_medium" | "not_verified" | "conflict";
  links: { url: string; title: string; snippet: string }[];
  summary: string;
}

export interface ValidationRunResult {
  id: string;
  kept_team_id: string;
  removed_team_id: string;
  started_at: string;
  finished_at: string | null;
  decision: "SAME_TEAM" | "DIFFERENT_TEAM" | "INCONCLUSIVE" | null;
  confidence_score: number | null;
  risk_level: string | null;
  reasons_json: string[];
  evidence_json: ValidationEvidence[];
  sample_games_json: any[];
  ai_model_used: string | null;
  search_provider_used: string | null;
  slug_suggestion: {
    canonical_slug: string;
    aliases: string[];
    team_a_identity: { most_common_name: string; city?: string; state?: string; country?: string; confidence: string };
    team_b_identity: { most_common_name: string; city?: string; state?: string; country?: string; confidence: string };
    recommended_action: "auto_merge" | "manual_review" | "block";
  } | null;
  recommended_action: string;
  merge_result: any;
  team_a_name: string;
  team_b_name: string;
}

export function useRunExternalValidation() {
  return useMutation({
    mutationFn: async (params: {
      keptTeamId: string;
      removedTeamId: string;
      forceRefresh?: boolean;
      autoMergeMode?: boolean;
      strictMode?: boolean;
    }): Promise<ValidationRunResult> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-team-merge-validation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            kept_team_id: params.keptTeamId,
            removed_team_id: params.removedTeamId,
            force_refresh: params.forceRefresh || false,
            auto_merge_mode: params.autoMergeMode || false,
            strict_mode: params.strictMode || false,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Validation failed");
      }

      return response.json();
    },
  });
}

export function useLatestValidationRun(keptTeamId: string | null, removedTeamId: string | null) {
  return useQuery({
    queryKey: ["validation-run", keptTeamId, removedTeamId],
    queryFn: async (): Promise<ValidationRunResult | null> => {
      if (!keptTeamId || !removedTeamId) return null;

      const { data, error } = await supabase
        .from("team_merge_validation_runs")
        .select("*")
        .eq("kept_team_id", keptTeamId)
        .eq("removed_team_id", removedTeamId)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        evidence_json: (data.evidence_json || []) as unknown as ValidationEvidence[],
        reasons_json: (data.reasons_json || []) as unknown as string[],
        sample_games_json: (data.sample_games_json || []) as unknown as any[],
        slug_suggestion: data.slug_suggestion as unknown as ValidationRunResult["slug_suggestion"],
        recommended_action: ((data as any).slug_suggestion as any)?.recommended_action || "manual_review",
        merge_result: null,
        team_a_name: "",
        team_b_name: "",
      } as ValidationRunResult;
    },
    enabled: !!keptTeamId && !!removedTeamId,
    staleTime: 5 * 60 * 1000,
  });
}
