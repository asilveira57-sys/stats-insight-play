import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Classic rivalries - pairs of team names that form famous matches
const CLASSIC_RIVALRIES: Array<{ teams: [string, string]; name: string; importance: number }> = [
  // Brazilian classics
  { teams: ["Flamengo", "Vasco da Gama"], name: "Clássico dos Milhões", importance: 10 },
  { teams: ["Flamengo", "Fluminense"], name: "Fla-Flu", importance: 10 },
  { teams: ["Flamengo", "Botafogo"], name: "Clássico da Rivalidade", importance: 9 },
  { teams: ["Corinthians", "Palmeiras"], name: "Derby Paulista", importance: 10 },
  { teams: ["Corinthians", "São Paulo"], name: "Majestoso", importance: 9 },
  { teams: ["Palmeiras", "São Paulo"], name: "Choque-Rei", importance: 9 },
  { teams: ["Santos", "São Paulo"], name: "San-São", importance: 8 },
  { teams: ["Santos", "Corinthians"], name: "Clássico Alvinegro", importance: 8 },
  { teams: ["Cruzeiro", "Atlético Mineiro"], name: "Clássico Mineiro", importance: 10 },
  { teams: ["Grêmio", "Internacional"], name: "Gre-Nal", importance: 10 },
  { teams: ["Bahia", "Vitória"], name: "Ba-Vi", importance: 8 },
  { teams: ["Sport", "Náutico"], name: "Clássico dos Clássicos", importance: 7 },
  { teams: ["Athletico Paranaense", "Coritiba"], name: "Atletiba", importance: 8 },
  { teams: ["Ceará", "Fortaleza"], name: "Clássico-Rei", importance: 8 },
  
  // European classics
  { teams: ["Real Madrid", "Barcelona"], name: "El Clásico", importance: 10 },
  { teams: ["Real Madrid", "Atlético Madrid"], name: "Derbi Madrileño", importance: 9 },
  { teams: ["Manchester United", "Liverpool"], name: "Clássico Inglês", importance: 10 },
  { teams: ["Manchester United", "Manchester City"], name: "Manchester Derby", importance: 10 },
  { teams: ["Arsenal", "Tottenham Hotspur"], name: "North London Derby", importance: 9 },
  { teams: ["Chelsea", "Arsenal"], name: "London Derby", importance: 8 },
  { teams: ["Liverpool", "Everton"], name: "Merseyside Derby", importance: 8 },
  { teams: ["Bayern München", "Borussia Dortmund"], name: "Der Klassiker", importance: 10 },
  { teams: ["AC Milan", "Internazionale Milano"], name: "Derby della Madonnina", importance: 10 },
  { teams: ["Juventus", "Internazionale Milano"], name: "Derby d'Italia", importance: 9 },
  { teams: ["AS Roma", "SS Lazio"], name: "Derby della Capitale", importance: 9 },
  { teams: ["Paris Saint-Germain", "Olympique Marseille"], name: "Le Classique", importance: 10 },
  { teams: ["Olympique Lyonnais", "AS Saint-Étienne"], name: "Derby Rhône-Alpes", importance: 8 },
  { teams: ["Benfica", "FC Porto"], name: "O Clássico", importance: 10 },
  { teams: ["Benfica", "Sporting CP"], name: "Derby de Lisboa", importance: 9 },
  { teams: ["Ajax", "Feyenoord"], name: "De Klassieker", importance: 9 },
  { teams: ["Celtic", "Rangers"], name: "Old Firm", importance: 10 },
  { teams: ["Boca Juniors", "River Plate"], name: "Superclásico", importance: 10 },
];

// Keywords that indicate important matches
const IMPORTANT_STAGE_KEYWORDS = [
  { keyword: "final", importance: 10 },
  { keyword: "semifinal", importance: 9 },
  { keyword: "semi-final", importance: 9 },
  { keyword: "quartas", importance: 8 },
  { keyword: "quarter", importance: 8 },
  { keyword: "oitavas", importance: 7 },
  { keyword: "round of 16", importance: 7 },
];

interface Team {
  id: string;
  nome: string;
  escudo_url: string | null;
}

