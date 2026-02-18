import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MergeReportMatch {
  match_id: string;
  data: string;
  liga_id: string | null;
  liga_nome: string | null;
  time_casa_id: string;
  time_casa_nome: string;
  time_fora_id: string;
  time_fora_nome: string;
  gols_casa: number | null;
  gols_fora: number | null;
  status: string;
  api_id: number | null;
  providers: { source_id: string; external_id: string }[];
}

export interface TeamReportData {
  team_id: string;
  nome: string;
  slug: string | null;
  api_id: number | null;
  pais: string | null;
  escudo_url: string | null;
  total_matches: number;
  first_match_date: string | null;
  last_match_date: string | null;
  distinct_leagues: number;
  distinct_providers: number;
  stats: {
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    avg_goals_for: number;
    avg_goals_against: number;
  };
  leagues: { league_id: string | null; league_name: string; count: number; pct: number }[];
  top_opponents: { team_id: string; team_name: string; count: number; pct: number }[];
  external_ids: { source_id: string; external_id: string; confidence: string }[];
  matches: MergeReportMatch[];
}

export interface SimilarityData {
  similarity_score: number;
  risk_level: "baixo" | "medio" | "alto";
  recommendation_text: string;
  top_reasons: string[];
}

export interface MergeReport {
  team_a: TeamReportData;
  team_b: TeamReportData;
  similarity: SimilarityData;
  generated_at: string;
}

export function useMergeReport(teamAId: string | null, teamBId: string | null) {
  const [forceRefresh, setForceRefresh] = useState(false);

  const query = useQuery({
    queryKey: ["merge-report", teamAId, teamBId, forceRefresh],
    queryFn: async (): Promise<MergeReport> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/team-merge-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            team_a_id: teamAId,
            team_b_id: teamBId,
            force_refresh: forceRefresh,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate report");
      }

      const result = await response.json();
      setForceRefresh(false);
      return result;
    },
    enabled: !!teamAId && !!teamBId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    refresh: () => setForceRefresh(true),
  };
}

export function useMergeRequiresReport() {
  return useQuery({
    queryKey: ["merge-requires-report-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "exigir_visualizacao_relatorio_pre_fusao")
        .single();

      if (error) return false;
      return data?.valor === "true";
    },
    staleTime: 60 * 1000,
  });
}

export function useSaveMergeDecision() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      keptTeamId: string;
      removedTeamId: string;
      similarityScore: number | null;
      riskLevel: string | null;
      decisionReason: string;
      decisionReasonDetail?: string;
      reportSnapshot?: any;
    }) => {
      const { error } = await supabase.from("team_merge_decisions").insert({
        kept_team_id: params.keptTeamId,
        removed_team_id: params.removedTeamId,
        similarity_score: params.similarityScore,
        risk_level: params.riskLevel,
        decision_reason: params.decisionReason,
        decision_reason_detail: params.decisionReasonDetail || null,
        report_snapshot_json: params.reportSnapshot || null,
        decided_by_user_id: user?.id || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merge-decisions"] });
    },
  });
}
