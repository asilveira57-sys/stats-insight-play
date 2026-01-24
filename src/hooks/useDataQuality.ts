import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamWithoutMatches {
  id: string;
  nome: string;
  total_partidas: number;
}

export interface DuplicateAlias {
  alias: string;
  normalized_alias: string;
  team_count: number;
  team_names: string[];
}

export interface SimilarTeams {
  team_a_id: string;
  team_a_name: string;
  team_b_id: string;
  team_b_name: string;
  similarity_score: number;
}

// Fetch teams that have no matches (neither home nor away)
export function useTeamsWithoutMatches() {
  return useQuery({
    queryKey: ["data-quality", "teams-without-matches"],
    queryFn: async () => {
      // Get all teams
      const { data: teams, error: teamsError } = await supabase
        .from("times")
        .select("id, nome");

      if (teamsError) throw teamsError;

      // Get all unique team IDs that have matches
      const { data: homeMatches, error: homeError } = await supabase
        .from("partidas")
        .select("time_casa_id");

      if (homeError) throw homeError;

      const { data: awayMatches, error: awayError } = await supabase
        .from("partidas")
        .select("time_fora_id");

      if (awayError) throw awayError;

      const teamsWithMatches = new Set<string>();
      homeMatches?.forEach((m) => {
        if (m.time_casa_id) teamsWithMatches.add(m.time_casa_id);
      });
      awayMatches?.forEach((m) => {
        if (m.time_fora_id) teamsWithMatches.add(m.time_fora_id);
      });

      // Filter teams without matches
      const teamsWithoutMatches: TeamWithoutMatches[] = (teams || [])
        .filter((t) => !teamsWithMatches.has(t.id))
        .map((t) => ({
          id: t.id,
          nome: t.nome,
          total_partidas: 0,
        }));

      return teamsWithoutMatches;
    },
  });
}

// Fetch aliases that are associated with more than one team
export function useDuplicateAliases() {
  return useQuery({
    queryKey: ["data-quality", "duplicate-aliases"],
    queryFn: async () => {
      const { data: aliases, error } = await supabase
        .from("team_aliases")
        .select(`
          alias,
          normalized_alias,
          team_id,
          times:team_id (nome)
        `);

      if (error) throw error;

      // Group by normalized_alias
      const aliasMap = new Map<
        string,
        { alias: string; teamIds: Set<string>; teamNames: string[] }
      >();

      (aliases || []).forEach((a) => {
        const key = a.normalized_alias;
        if (!aliasMap.has(key)) {
          aliasMap.set(key, {
            alias: a.alias,
            teamIds: new Set(),
            teamNames: [],
          });
        }
        const entry = aliasMap.get(key)!;
        if (a.team_id && !entry.teamIds.has(a.team_id)) {
          entry.teamIds.add(a.team_id);
          const teamName = (a.times as any)?.nome;
          if (teamName) {
            entry.teamNames.push(teamName);
          }
        }
      });

      // Filter only duplicates (more than one team)
      const duplicates: DuplicateAlias[] = [];
      aliasMap.forEach((value, key) => {
        if (value.teamIds.size > 1) {
          duplicates.push({
            alias: value.alias,
            normalized_alias: key,
            team_count: value.teamIds.size,
            team_names: value.teamNames,
          });
        }
      });

      return duplicates.sort((a, b) => b.team_count - a.team_count);
    },
  });
}

// Simple string similarity calculation (Dice coefficient)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams1 = new Set<string>();
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2));
  }

  const bigrams2 = new Set<string>();
  for (let i = 0; i < s2.length - 1; i++) {
    bigrams2.add(s2.substring(i, i + 2));
  }

  let intersection = 0;
  bigrams1.forEach((bigram) => {
    if (bigrams2.has(bigram)) intersection++;
  });

  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

// Clean team name for comparison
function cleanTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|cf|sc|ac|rc|cd|ud|sd|ec|se|cr|ca|aa|clube|club|futebol|football|esporte|sport|atletico|athletic)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Fetch teams with similar names (potential duplicates)
export function useSimilarTeams(threshold: number = 0.7) {
  return useQuery({
    queryKey: ["data-quality", "similar-teams", threshold],
    queryFn: async () => {
      const { data: teams, error } = await supabase
        .from("times")
        .select("id, nome")
        .order("nome");

      if (error) throw error;

      const similarPairs: SimilarTeams[] = [];

      // Compare all pairs (O(n²) - intentionally not optimized as per requirements)
      for (let i = 0; i < (teams?.length || 0); i++) {
        for (let j = i + 1; j < (teams?.length || 0); j++) {
          const teamA = teams![i];
          const teamB = teams![j];

          const cleanA = cleanTeamName(teamA.nome);
          const cleanB = cleanTeamName(teamB.nome);

          const score = calculateSimilarity(cleanA, cleanB);

          if (score >= threshold) {
            similarPairs.push({
              team_a_id: teamA.id,
              team_a_name: teamA.nome,
              team_b_id: teamB.id,
              team_b_name: teamB.nome,
              similarity_score: Math.round(score * 100),
            });
          }
        }
      }

      return similarPairs.sort((a, b) => b.similarity_score - a.similarity_score);
    },
  });
}
