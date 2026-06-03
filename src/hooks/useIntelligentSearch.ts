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

export interface SearchResponse {
  type: "entity" | "stat" | "question";
  query: string;
  normalized: string;
  entities: SearchEntity[];
  results: SearchResultRow[];
  ai_answer: AIAnswer | null;
}

export function useIntelligentSearch() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (query: string): Promise<SearchResponse> => {
      const { data, error } = await supabase.functions.invoke("intelligent-search", {
        body: { query, user_id: user?.id ?? null },
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
