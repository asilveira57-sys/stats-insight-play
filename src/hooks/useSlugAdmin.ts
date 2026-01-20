import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type EntityType = "team" | "match";
export type SlugStatus = "no_slug" | "conflict" | "locked" | "editable";

export interface TeamWithSlugInfo {
  id: string;
  nome: string;
  slug: string | null;
  slug_locked: boolean;
  name_normalized: string | null;
  api_id: number | null;
  escudo_url: string | null;
  pais: string | null;
  updated_at: string;
  status: SlugStatus;
  conflict_count?: number;
  external_ids: Array<{
    source_id: string;
    external_id: string;
    source_name?: string;
  }>;
}

export interface MatchWithSlugInfo {
  id: string;
  slug: string | null;
  slug_locked: boolean;
  data: string;
  hora: string | null;
  time_casa: { id: string; nome: string; slug: string | null } | null;
  time_fora: { id: string; nome: string; slug: string | null } | null;
  liga: { id: string; nome: string } | null;
  api_id: number | null;
  status: SlugStatus;
  updated_at: string;
  external_ids: Array<{
    source_id: string;
    external_id: string;
    source_name?: string;
  }>;
}

export interface SlugAuditLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface SlugFilters {
  entityType: EntityType;
  status: SlugStatus | "all";
  search: string;
}

// Normalizar slug para validação
export function normalizeSlug(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Validar formato do slug
export function validateSlugFormat(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.trim() === "") {
    return { valid: false, error: "Slug não pode ser vazio" };
  }
  
  const normalized = normalizeSlug(slug);
  if (normalized !== slug) {
    return { valid: false, error: "Slug contém caracteres inválidos" };
  }
  
  if (slug.length < 2) {
    return { valid: false, error: "Slug deve ter pelo menos 2 caracteres" };
  }
  
  if (slug.length > 100) {
    return { valid: false, error: "Slug deve ter no máximo 100 caracteres" };
  }
  
  return { valid: true };
}

// Hook para buscar times com info de slug
export function useTeamsWithSlugInfo(filters: SlugFilters) {
  return useQuery({
    queryKey: ["teams-slug-admin", filters],
    queryFn: async () => {
      // Buscar times
      let query = supabase
        .from("times")
        .select("id, nome, slug, slug_locked, name_normalized, api_id, escudo_url, pais, updated_at")
        .order("nome");

      // Filtro de busca
      if (filters.search) {
        query = query.or(
          `nome.ilike.%${filters.search}%,slug.ilike.%${filters.search}%,api_id.eq.${parseInt(filters.search) || 0}`
        );
      }

      const { data: teams, error } = await query;
      if (error) throw error;

      // Buscar contagem de slugs duplicados
      const { data: slugCounts } = await supabase
        .from("times")
        .select("slug")
        .not("slug", "is", null);

      const slugCountMap: Record<string, number> = {};
      slugCounts?.forEach((t) => {
        if (t.slug) {
          slugCountMap[t.slug] = (slugCountMap[t.slug] || 0) + 1;
        }
      });

      // Buscar external_id_map para times
      const teamIds = teams?.map((t) => t.id) || [];
      const { data: externalMaps } = await supabase
        .from("external_id_map")
        .select("internal_id, external_id, source_id")
        .eq("entity_type", "team")
        .in("internal_id", teamIds);

      // Buscar nomes das fontes
      const sourceIds = [...new Set(externalMaps?.map((e) => e.source_id).filter(Boolean))] as string[];
      const { data: sources } = await supabase
        .from("data_sources")
        .select("id, name")
        .in("id", sourceIds);

      const sourceNameMap: Record<string, string> = {};
      sources?.forEach((s) => {
        sourceNameMap[s.id] = s.name;
      });

      // Mapear times com status e external_ids
      const teamsWithInfo: TeamWithSlugInfo[] = (teams || []).map((team) => {
        const externalIds = (externalMaps || [])
          .filter((e) => e.internal_id === team.id)
          .map((e) => ({
            source_id: e.source_id || "",
            external_id: e.external_id,
            source_name: e.source_id ? sourceNameMap[e.source_id] : undefined,
          }));

        let status: SlugStatus = "editable";
        const conflictCount = team.slug ? slugCountMap[team.slug] || 0 : 0;

        if (!team.slug) {
          status = "no_slug";
        } else if (team.slug_locked) {
          status = "locked";
        } else if (conflictCount > 1) {
          status = "conflict";
        }

        return {
          ...team,
          status,
          conflict_count: conflictCount > 1 ? conflictCount : undefined,
          external_ids: externalIds,
        };
      });

      // Filtrar por status
      if (filters.status !== "all") {
        return teamsWithInfo.filter((t) => t.status === filters.status);
      }

      return teamsWithInfo;
    },
    enabled: filters.entityType === "team",
  });
}

