import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateMatchProbabilities,
  calculateExpectedGoals,
  calculateMostLikelyScore,
  calculateConfidence,
  calculateTeamStrength,
} from "@/lib/poisson";

interface TeamStatsRow {
  team_id: string;
  total_matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  home_wins: number;
  home_matches: number;
  away_wins: number;
  away_matches: number;
}

interface TeamInfo {
  id: string;
  nome: string;
  cores: { primary?: string; secondary?: string } | null;
}

export interface Prediction {
  id: string;
  matchId: string;
  palpiteId?: string;
  homeTeam: {
    name: string;
    logo: string | null;
    probability: number;
    strength: number;
    primaryColor: string;
    secondaryColor: string;
  };
  awayTeam: {
    name: string;
    logo: string | null;
    probability: number;
    strength: number;
    primaryColor: string;
    secondaryColor: string;
  };
  drawProbability: number;
  predictedScore: { home: number; away: number };
  confidence: "high" | "medium" | "low";
  league: string;
  leagueCode: string;
  date: string;
  time: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "--:--";
  const [hours, minutes] = timeStr.split(":").map(Number);
  let brasiliaHours = hours - 3;
  if (brasiliaHours < 0) brasiliaHours += 24;
  return `${brasiliaHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function buildPrediction(
  match: any,
  homeInfo: TeamInfo | undefined,
  awayInfo: TeamInfo | undefined,
  homeStats: TeamStatsRow | undefined,
  awayStats: TeamStatsRow | undefined,
  palpiteId: string | undefined
): Prediction | null {
  if (!homeInfo || !awayInfo || !homeStats || !awayStats) return null;
  if (homeStats.total_matches < 1 || awayStats.total_matches < 1) return null;

  const homeAvgScored = homeStats.goals_scored / Math.max(1, homeStats.total_matches);
  const homeAvgConceded = homeStats.goals_conceded / Math.max(1, homeStats.total_matches);
  const awayAvgScored = awayStats.goals_scored / Math.max(1, awayStats.total_matches);
  const awayAvgConceded = awayStats.goals_conceded / Math.max(1, awayStats.total_matches);
  const leagueAvg = 1.3;

  const homeExpected = calculateExpectedGoals(homeAvgScored, homeAvgConceded, awayAvgScored, awayAvgConceded, leagueAvg, true);
  const awayExpected = calculateExpectedGoals(awayAvgScored, awayAvgConceded, homeAvgScored, homeAvgConceded, leagueAvg, false);

  const probs = calculateMatchProbabilities(homeExpected, awayExpected);
  const likely = calculateMostLikelyScore(homeExpected, awayExpected);
  const confidence = calculateConfidence(probs.homeWin, probs.draw, probs.awayWin);

  const homeStrength = calculateTeamStrength(homeStats.wins, homeStats.draws, homeStats.losses, homeStats.goals_scored, homeStats.goals_conceded);
  const awayStrength = calculateTeamStrength(awayStats.wins, awayStats.draws, awayStats.losses, awayStats.goals_scored, awayStats.goals_conceded);

  return {
    id: match.id,
    matchId: match.id,
    palpiteId,
    homeTeam: {
      name: homeInfo.nome,
      logo: null,
      probability: probs.homeWin,
      strength: homeStrength,
      primaryColor: homeInfo.cores?.primary || "#6B7280",
      secondaryColor: homeInfo.cores?.secondary || "#FFFFFF",
    },
    awayTeam: {
      name: awayInfo.nome,
      logo: null,
      probability: probs.awayWin,
      strength: awayStrength,
      primaryColor: awayInfo.cores?.primary || "#6B7280",
      secondaryColor: awayInfo.cores?.secondary || "#FFFFFF",
    },
    drawProbability: probs.draw,
    predictedScore: { home: likely.homeGoals, away: likely.awayGoals },
    confidence,
    league: match.ligas?.nome || "Liga",
    leagueCode: match.ligas?.codigo_api || "",
    date: formatDate(match.data),
    time: formatTime(match.hora),
  };
}

export function usePredictions(options?: {
  leagueId?: string;
  confidence?: string;
  days?: number;
  maxMatches?: number;
  search?: string;
}) {
  const { leagueId, confidence, days = 7, maxMatches, search } = options || {};
  const effectiveMax = maxMatches ?? (leagueId ? 300 : 80);

  return useQuery({
    queryKey: ["predictions", leagueId, confidence, days, effectiveMax, search ?? null],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Prediction[]> => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + days);
      const fromStr = today.toISOString().split("T")[0];
      const toStr = futureDate.toISOString().split("T")[0];

      let mq = supabase
        .from("partidas")
        .select("id, data, hora, time_casa_id, time_fora_id, liga_id, ligas:liga_id(nome, codigo_api, logo_url)")
        .eq("status", "scheduled")
        .gte("data", fromStr)
        .lte("data", toStr)
        .not("time_casa_id", "is", null)
        .not("time_fora_id", "is", null)
        .order("data", { ascending: true })
        .order("hora", { ascending: true })
        .limit(effectiveMax);

      if (leagueId) mq = mq.eq("liga_id", leagueId);

      const { data: matches, error: mErr } = await mq;
      if (mErr) throw mErr;
      if (!matches || matches.length === 0) return [];

      // Collect distinct team IDs and match IDs
      const teamIds = new Set<string>();
      const matchIds: string[] = [];
      matches.forEach((m: any) => {
        if (m.time_casa_id) teamIds.add(m.time_casa_id);
        if (m.time_fora_id) teamIds.add(m.time_fora_id);
        matchIds.push(m.id);
      });
      const teamIdArr = Array.from(teamIds);

      // Parallel: teams info, bulk stats, existing palpites
      const [teamsRes, statsRes, palpitesRes] = await Promise.all([
        supabase.from("times").select("id, nome, cores").in("id", teamIdArr),
        supabase.rpc("get_team_stats_bulk", { p_team_ids: teamIdArr }),
        supabase.from("palpites").select("id, partida_id").in("partida_id", matchIds),
      ]);

      if (teamsRes.error) throw teamsRes.error;
      if (statsRes.error) throw statsRes.error;
      if (palpitesRes.error) throw palpitesRes.error;

      const teamInfoMap = new Map<string, TeamInfo>();
      (teamsRes.data || []).forEach((t: any) => teamInfoMap.set(t.id, t as TeamInfo));

      const statsMap = new Map<string, TeamStatsRow>();
      (statsRes.data || []).forEach((s: any) => statsMap.set(s.team_id, s as TeamStatsRow));

      const palpiteMap = new Map<string, string>();
      (palpitesRes.data || []).forEach((p: any) => palpiteMap.set(p.partida_id, p.id));

      let predictions = matches
        .map((m: any) =>
          buildPrediction(
            m,
            teamInfoMap.get(m.time_casa_id),
            teamInfoMap.get(m.time_fora_id),
            statsMap.get(m.time_casa_id),
            statsMap.get(m.time_fora_id),
            palpiteMap.get(m.id)
          )
        )
        .filter((p): p is Prediction => p !== null);

      if (confidence && confidence !== "all") {
        predictions = predictions.filter((p) => p.confidence === confidence);
      }

      if (search && search.trim()) {
        const s = search.trim().toLowerCase();
        predictions = predictions.filter(
          (p) =>
            p.homeTeam.name.toLowerCase().includes(s) ||
            p.awayTeam.name.toLowerCase().includes(s) ||
            p.league.toLowerCase().includes(s)
        );
      }

      return predictions;
    },
    staleTime: 5 * 60 * 1000,
  });
}

const LEAGUE_PRIORITY: Record<string, number> = {
  BSA: 1,
  BSB: 2,
  CLI: 3,
  CSA: 4,
  CL: 5,
  PL: 6,
  PD: 7,
  SA: 8,
  BL1: 9,
  FL1: 10,
};

export function useLeaguesForPredictions() {
  return useQuery({
    queryKey: ["leagues-predictions"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const future = futureDate.toISOString().split("T")[0];

      // Distinct league IDs from scheduled matches in next 7 days (capped — index makes this cheap)
      const { data: matchLeagues, error } = await supabase
        .from("partidas")
        .select("liga_id")
        .eq("status", "scheduled")
        .gte("data", today)
        .lte("data", future)
        .not("liga_id", "is", null)
        .limit(5000);
      if (error) throw error;

      const leagueIds = Array.from(new Set((matchLeagues || []).map((m: any) => m.liga_id).filter(Boolean)));
      if (leagueIds.length === 0) return [];

      const { data, error: lErr } = await supabase
        .from("ligas")
        .select("id, nome, logo_url, codigo_api, pais, slug")
        .in("id", leagueIds)
        .eq("ativa", true);
      if (lErr) throw lErr;

      const seen = new Set<string>();
      const unique = (data || []).filter((l: any) => {
        const key = l.slug || l.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return unique.sort((a: any, b: any) => {
        const pa = LEAGUE_PRIORITY[a.codigo_api || ""] ?? 50;
        const pb = LEAGUE_PRIORITY[b.codigo_api || ""] ?? 50;
        return pa - pb;
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeagueMatchCounts() {
  return useQuery({
    queryKey: ["league-match-counts"],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 7);

      const { data, error } = await supabase
        .from("partidas")
        .select("ligas:liga_id(codigo_api)")
        .eq("status", "scheduled")
        .gte("data", today.toISOString().split("T")[0])
        .lte("data", futureDate.toISOString().split("T")[0])
        .limit(5000);
      if (error) throw error;

      const counts = new Map<string, number>();
      (data || []).forEach((m: any) => {
        const code = m.ligas?.codigo_api;
        if (code) counts.set(code, (counts.get(code) || 0) + 1);
      });
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });
}
