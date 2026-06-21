import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BracketProjectionRow = {
  id: string;
  projection_version: string;
  phase: string;
  slot_code: string;
  group_letter: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  home_pens: number | null;
  away_pens: number | null;
  went_to_penalties: boolean;
  winner_team_id: string | null;
  confidence: string;
  prob_home: number | null;
  prob_draw: number | null;
  prob_away: number | null;
  basis: any;
  is_official_version: boolean;
  frozen_at: string | null;
  generated_at: string;
  home_team?: { id: string; name: string; slug: string; flag_url: string | null } | null;
  away_team?: { id: string; name: string; slug: string; flag_url: string | null } | null;
  winner_team?: { id: string; name: string; slug: string; flag_url: string | null } | null;
};

export function useBracketProjection(version: string = "live") {
  const [rows, setRows] = useState<BracketProjectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wc2026_bracket_projections")
      .select(`
        id, projection_version, phase, slot_code, group_letter,
        home_team_id, away_team_id, home_score, away_score, home_pens, away_pens,
        went_to_penalties, winner_team_id, confidence, prob_home, prob_draw, prob_away,
        basis, is_official_version, frozen_at, generated_at,
        home_team:home_team_id(id, name, slug, flag_url),
        away_team:away_team_id(id, name, slug, flag_url),
        winner_team:winner_team_id(id, name, slug, flag_url)
      `)
      .eq("projection_version", version)
      .order("phase")
      .order("slot_code");
    const list = (data ?? []) as any[];
    setRows(list);
    setGeneratedAt(list[0]?.generated_at ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [version]);

  const regenerate = async () => {
    await supabase.functions.invoke("wc2026-project-bracket", { body: {} });
    await load();
  };

  return { rows, loading, generatedAt, reload: load, regenerate };
}
