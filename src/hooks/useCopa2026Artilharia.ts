import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ArtilheiroRow = {
  player: string;
  team_id: string;
  team_name: string;
  team_flag: string | null;
  team_slug: string | null;
  goals: number;
  penalties: number;
  team_matches_played: number;
  goals_per_match: number;
};

function parsePlayerName(description: string | null): string | null {
  if (!description) return null;
  // Examples: "Normal Goal — Vinícius  (assist: Bruno)", "Penalty — K. Havertz"
  const m = description.split("—")[1];
  if (!m) return null;
  const beforeAssist = m.split("(assist")[0];
  return beforeAssist.trim().replace(/\s+/g, " ") || null;
}

export function useCopa2026Artilharia() {
  return useQuery({
    queryKey: ["wc2026", "artilharia"],
    queryFn: async (): Promise<ArtilheiroRow[]> => {
      const [{ data: events }, { data: teams }, { data: matches }] = await Promise.all([
        supabase
          .from("world_cup_2026_match_events")
          .select("description, team_id")
          .eq("event_type", "goal"),
        supabase
          .from("world_cup_2026_teams")
          .select("id, name, flag_url, slug"),
        supabase
          .from("world_cup_2026_matches")
          .select("id, home_team_id, away_team_id, status")
          .in("status", ["finished", "live"]),
      ]);

      const teamMap = new Map(
        (teams ?? []).map((t: any) => [t.id, t])
      );

      const matchesByTeam = new Map<string, number>();
      (matches ?? []).forEach((m: any) => {
        matchesByTeam.set(m.home_team_id, (matchesByTeam.get(m.home_team_id) ?? 0) + 1);
        matchesByTeam.set(m.away_team_id, (matchesByTeam.get(m.away_team_id) ?? 0) + 1);
      });

      const agg = new Map<string, { player: string; team_id: string; goals: number; penalties: number }>();

      (events ?? []).forEach((e: any) => {
        const name = parsePlayerName(e.description);
        if (!name || !e.team_id) return;
        const key = `${e.team_id}::${name.toLowerCase()}`;
        const isPen = /penalty/i.test(e.description ?? "");
        const cur = agg.get(key) ?? { player: name, team_id: e.team_id, goals: 0, penalties: 0 };
        cur.goals += 1;
        if (isPen) cur.penalties += 1;
        agg.set(key, cur);
      });

      const rows: ArtilheiroRow[] = Array.from(agg.values()).map((r) => {
        const t: any = teamMap.get(r.team_id);
        const games = matchesByTeam.get(r.team_id) ?? 0;
        return {
          player: r.player,
          team_id: r.team_id,
          team_name: t?.name ?? "—",
          team_flag: t?.flag_url ?? null,
          team_slug: t?.slug ?? null,
          goals: r.goals,
          penalties: r.penalties,
          team_matches_played: games,
          goals_per_match: games > 0 ? r.goals / games : 0,
        };
      });

      rows.sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        // tiebreaker: fewer team matches first (more efficient)
        if (a.team_matches_played !== b.team_matches_played)
          return a.team_matches_played - b.team_matches_played;
        return a.player.localeCompare(b.player);
      });

      return rows;
    },
    staleTime: 60_000,
  });
}
