import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MatchOdds = {
  id: string;
  match_id: string;
  bookmaker: string;
  home_win: number | null;
  draw: number | null;
  away_win: number | null;
  over_2_5: number | null;
  under_2_5: number | null;
  btts_yes: number | null;
  btts_no: number | null;
  exact_scores: Record<string, number> | null;
  implied_prob_home: number | null;
  implied_prob_draw: number | null;
  implied_prob_away: number | null;
  source: string;
  updated_at: string;
};

export function useMatchOdds(matchId?: string | null) {
  return useQuery({
    enabled: !!matchId,
    queryKey: ["wc2026", "match-odds", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wc2026_match_odds")
        .select("*")
        .eq("match_id", matchId!)
        .eq("bookmaker", "average")
        .maybeSingle();
      if (error) throw error;
      return (data as MatchOdds | null) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMatchesOdds(matchIds: string[]) {
  return useQuery({
    enabled: matchIds.length > 0,
    queryKey: ["wc2026", "match-odds-bulk", matchIds.sort().join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wc2026_match_odds")
        .select("*")
        .in("match_id", matchIds)
        .eq("bookmaker", "average");
      if (error) throw error;
      const map = new Map<string, MatchOdds>();
      for (const o of (data ?? []) as MatchOdds[]) map.set(o.match_id, o);
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}
