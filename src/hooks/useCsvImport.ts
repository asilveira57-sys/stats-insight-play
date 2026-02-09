import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCsvImports() {
  return useQuery({
    queryKey: ["csv-imports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("csv_imports" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCsvMappingTemplates() {
  return useQuery({
    queryKey: ["csv-mapping-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("csv_mapping_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useLeaguesForImport() {
  return useQuery({
    queryKey: ["leagues-for-import"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ligas")
        .select("id, nome, slug, pais")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}