// Hook para buscar partidas com info de slug
export function useMatchesWithSlugInfo(filters: SlugFilters) {
  return useQuery({
    queryKey: ["matches-slug-admin", filters],
    queryFn: async () => {
      let query = supabase
        .from("partidas")
        .select(`
          id, slug, slug_locked, data, hora, api_id, updated_at,
          time_casa:times!partidas_time_casa_id_fkey(id, nome, slug),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, slug),
          liga:ligas!partidas_liga_id_fkey(id, nome)
        `)
        .order("data", { ascending: false })
        .limit(500);

      if (filters.search) {
        query = query.or(`slug.ilike.%${filters.search}%,api_id.eq.${parseInt(filters.search) || 0}`);
      }

      const { data: matches, error } = await query;
      if (error) throw error;

      // Buscar contagem de slugs duplicados
      const { data: slugCounts } = await supabase
        .from("partidas")
        .select("slug")
        .not("slug", "is", null);

      const slugCountMap: Record<string, number> = {};
      slugCounts?.forEach((m) => {
        if (m.slug) {
          slugCountMap[m.slug] = (slugCountMap[m.slug] || 0) + 1;
        }
      });

      // Buscar external_id_map para partidas
      const matchIds = matches?.map((m) => m.id) || [];
      const { data: externalMaps } = await supabase
        .from("external_id_map")
        .select("internal_id, external_id, source_id")
        .eq("entity_type", "match")
        .in("internal_id", matchIds);

      const { data: sources } = await supabase
        .from("data_sources")
        .select("id, name");

      const sourceNameMap: Record<string, string> = {};
      sources?.forEach((s) => {
        sourceNameMap[s.id] = s.name;
      });

      const matchesWithInfo: MatchWithSlugInfo[] = (matches || []).map((match) => {
        const externalIds = (externalMaps || [])
          .filter((e) => e.internal_id === match.id)
          .map((e) => ({
            source_id: e.source_id || "",
            external_id: e.external_id,
            source_name: e.source_id ? sourceNameMap[e.source_id] : undefined,
          }));

        let status: SlugStatus = "editable";
        const conflictCount = match.slug ? slugCountMap[match.slug] || 0 : 0;

        if (!match.slug) {
          status = "no_slug";
        } else if (match.slug_locked) {
          status = "locked";
        } else if (conflictCount > 1) {
          status = "conflict";
        }

        return {
          ...match,
          time_casa: match.time_casa as TeamWithSlugInfo["external_ids"][0] extends infer T ? { id: string; nome: string; slug: string | null } : never,
          time_fora: match.time_fora as TeamWithSlugInfo["external_ids"][0] extends infer T ? { id: string; nome: string; slug: string | null } : never,
          liga: match.liga as { id: string; nome: string } | null,
          status,
          external_ids: externalIds,
        };
      });

      if (filters.status !== "all") {
        return matchesWithInfo.filter((m) => m.status === filters.status);
      }

      return matchesWithInfo;
    },
    enabled: filters.entityType === "match",
  });
}

