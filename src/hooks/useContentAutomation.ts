import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AutomationLeagueRow {
  id: string;
  liga_id: string;
  enabled: boolean;
  pre_game_enabled: boolean;
  post_game_enabled: boolean;
  days_ahead: number;
  max_per_run: number;
  notes: string | null;
  updated_at: string;
  liga?: { id: string; nome: string; slug: string | null; pais: string | null } | null;
}

export function useContentAutomationLeagues() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["content-automation-leagues"],
    queryFn: async (): Promise<AutomationLeagueRow[]> => {
      const { data, error } = await supabase
        .from("content_automation_leagues")
        .select("*, liga:ligas!content_automation_leagues_liga_id_fkey(id, nome, slug, pais)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as AutomationLeagueRow[];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["content-automation-leagues"] });

  const addLeague = useMutation({
    mutationFn: async (ligaId: string) => {
      const { error } = await supabase
        .from("content_automation_leagues")
        .insert({ liga_id: ligaId });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Campeonato adicionado", description: "Automação habilitada para pré e pós-jogo." });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao adicionar", description: e?.message, variant: "destructive" }),
  });

  const updateLeague = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AutomationLeagueRow> }) => {
      const { error } = await supabase
        .from("content_automation_leagues")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) =>
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });

  const removeLeague = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_automation_leagues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Campeonato removido", description: "Nenhum conteúdo automático será gerado." });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao remover", description: e?.message, variant: "destructive" }),
  });

  return { list, addLeague, updateLeague, removeLeague };
}

/** Busca ligas por nome para o seletor (mínimo 2 caracteres). */
export function useLigasSearch(term: string) {
  return useQuery({
    queryKey: ["ligas-search", term],
    queryFn: async () => {
      let q = supabase.from("ligas").select("id, nome, slug, pais").order("nome").range(0, 49);
      if (term.trim().length >= 2) q = q.ilike("nome", `%${term.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });
}

export function useRunContentAutomation() {
  const { toast } = useToast();

  const run = useMutation({
    mutationFn: async ({
      kind,
      ligaId,
      limit,
      daysAhead,
    }: { kind: "pre" | "post"; ligaId?: string; limit?: number; daysAhead?: number }) => {
      const fn = kind === "pre" ? "generate-pregame-br-articles" : "generate-retroactive-articles";
      const body =
        kind === "pre"
          ? { limit: limit ?? 3, days_ahead: daysAhead ?? 3 }
          : { limit: limit ?? 2, league_id: ligaId };
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.skipped) {
        toast({
          title: "Nada gerado",
          description: data?.message || "Nenhum campeonato habilitado.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Execução concluída",
        description: `Criados: ${data?.created ?? data?.progress?.processed ?? 0}`,
      });
    },
    onError: (e: any) =>
      toast({ title: "Erro na execução", description: e?.message, variant: "destructive" }),
  });

  return run;
}
