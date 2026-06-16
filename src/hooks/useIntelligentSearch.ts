import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SearchEntity {
  type: "team" | "league" | "player";
  id: string;
  name: string;
}

export interface SearchResultRow {
  entity_type: "team" | "league" | "player";
  entity_id: string;
  name: string;
  extra: any;
  score: number;
}

export interface AIAnswer {
  answer: string;
  explanation: string;
  has_enough_data: boolean;
  confidence: number;
}

export interface TopScorerRow {
  jogador: string;
  slug?: string | null;
  time?: string | null;
  gols: number;
  temporada?: string | null;
}

export interface MatchRow {
  id: string;
  data: string | null;
  slug: string | null;
  is_home: boolean;
  home_team: string;
  away_team: string;
  home_team_slug: string | null;
  away_team_slug: string | null;
  gols_casa: number | null;
  gols_fora: number | null;
  liga_id: string | null;
  liga_nome: string | null;
  liga_slug: string | null;
}

export interface CompetitionRow {
  id: string;
  name: string;
  slug: string | null;
  total: number;
  w: number;
  d: number;
  l: number;
}

export type StructuredAnswer =
  | {
      kind: "team_stats";
      summary: string;
      team: { id: string; name: string; slug: string | null };
      year: number | null;
      scope: "home" | "away" | null;
      breakdown: { total: number; vitorias: number; empates: number; derrotas: number; gols_pro: number; gols_contra: number };
      competitions: CompetitionRow[];
      matches: MatchRow[];
      total_matches: number;
    }
  | {
      kind: "top_scorer";
      summary: string;
      league: { id: string; name: string; slug: string | null };
      year: number | null;
      source: string;
      top_scorers: TopScorerRow[];
    };

export interface SearchResponse {
  type: string;
  intent?: string;
  query: string;
  normalized: string;
  year?: number | null;
  scope?: "home" | "away" | null;
  entities: SearchEntity[];
  results: SearchResultRow[];
  ai_answer: AIAnswer | null;
  top_scorers?: TopScorerRow[] | null;
  source?: string;
  resolved_league?: { id: string; name: string } | null;
  league_disambiguation?: { id: string; name: string }[];
  structured_answer?: StructuredAnswer | null;
  post_slug?: string | null;
}


export function useIntelligentSearch() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: string | { query: string; liga_id?: string }): Promise<SearchResponse> => {
      const payload = typeof args === "string" ? { query: args } : args;
      const { data, error } = await supabase.functions.invoke("intelligent-search", {
        body: { ...payload, user_id: user?.id ?? null },
      });
      if (error) throw error;
      return data as SearchResponse;
    },
  });
}

export function useSearchTrends(period: "daily" | "weekly" | "monthly" | "total" = "daily", limit = 10) {
  return useQuery({
    queryKey: ["search-trends", period, limit],
    queryFn: async () => {
      const col = period === "total" ? "total_searches" : `${period}_searches`;
      const { data, error } = await supabase
        .from("search_trends")
        .select("*")
        .order(col, { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function usePopularEntities(entityType: "team" | "league" | "player", limit = 10) {
  return useQuery({
    queryKey: ["popular-entities", entityType, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popular_entities")
        .select("*")
        .eq("entity_type", entityType)
        .eq("period", "all")
        .order("search_count", { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useRecentGlobalSearches(limit = 10) {
  return useQuery({
    queryKey: ["recent-searches", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_trends")
        .select("term, entity_type, last_searched_at, total_searches")
        .eq("entity_type", "term")
        .order("last_searched_at", { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useUserSearchHistory(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["user-search-history", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_search_history")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;
      return data ?? [];
    },
  });
}