// Hook para buscar histórico de auditoria
export function useSlugAuditLogs(entityType: EntityType, entityId: string | null) {
  return useQuery({
    queryKey: ["slug-audit-logs", entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from("slug_audit_logs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return data as SlugAuditLog[];
    },
    enabled: !!entityId,
  });
}

// Hook para verificar unicidade de slug
export function useCheckSlugUnique(entityType: EntityType, slug: string, excludeId: string | null) {
  return useQuery({
    queryKey: ["check-slug-unique", entityType, slug, excludeId],
    queryFn: async () => {
      if (!slug) return { unique: true };
      
      const table = entityType === "team" ? "times" : "partidas";
      let query = supabase.from(table).select("id").eq("slug", slug);
      
      if (excludeId) {
        query = query.neq("id", excludeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return { unique: (data?.length || 0) === 0 };
    },
    enabled: !!slug && slug.length > 0,
  });
}

// Hook para atualizar slug de time
export function useUpdateTeamSlug() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      teamId,
      newSlug,
      reason,
      lock,
    }: {
      teamId: string;
      newSlug: string;
      reason: string;
      lock: boolean;
    }) => {
      // Buscar slug atual
      const { data: currentTeam, error: fetchError } = await supabase
        .from("times")
        .select("slug, slug_locked")
        .eq("id", teamId)
        .single();

      if (fetchError) throw fetchError;

      if (currentTeam.slug_locked) {
        throw new Error("Slug está travado e não pode ser alterado");
      }

      // Verificar unicidade
      const { data: existing } = await supabase
        .from("times")
        .select("id")
        .eq("slug", newSlug)
        .neq("id", teamId);

      if (existing && existing.length > 0) {
        throw new Error("Slug já existe para outro time");
      }

      // Atualizar time
      const { error: updateError } = await supabase
        .from("times")
        .update({
          slug: newSlug,
          slug_locked: lock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId);

      if (updateError) throw updateError;

      // Registrar auditoria
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: auditError } = await supabase
        .from("slug_audit_logs")
        .insert({
          entity_type: "team",
          entity_id: teamId,
          field: "slug",
          old_value: currentTeam.slug,
          new_value: newSlug,
          reason,
          changed_by: user?.id,
        });

      if (auditError) {
        console.error("Erro ao registrar auditoria:", auditError);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams-slug-admin"] });
      queryClient.invalidateQueries({ queryKey: ["slug-audit-logs"] });
      toast({
        title: "Slug atualizado",
        description: "O slug foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para travar/destravar slug
export function useToggleSlugLock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      lock,
      reason,
    }: {
      entityType: EntityType;
      entityId: string;
      lock: boolean;
      reason?: string;
    }) => {
      const table = entityType === "team" ? "times" : "partidas";

      // Buscar estado atual
      const { data: current, error: fetchError } = await supabase
        .from(table)
        .select("slug_locked")
        .eq("id", entityId)
        .single();

      if (fetchError) throw fetchError;

      // Atualizar lock
      const { error: updateError } = await supabase
        .from(table)
        .update({
          slug_locked: lock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entityId);

      if (updateError) throw updateError;

      // Registrar auditoria
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("slug_audit_logs").insert({
        entity_type: entityType,
        entity_id: entityId,
        field: "slug_locked",
        old_value: String(current.slug_locked),
        new_value: String(lock),
        reason: reason || (lock ? "Slug travado manualmente" : "Slug destravado manualmente"),
        changed_by: user?.id,
      });

      return { success: true };
    },
    onSuccess: (_, variables) => {
      const queryKey = variables.entityType === "team" ? "teams-slug-admin" : "matches-slug-admin";
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      queryClient.invalidateQueries({ queryKey: ["slug-audit-logs"] });
      toast({
        title: variables.lock ? "Slug travado" : "Slug destravado",
        description: variables.lock
          ? "O slug foi travado e não pode mais ser alterado."
          : "O slug foi destravado e pode ser editado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para estatísticas de slugs
export function useSlugStats() {
  return useQuery({
    queryKey: ["slug-stats"],
    queryFn: async () => {
      // Times stats
      const { data: teamsTotal } = await supabase.from("times").select("id", { count: "exact", head: true });
      const { data: teamsNoSlug } = await supabase.from("times").select("id", { count: "exact", head: true }).is("slug", null);
      const { data: teamsLocked } = await supabase.from("times").select("id", { count: "exact", head: true }).eq("slug_locked", true);
      
      // Conflitos de times
      const { data: teamSlugs } = await supabase.from("times").select("slug").not("slug", "is", null);
      const teamSlugCounts: Record<string, number> = {};
      teamSlugs?.forEach((t) => {
        if (t.slug) teamSlugCounts[t.slug] = (teamSlugCounts[t.slug] || 0) + 1;
      });
      const teamsWithConflicts = Object.values(teamSlugCounts).filter((c) => c > 1).reduce((a, b) => a + b, 0);

      // Partidas stats
      const { data: matchesTotal } = await supabase.from("partidas").select("id", { count: "exact", head: true });
      const { data: matchesNoSlug } = await supabase.from("partidas").select("id", { count: "exact", head: true }).is("slug", null);
      const { data: matchesLocked } = await supabase.from("partidas").select("id", { count: "exact", head: true }).eq("slug_locked", true);

      return {
        teams: {
          total: (teamsTotal as any)?.length ?? 0,
          noSlug: (teamsNoSlug as any)?.length ?? 0,
          locked: (teamsLocked as any)?.length ?? 0,
          conflicts: teamsWithConflicts,
        },
        matches: {
          total: (matchesTotal as any)?.length ?? 0,
          noSlug: (matchesNoSlug as any)?.length ?? 0,
          locked: (matchesLocked as any)?.length ?? 0,
          conflicts: 0,
        },
      };
    },
  });
}
