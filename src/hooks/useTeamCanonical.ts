import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types
export interface CanonicalTeam {
  id: string;
  nome: string;
  slug: string;
  pais: string | null;
  status: string;
  escudo_url: string | null;
  updated_at: string;
  alias_count: number;
  match_count: number;
}

export interface TeamAlias {
  id: string;
  team_id: string;
  alias: string;
  normalized_alias: string;
  source: string | null;
  source_id: string | null;
  external_id: string | null;
  confidence: number;
  created_at: string;
}

export interface SuggestedDuplicate {
  team_a_id: string;
  team_a_name: string;
  team_a_slug: string;
  team_b_id: string;
  team_b_name: string;
  team_b_slug: string;
  similarity_score: number;
  reason: string;
}

export interface MergeSummary {
  matches_updated: number;
  matches_home: number;
  matches_away: number;
  aliases_migrated: number;
  external_ids_migrated: number;
  source_name: string;
  source_slug: string;
  target_name: string;
  target_slug: string;
}

export interface MergeLog {
  id: string;
  team_target_id: string;
  team_source_id: string;
  source_canonical_name: string;
  source_canonical_slug: string;
  merged_by: string | null;
  summary: MergeSummary;
  created_at: string;
}

// Fetch teams with aliases and match counts
export function useTeamsCanonical(
  search: string = "",
  status: string = "active",
  page: number = 0,
  pageSize: number = 25
) {
  return useQuery({
    queryKey: ["teams-canonical", search, status, page, pageSize],
    queryFn: async () => {
      // Use RPC function for efficient query
      const { data, error } = await supabase.rpc("get_teams_with_aliases", {
        p_search: search || null,
        p_status: status,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });

      if (error) throw error;

      // Get total count
      const { data: countData, error: countError } = await supabase.rpc(
        "count_teams_with_aliases",
        {
          p_search: search || null,
          p_status: status,
        }
      );

      if (countError) throw countError;

      return {
        teams: (data || []) as CanonicalTeam[],
        total: countData as number,
      };
    },
  });
}

// Extended team details type (status may not be in generated types yet)
export interface TeamDetails {
  id: string;
  nome: string;
  slug: string;
  pais: string | null;
  escudo_url: string | null;
  status: string;
  updated_at: string;
  cores: unknown;
  api_id: number | null;
}

// Fetch single team with details
export function useTeamDetails(teamId: string | null) {
  return useQuery({
    queryKey: ["team-details", teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase
        .from("times")
        .select("*")
        .eq("id", teamId)
        .single();

      if (error) throw error;
      return data as unknown as TeamDetails;
    },
    enabled: !!teamId,
  });
}

// Fetch aliases for a team
export function useTeamAliases(teamId: string | null) {
  return useQuery({
    queryKey: ["team-aliases", teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from("team_aliases")
        .select("*")
        .eq("team_id", teamId)
        .order("confidence", { ascending: false });

      if (error) throw error;
      return data as TeamAlias[];
    },
    enabled: !!teamId,
  });
}

// Fetch dismissed duplicate pairs
function useDismissedDuplicates() {
  return useQuery({
    queryKey: ["dismissed-duplicates"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("dismissed_duplicates" as any) as any)
        .select("team_a_id, team_b_id");
      if (error) throw error;
      return (data || []) as { team_a_id: string; team_b_id: string }[];
    },
  });
}

// Fetch suggested duplicates (filtering out dismissed)
export function useSuggestedDuplicates() {
  const { data: dismissed } = useDismissedDuplicates();

  return useQuery({
    queryKey: ["suggested-duplicates", dismissed],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_suggested_duplicates", {
        p_limit: 10000,
      });

      if (error) throw error;
      const all = (data || []) as SuggestedDuplicate[];

      if (!dismissed || dismissed.length === 0) return all;

      const dismissedSet = new Set(
        dismissed.map((d) => [d.team_a_id, d.team_b_id].sort().join("|"))
      );

      return all.filter((dup) => {
        const key = [dup.team_a_id, dup.team_b_id].sort().join("|");
        return !dismissedSet.has(key);
      });
    },
    enabled: dismissed !== undefined,
  });
}

