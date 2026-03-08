import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamWithoutMatches {
  id: string;
  nome: string;
  slug: string;
  created_at: string;
  has_aliases: boolean;
  has_external_ids: boolean;
}

export interface DuplicateAlias {
  alias: string;
  normalized_alias: string;
  team_count: number;
  team_names: string[];
}

export interface SimilarTeams {
  team_a_id: string;
  team_a_name: string;
  team_a_slug: string;
  team_b_id: string;
  team_b_name: string;
  team_b_slug: string;
  similarity_score: number;
  reason: string;
}

// Fetch teams that have no matches using server-side RPC (fixes 1000-row limit bug)
export function useTeamsWithoutMatches() {
  return useQuery({
    queryKey: ["data-quality", "teams-without-matches"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_teams_without_matches");
      if (error) throw error;
      return (data || []) as TeamWithoutMatches[];
    },
  });
}

// Fetch aliases that are associated with more than one team
export function useDuplicateAliases() {
  return useQuery({
    queryKey: ["data-quality", "duplicate-aliases"],
    queryFn: async () => {
      const { data: aliases, error } = await supabase
        .from("team_aliases")
        .select(`
          alias,
          normalized_alias,
          team_id,
          times:team_id (nome)
        `);

      if (error) throw error;

      // Group by normalized_alias
      const aliasMap = new Map<
        string,
        { alias: string; teamIds: Set<string>; teamNames: string[] }
      >();

      (aliases || []).forEach((a) => {
        const key = a.normalized_alias;
        if (!aliasMap.has(key)) {
          aliasMap.set(key, {
            alias: a.alias,
            teamIds: new Set(),
            teamNames: [],
          });
        }
        const entry = aliasMap.get(key)!;
        if (a.team_id && !entry.teamIds.has(a.team_id)) {
          entry.teamIds.add(a.team_id);
          const teamName = (a.times as any)?.nome;
          if (teamName) {
            entry.teamNames.push(teamName);
          }
        }
      });

      // Filter only duplicates (more than one team)
      const duplicates: DuplicateAlias[] = [];
      aliasMap.forEach((value, key) => {
        if (value.teamIds.size > 1) {
          duplicates.push({
            alias: value.alias,
            normalized_alias: key,
            team_count: value.teamIds.size,
            team_names: value.teamNames,
          });
        }
      });

      return duplicates.sort((a, b) => b.team_count - a.team_count);
    },
  });
}

// Fetch similar teams using server-side RPC (replaces O(n²) client-side calculation)
export function useSimilarTeams() {
  return useQuery({
    queryKey: ["data-quality", "similar-teams"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_suggested_duplicates", {
        p_limit: 200,
      });
      if (error) throw error;

      return ((data || []) as any[]).map((row) => ({
        team_a_id: row.team_a_id,
        team_a_name: row.team_a_name,
        team_a_slug: row.team_a_slug,
        team_b_id: row.team_b_id,
        team_b_name: row.team_b_name,
        team_b_slug: row.team_b_slug,
        similarity_score: Number(row.similarity_score),
        reason: row.reason,
      })) as SimilarTeams[];
    },
  });
}
