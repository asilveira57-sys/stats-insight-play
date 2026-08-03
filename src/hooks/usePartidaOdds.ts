import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PartidaOdds = {
  id: string;
  partida_id: string;
  bookmaker: string;
  home_win: number | null;
  draw: number | null;
  away_win: number | null;
  over_2_5: number | null;
  under_2_5: number | null;
  btts_yes: number | null;
  btts_no: number | null;
  implied_prob_home: number | null;
  implied_prob_draw: number | null;
  implied_prob_away: number | null;
  is_pregame: boolean;
  source: string;
  updated_at: string;
};

/** Odds de uma única partida (tabela genérica `match_odds`). */
export function usePartidaOdds(partidaId?: string | null) {
  return useQuery({
    enabled: !!partidaId,
    queryKey: ["match-odds", partidaId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("match_odds" as any) as any)
        .select("*")
        .eq("partida_id", partidaId!)
        .maybeSingle();
      if (error) throw error;
      return (data as PartidaOdds | null) ?? null;
    },
  });
}

/** Odds de várias partidas em uma única consulta (para listas de cards). */
export function usePartidasOdds(partidaIds: string[]) {
  const key = [...partidaIds].sort().join(",");
  return useQuery({
    enabled: partidaIds.length > 0,
    queryKey: ["match-odds-bulk", key],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const map = new Map<string, PartidaOdds>();
      const chunkSize = 200;
      for (let i = 0; i < partidaIds.length; i += chunkSize) {
        const chunk = partidaIds.slice(i, i + chunkSize);
        const { data, error } = await (supabase.from("match_odds" as any) as any)
          .select("*")
          .in("partida_id", chunk);
        if (error) throw error;
        for (const o of (data ?? []) as PartidaOdds[]) map.set(o.partida_id, o);
      }
      return map;
    },
  });
}