interface EnrichedMatch {
  id: string;
  data: string;
  hora: string | null;
  rodada: number | null;
  status: string | null;
  liga: {
    id: string;
    nome: string;
    logo_url: string | null;
    codigo_api: string | null;
  } | null;
  time_casa: Team | null;
  time_fora: Team | null;
}

export interface FeaturedMatch {
  id: string;
  homeTeam: {
    id: string;
    name: string;
    logo: string;
  };
  awayTeam: {
    id: string;
    name: string;
    logo: string;
  };
  date: string;
  time: string;
  league: string;
  leagueLogo: string | null;
  matchday: number | null;
  classicName: string | null;
  importance: number;
  prediction?: {
    probHome: number;
    probDraw: number;
    probAway: number;
  };
}

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/fc |cf |sc |ec |se |ca |ac |ss |as |rc |/gi, "") // Remove common prefixes
    .trim();
}

function findClassicRivalry(homeTeam: string, awayTeam: string): { name: string; importance: number } | null {
  const normalizedHome = normalizeTeamName(homeTeam);
  const normalizedAway = normalizeTeamName(awayTeam);
  
  for (const rivalry of CLASSIC_RIVALRIES) {
    const [team1, team2] = rivalry.teams.map(normalizeTeamName);
    
    if (
      (normalizedHome.includes(team1) && normalizedAway.includes(team2)) ||
      (normalizedHome.includes(team2) && normalizedAway.includes(team1))
    ) {
      return { name: rivalry.name, importance: rivalry.importance };
    }
  }
  
  return null;
}

function calculateMatchImportance(match: EnrichedMatch): number {
  let importance = 0;
  
  // Check for classic rivalry
  const rivalry = findClassicRivalry(
    match.time_casa?.nome || "",
    match.time_fora?.nome || ""
  );
  if (rivalry) {
    importance += rivalry.importance;
  }
  
  // Check for important stages in league name
  const leagueName = (match.liga?.nome || "").toLowerCase();
  for (const stage of IMPORTANT_STAGE_KEYWORDS) {
    if (leagueName.includes(stage.keyword)) {
      importance += stage.importance;
    }
  }
  
  // Copa Libertadores and Champions League get bonus
  const leagueCode = match.liga?.codigo_api || "";
  if (["CLI", "CL"].includes(leagueCode)) {
    importance += 3;
  }
  
  // Higher matchdays in league can indicate crucial matches
  if (match.rodada && match.rodada >= 30) {
    importance += 2;
  } else if (match.rodada && match.rodada >= 25) {
    importance += 1;
  }
  
  return importance;
}

