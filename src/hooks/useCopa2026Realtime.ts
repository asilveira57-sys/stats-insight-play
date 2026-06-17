import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to Copa 2026 live updates: match score/status changes and AI prediction
 * inserts/updates. Invalidates every `["wc2026", ...]` query so any page using those
 * caches refreshes automatically (Home, Palpites IA, jogo detalhe, etc.).
 */
export function useCopa2026Realtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: ["wc2026"] });
    const ch = supabase
      .channel("wc2026-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "world_cup_2026_matches" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "world_cup_2026_ai_analyses" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}
