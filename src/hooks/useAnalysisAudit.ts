import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalysisAudit {
  id: string;
  analysis_id: string;
  match_id: string | null;
  data_source_count: number;
  verified_claims: number;
  unverified_claims: number;
  inconsistent_claims: number;
  audit_score: number;
  audit_grade: "A" | "B" | "C" | "D" | "E";
  badge: "verified" | "partial" | "low";
  claims_detail: Array<{ claim: string; status: string; source?: string }>;
}

export function useAnalysisAudit(matchId: string | undefined | null) {
  return useQuery({
    queryKey: ["analysis-audit", matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_audit")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as AnalysisAudit | null;
    },
    staleTime: 60_000,
  });
}

export function useAnalysisAuditByAnalysis(analysisId: string | undefined | null) {
  return useQuery({
    queryKey: ["analysis-audit-by-analysis", analysisId],
    enabled: !!analysisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_audit")
        .select("*")
        .eq("analysis_id", analysisId)
        .maybeSingle();
      if (error) throw error;
      return data as AnalysisAudit | null;
    },
    staleTime: 60_000,
  });
}
