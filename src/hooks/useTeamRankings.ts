import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RankingMetric =
  | "pontos"
  | "melhores-ataques"
  | "melhores-defesas"
  | "mais-gols"
  | "mais-vitorias"
  | "aproveitamento";

export interface RankingRow {
  team_id: string;
  team_nome: string;
  team_slug: string;
  team_cores: { primary?: string; secondary?: string } | null;
  league_id: string | null;
  league_nome: string | null;
  league_slug: string | null;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_marcados: number;
  gols_sofridos: number;
  saldo: number;
  pontos: number;
  media_gols_marcados: number;
  media_gols_sofridos: number;
  aproveitamento: number;
}

export const RANKING_LABELS: Record<RankingMetric, string> = {
  pontos: "Mais Pontos",
  "melhores-ataques": "Melhores Ataques",
  "melhores-defesas": "Melhores Defesas",
  "mais-gols": "Mais Gols Marcados",
  "mais-vitorias": "Mais Vitórias",
  aproveitamento: "Maior Aproveitamento",
};

export function useTeamRankings(
  metric: RankingMetric,
  season: number,
  leagueId: string | null = null,
  limit = 50,
) {
  return useQuery({
    queryKey: ["team-rankings", metric, season, leagueId, limit],
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<RankingRow[]> => {
      const { data, error } = await supabase.rpc("get_team_season_rankings", {
        p_season: season,
        p_league_id: leagueId,
        p_metric: metric,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as RankingRow[];
    },
  });
}
