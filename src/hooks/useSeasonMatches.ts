import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeasonMatch {
  id: string;
  data: string;
  hora: string | null;
  rodada: number | null;
  golsCasa: number | null;
  golsFora: number | null;
  timeCasa: string;
  timeFora: string;
  timeCasaSlug: string | null;
  timeForaSlug: string | null;
  status: string;
}

export interface RoundGroup {
  rodada: number;
  label: string;
  matches: SeasonMatch[];
  dateRange?: string;
}

export interface SeasonMatchesData {
  matches: SeasonMatch[];
  roundGroups: RoundGroup[];
  isKnockout: boolean;
  totalMatches: number;
  totalGoals: number;
}

const PHASE_LABELS: Record<number, string> = {
  1: "Primeira Fase",
  2: "Segunda Fase",
  3: "Terceira Fase",
  4: "Oitavas de Final",
  5: "Quartas de Final",
  6: "Semifinal",
  7: "Final - Ida",
  8: "Final - Volta",
};

function getRoundLabel(rodada: number, isKnockout: boolean): string {
  if (isKnockout && PHASE_LABELS[rodada]) {
    return PHASE_LABELS[rodada];
  }
  return `Rodada ${rodada}`;
}

function getDateRange(matches: SeasonMatch[]): string {
  if (matches.length === 0) return "";
  const dates = matches.map((m) => new Date(m.data)).sort((a, b) => a.getTime() - b.getTime());
  const first = dates[0];
  const last = dates[dates.length - 1];
  
  const formatDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  
  if (first.getTime() === last.getTime()) {
    return formatDate(first);
  }
  return `${formatDate(first)} - ${formatDate(last)}`;
}

export function useSeasonMatches(
  leagueId: string | null,
  year: number | null,
  tipoPrincipal: string | null
) {
  return useQuery({
    queryKey: ["season-matches", leagueId, year],
    queryFn: async (): Promise<SeasonMatchesData> => {
      if (!leagueId || !year) {
        return { matches: [], roundGroups: [], isKnockout: false, totalMatches: 0, totalGoals: 0 };
      }

      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data: matchesData, error } = await supabase
        .from("partidas")
        .select(`
          id,
          data,
          hora,
          rodada,
          gols_casa,
          gols_fora,
          status,
          time_casa:times!partidas_time_casa_id_fkey(id, nome, slug),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, slug)
        `)
        .eq("liga_id", leagueId)
        .gte("data", startDate)
        .lte("data", endDate)
        .order("rodada", { ascending: true, nullsFirst: false })
        .order("data", { ascending: true });

      if (error) throw error;

      const matches: SeasonMatch[] = (matchesData || []).map((m: any) => ({
        id: m.id,
        data: m.data,
        hora: m.hora,
        rodada: m.rodada,
        golsCasa: m.gols_casa,
        golsFora: m.gols_fora,
        timeCasa: m.time_casa?.nome || "Time Casa",
        timeFora: m.time_fora?.nome || "Time Fora",
        timeCasaSlug: m.time_casa?.slug || null,
        timeForaSlug: m.time_fora?.slug || null,
        status: m.status || "scheduled",
      }));

      // Determine if knockout
      const isKnockout = tipoPrincipal === "copa" || tipoPrincipal === "eliminatoria";
      const maxRodada = Math.max(...matches.filter((m) => m.rodada).map((m) => m.rodada!), 0);
      const effectiveIsKnockout = isKnockout || maxRodada <= 10;

      // Group by round
      const roundMap = new Map<number, SeasonMatch[]>();
      const noRoundMatches: SeasonMatch[] = [];

      matches.forEach((match) => {
        if (match.rodada) {
          const existing = roundMap.get(match.rodada) || [];
          existing.push(match);
          roundMap.set(match.rodada, existing);
        } else {
          noRoundMatches.push(match);
        }
      });

      const roundGroups: RoundGroup[] = Array.from(roundMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([rodada, roundMatches]) => ({
          rodada,
          label: getRoundLabel(rodada, effectiveIsKnockout),
          matches: roundMatches.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
          dateRange: getDateRange(roundMatches),
        }));

      // Add unassigned matches as "Outros Jogos" if any
      if (noRoundMatches.length > 0) {
        roundGroups.push({
          rodada: 0,
          label: "Outros Jogos",
          matches: noRoundMatches.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
          dateRange: getDateRange(noRoundMatches),
        });
      }

      const totalGoals = matches.reduce(
        (sum, m) => sum + (m.golsCasa || 0) + (m.golsFora || 0),
        0
      );

      return {
        matches,
        roundGroups,
        isKnockout: effectiveIsKnockout,
        totalMatches: matches.length,
        totalGoals,
      };
    },
    enabled: !!leagueId && !!year,
  });
}
