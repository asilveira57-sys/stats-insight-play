import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCartolaStatus() {
  return useQuery({
    queryKey: ["cartola-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("cartola-sync", {
        body: { action: "status" },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useCartolaImportHistory() {
  return useMutation({
    mutationFn: async (seasons: number[]) => {
      const { data, error } = await supabase.functions.invoke("cartola-import", {
        body: { action: "import_history", seasons },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useCartolaSyncSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (season?: number) => {
      const { data, error } = await supabase.functions.invoke("cartola-sync", {
        body: { action: "sync_season", season: season || new Date().getFullYear() },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cartola-status"] });
    },
  });
}

export function useCartolaSyncRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ season, rodada }: { season: number; rodada: number }) => {
      const { data, error } = await supabase.functions.invoke("cartola-sync", {
        body: { action: "sync_round", season, rodada },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cartola-status"] });
    },
  });
}

export function useCartolaMapClube() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cartolaId, aleballTeamId, nome }: { cartolaId: number; aleballTeamId: string; nome: string }) => {
      const { error } = await supabase.from("external_id_map").upsert({
        entity_type: "team",
        external_id: `cartola:${cartolaId}`,
        internal_id: aleballTeamId,
        confidence: "high",
        metadata: { source: "cartola", cartola_clube_id: cartolaId, nome, manual: true },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cartola-status"] });
    },
  });
}