// Dismiss a duplicate pair as "different teams"
export function useDismissDuplicate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ teamAId, teamBId }: { teamAId: string; teamBId: string }) => {
      const [a, b] = [teamAId, teamBId].sort();
      const { error } = await supabase
        .from("dismissed_duplicates" as any)
        .upsert({ team_a_id: a, team_b_id: b, dismissed_by: user?.id } as any, {
          onConflict: "team_a_id,team_b_id",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dismissed-duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["suggested-duplicates"] });
    },
  });
}

// Fetch merge logs
export function useMergeLogs() {
  return useQuery({
    queryKey: ["merge-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_merge_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MergeLog[];
    },
  });
}

// Merge teams mutation
export function useMergeTeams() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      targetId,
      sourceId,
    }: {
      targetId: string;
      sourceId: string;
    }) => {
      const { data, error } = await supabase.rpc("merge_teams" as never, {
        p_target_id: targetId,
        p_source_id: sourceId,
        p_merged_by: user?.id || null,
      } as never);

      if (error) throw error;
      return data as unknown as MergeSummary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams-canonical"] });
      queryClient.invalidateQueries({ queryKey: ["suggested-duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["merge-logs"] });
      queryClient.invalidateQueries({ queryKey: ["team-aliases"] });
    },
  });
}

// Add alias mutation
export function useAddAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      alias,
      source,
      externalId,
      confidence,
    }: {
      teamId: string;
      alias: string;
      source?: string;
      externalId?: string;
      confidence?: number;
    }) => {
      // Normalize the alias
      const normalizedAlias = alias
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");

      const { data, error } = await supabase
        .from("team_aliases")
        .insert({
          team_id: teamId,
          alias: alias.trim(),
          normalized_alias: normalizedAlias,
          source: source || "manual",
          external_id: externalId || null,
          confidence: confidence ?? 100,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["team-aliases", variables.teamId],
      });
      queryClient.invalidateQueries({ queryKey: ["teams-canonical"] });
    },
  });
}

// Delete alias mutation
export function useDeleteAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      aliasId,
      teamId,
    }: {
      aliasId: string;
      teamId: string;
    }) => {
      const { error } = await supabase
        .from("team_aliases")
        .delete()
        .eq("id", aliasId);

      if (error) throw error;
      return { aliasId, teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["team-aliases", result.teamId],
      });
      queryClient.invalidateQueries({ queryKey: ["teams-canonical"] });
    },
  });
}

// Update alias mutation
export function useUpdateAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      aliasId,
      teamId,
      updates,
    }: {
      aliasId: string;
      teamId: string;
      updates: Partial<{
        alias: string;
        source: string;
        external_id: string;
        confidence: number;
      }>;
    }) => {
      const updateData: Record<string, unknown> = { ...updates };

      // If alias is being updated, also update normalized_alias
      if (updates.alias) {
        updateData.normalized_alias = updates.alias
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
      }

      const { data, error } = await supabase
        .from("team_aliases")
        .update(updateData)
        .eq("id", aliasId)
        .select()
        .single();

      if (error) throw error;
      return { data, teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["team-aliases", result.teamId],
      });
      queryClient.invalidateQueries({ queryKey: ["teams-canonical"] });
    },
  });
}

// Consolidate aliases (create internal aliases for teams without them)
export function useConsolidateAliases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("consolidate_team_aliases");

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams-canonical"] });
      queryClient.invalidateQueries({ queryKey: ["team-aliases"] });
    },
  });
}

// Get team match counts
export function useTeamMatchCounts(teamId: string | null) {
  return useQuery({
    queryKey: ["team-match-counts", teamId],
    queryFn: async () => {
      if (!teamId) return { home: 0, away: 0, total: 0 };

      const { count: homeCount, error: homeError } = await supabase
        .from("partidas")
        .select("*", { count: "exact", head: true })
        .eq("time_casa_id", teamId);

      if (homeError) throw homeError;

      const { count: awayCount, error: awayError } = await supabase
        .from("partidas")
        .select("*", { count: "exact", head: true })
        .eq("time_fora_id", teamId);

      if (awayError) throw awayError;

      return {
        home: homeCount || 0,
        away: awayCount || 0,
        total: (homeCount || 0) + (awayCount || 0),
      };
    },
    enabled: !!teamId,
  });
}
