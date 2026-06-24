import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MonteCarloRow = {
  team_id: string;
  p_champion: number;
  p_final: number;
  p_semi: number;
  p_qf: number;
  p_r16: number;
  expected_goals_for: number;
  expected_goals_against: number;
  simulations: number;
  generated_at: string;
  team?: { id: string; name: string; slug: string; flag_url: string | null } | null;
};

export function useMonteCarloResults(version: "live" | "v1" | "v2" | "v3" = "live") {
  const [rows, setRows] = useState<MonteCarloRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("wc2026_monte_carlo_results")
        .select("*, team:world_cup_2026_teams(id,name,slug,flag_url)")
        .eq("projection_version", version)
        .order("p_champion", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("MC results error", error);
        setRows([]);
      } else {
        setRows((data ?? []) as MonteCarloRow[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [version]);

  return { rows, loading };
}