async function fetchMatchesWithTeams(dateFrom: string, dateTo: string): Promise<EnrichedMatch[]> {
  // Fetch matches
  const { data: matches, error } = await supabase
    .from("partidas")
    .select(`
      id,
      data,
      hora,
      rodada,
      status,
      time_casa_id,
      time_fora_id,
      liga_id
    `)
    .eq("status", "scheduled")
    .gte("data", dateFrom)
    .lte("data", dateTo)
    .order("data", { ascending: true });

  if (error || !matches || matches.length === 0) {
    return [];
  }

  // Collect all IDs we need
  const teamIds = new Set<string>();
  const leagueIds = new Set<string>();
  
  matches.forEach(m => {
    if (m.time_casa_id) teamIds.add(m.time_casa_id);
    if (m.time_fora_id) teamIds.add(m.time_fora_id);
    if (m.liga_id) leagueIds.add(m.liga_id);
  });

  // Fetch teams and leagues in parallel
  const [teamsResult, leaguesResult] = await Promise.all([
    supabase.from("times").select("id, nome, escudo_url").in("id", Array.from(teamIds)),
    supabase.from("ligas").select("id, nome, logo_url, codigo_api").in("id", Array.from(leagueIds)),
  ]);

  const teamsMap = new Map(teamsResult.data?.map(t => [t.id, t]) || []);
  const leaguesMap = new Map(leaguesResult.data?.map(l => [l.id, l]) || []);

  // Enrich matches
  return matches.map(match => ({
    id: match.id,
    data: match.data,
    hora: match.hora,
    rodada: match.rodada,
    status: match.status,
    liga: leaguesMap.get(match.liga_id || "") || null,
    time_casa: teamsMap.get(match.time_casa_id || "") || null,
    time_fora: teamsMap.get(match.time_fora_id || "") || null,
  }));
}

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function formatDisplayTime(timeStr: string | null): string {
  if (!timeStr) return "--:--";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const brazilHours = (hours - 3 + 24) % 24;
  return `${brazilHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function matchToFeatured(match: EnrichedMatch, rivalry: { name: string; importance: number } | null, importance: number): FeaturedMatch {
  return {
    id: match.id,
    homeTeam: {
      id: match.time_casa?.id || "",
      name: match.time_casa?.nome || "TBD",
      logo: match.time_casa?.escudo_url || "/placeholder.svg",
    },
    awayTeam: {
      id: match.time_fora?.id || "",
      name: match.time_fora?.nome || "TBD",
      logo: match.time_fora?.escudo_url || "/placeholder.svg",
    },
    date: formatDisplayDate(match.data),
    time: formatDisplayTime(match.hora),
    league: match.liga?.nome || "Unknown",
    leagueLogo: match.liga?.logo_url || null,
    matchday: match.rodada,
    classicName: rivalry?.name || null,
    importance,
  };
}

export function useFeaturedMatch() {
  return useQuery({
    queryKey: ["featured-match"],
    queryFn: async (): Promise<FeaturedMatch | null> => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const enrichedMatches = await fetchMatchesWithTeams(today, nextWeek);
      
      if (enrichedMatches.length === 0) {
        return null;
      }
      
      // Calculate importance for each match
      const matchesWithImportance = enrichedMatches.map((match) => ({
        match,
        importance: calculateMatchImportance(match),
        rivalry: findClassicRivalry(
          match.time_casa?.nome || "",
          match.time_fora?.nome || ""
        ),
      }));
      
      // Sort by importance (highest first), then by date
      matchesWithImportance.sort((a, b) => {
        if (b.importance !== a.importance) {
          return b.importance - a.importance;
        }
        return new Date(a.match.data).getTime() - new Date(b.match.data).getTime();
      });
      
      // Get the most important match
      const featured = matchesWithImportance[0];
      if (!featured || featured.importance === 0) {
        // If no important match found, return the first scheduled match
        const firstMatch = enrichedMatches[0];
        return matchToFeatured(firstMatch, null, 0);
      }
      
      const { match, rivalry, importance } = featured;
      
      // Fetch prediction if exists
      const { data: prediction } = await supabase
        .from("palpites")
        .select("prob_casa, prob_empate, prob_fora")
        .eq("partida_id", match.id)
        .single();
      
      const result = matchToFeatured(match, rivalry, importance);
      
      if (prediction) {
        result.prediction = {
          probHome: prediction.prob_casa || 0,
          probDraw: prediction.prob_empate || 0,
          probAway: prediction.prob_fora || 0,
        };
      }
      
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get multiple featured matches (for showcase section)
export function useFeaturedMatches(limit: number = 3) {
  return useQuery({
    queryKey: ["featured-matches", limit],
    queryFn: async (): Promise<FeaturedMatch[]> => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const enrichedMatches = await fetchMatchesWithTeams(today, nextWeek);
      
      if (enrichedMatches.length === 0) {
        return [];
      }
      
      // Calculate importance and sort
      const matchesWithImportance = enrichedMatches
        .map((match) => ({
          match,
          importance: calculateMatchImportance(match),
          rivalry: findClassicRivalry(
            match.time_casa?.nome || "",
            match.time_fora?.nome || ""
          ),
        }))
        .filter((m) => m.importance > 0)
        .sort((a, b) => {
          if (b.importance !== a.importance) {
            return b.importance - a.importance;
          }
          return new Date(a.match.data).getTime() - new Date(b.match.data).getTime();
        })
        .slice(0, limit);
      
      return matchesWithImportance.map(({ match, rivalry, importance }) => 
        matchToFeatured(match, rivalry, importance)
      );
    },
    staleTime: 1000 * 60 * 5,
  });
}
