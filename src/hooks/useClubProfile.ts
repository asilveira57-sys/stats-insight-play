import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

interface ClubStats {
  total_matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  win_percentage: number;
}

interface ClubDecadeStats {
  decade: string;
  matches: number;
  wins: number;
  best_season?: string;
  worst_season?: string;
}

interface ClubTopScorer {
  player_name: string;
  goals: number;
  matches: number;
  average: number;
}

interface ClubRival {
  team_id: string;
  team_name: string;
  team_slug: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
}

interface ClubCompetitionStats {
  league_id: string;
  league_name: string;
  matches: number;
  wins: number;
  goals_for: number;
  best_finish?: string;
}

interface ClubProfile {
  id: string;
  team_id: string;
  history_text?: string;
  stadium_text?: string;
  culture_text?: string;
  rivalries_text?: string;
  legacy_text?: string;
}

interface RecentMatch {
  id: string;
  data: string;
  opponent_id: string;
  opponent_name: string;
  opponent_slug: string;
  league_name?: string;
  home_goals?: number;
  away_goals?: number;
  is_home: boolean;
}

// Hook para buscar dados básicos do clube
export function useClubData(slug: string) {
  return useQuery({
    queryKey: ["club-data", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("times")
        .select(`
          id,
          nome,
          slug,
          escudo_url,
          pais,
          estado,
          cores,
          short_code,
          created_at
        `)
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

// Hook para buscar perfil institucional do clube
export function useClubProfile(teamId: string) {
  return useQuery({
    queryKey: ["club-profile", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_profiles")
        .select("*")
        .eq("team_id", teamId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as ClubProfile | null;
    },
    enabled: !!teamId,
  });
}

// Hook para estatísticas gerais do clube
export function useClubStats(teamId: string) {
  return useQuery({
    queryKey: ["club-stats", teamId],
    queryFn: async () => {
      const matches = await fetchAllRecords<any>(
        "partidas",
        `
          id,
          time_casa_id,
          time_fora_id,
          gols_casa,
          gols_fora,
          status
        `,
        (query) => query
          .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
          .eq("status", "finished")
          .not("gols_casa", "is", null)
          .not("gols_fora", "is", null)
      );

      const stats: ClubStats = {
        total_matches: matches.length,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        win_percentage: 0,
      };

      matches.forEach((match) => {
        const isHome = match.time_casa_id === teamId;
        const teamGoals = isHome ? match.gols_casa : match.gols_fora;
        const opponentGoals = isHome ? match.gols_fora : match.gols_casa;

        stats.goals_for += teamGoals;
        stats.goals_against += opponentGoals;

        if (teamGoals > opponentGoals) {
          stats.wins++;
        } else if (teamGoals === opponentGoals) {
          stats.draws++;
        } else {
          stats.losses++;
        }
      });

      stats.goal_difference = stats.goals_for - stats.goals_against;
      stats.win_percentage = stats.total_matches > 0 
        ? Math.round((stats.wins / stats.total_matches) * 100) 
        : 0;

      return stats;
    },
    enabled: !!teamId,
  });
}

// Hook para estatísticas por década
export function useClubDecadeStats(teamId: string) {
  return useQuery({
    queryKey: ["club-decade-stats", teamId],
    queryFn: async () => {
      const matches = await fetchAllRecords<any>(
        "partidas",
        `
          id,
          time_casa_id,
          time_fora_id,
          gols_casa,
          gols_fora,
          data,
          temporada
        `,
        (query) => query
          .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
          .eq("status", "finished")
          .not("gols_casa", "is", null)
          .not("gols_fora", "is", null)
      );

      const decadeMap = new Map<string, ClubDecadeStats>();

      matches.forEach((match) => {
        const year = new Date(match.data).getFullYear();
        const decade = `${Math.floor(year / 10) * 10}s`;
        
        if (!decadeMap.has(decade)) {
          decadeMap.set(decade, {
            decade,
            matches: 0,
            wins: 0,
          });
        }

        const stats = decadeMap.get(decade)!;
        stats.matches++;

        const isHome = match.time_casa_id === teamId;
        const teamGoals = isHome ? match.gols_casa : match.gols_fora;
        const opponentGoals = isHome ? match.gols_fora : match.gols_casa;

        if (teamGoals > opponentGoals) {
          stats.wins++;
        }
      });

      return Array.from(decadeMap.values()).sort((a, b) => a.decade.localeCompare(b.decade));
    },
    enabled: !!teamId,
  });
}

// Hook para artilheiros históricos
export function useClubTopScorers(teamId: string) {
  return useQuery({
    queryKey: ["club-top-scorers", teamId],
    queryFn: async () => {
      const goals = await fetchAllRecords<any>(
        "gols_partida",
        `
          jogador_nome,
          partida_id,
          partidas!inner(time_casa_id, time_fora_id)
        `,
        (query) => query
          .or(`partidas.time_casa_id.eq.${teamId},partidas.time_fora_id.eq.${teamId}`)
      );

      const playerMap = new Map<string, ClubTopScorer>();

      goals.forEach((goal) => {
        if (!playerMap.has(goal.jogador_nome)) {
          playerMap.set(goal.jogador_nome, {
            player_name: goal.jogador_nome,
            goals: 0,
            matches: 0,
            average: 0,
          });
        }

        const player = playerMap.get(goal.jogador_nome)!;
        player.goals++;
      });

      // Calculate matches per player (simplified)
      playerMap.forEach((player) => {
        player.matches = Math.max(1, Math.ceil(player.goals / 0.5)); // Estimate
        player.average = Number((player.goals / player.matches).toFixed(2));
      });

      return Array.from(playerMap.values())
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 20);
    },
    enabled: !!teamId,
  });
}

// Hook para principais rivais
export function useClubRivals(teamId: string) {
  return useQuery({
    queryKey: ["club-rivals", teamId],
    queryFn: async () => {
      const matches = await fetchAllRecords<any>(
        "partidas",
        `
          id,
          time_casa_id,
          time_fora_id,
          gols_casa,
          gols_fora,
          time_casa:times!time_casa_id(nome, slug),
          time_fora:times!time_fora_id(nome, slug)
        `,
        (query) => query
          .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
          .eq("status", "finished")
          .not("gols_casa", "is", null)
          .not("gols_fora", "is", null)
      );

      const rivalMap = new Map<string, ClubRival>();

      matches.forEach((match) => {
        const isHome = match.time_casa_id === teamId;
        const opponentId = isHome ? match.time_fora_id : match.time_casa_id;
        const opponentName = isHome ? match.time_fora?.nome : match.time_casa?.nome;
        const opponentSlug = isHome ? match.time_fora?.slug : match.time_casa?.slug;

        if (!rivalMap.has(opponentId)) {
          rivalMap.set(opponentId, {
            team_id: opponentId,
            team_name: opponentName,
            team_slug: opponentSlug,
            matches: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
          });
        }

        const rival = rivalMap.get(opponentId)!;
        rival.matches++;

        const teamGoals = isHome ? match.gols_casa : match.gols_fora;
        const opponentGoals = isHome ? match.gols_fora : match.gols_casa;

        rival.goals_for += teamGoals;
        rival.goals_against += opponentGoals;

        if (teamGoals > opponentGoals) {
          rival.wins++;
        } else if (teamGoals === opponentGoals) {
          rival.draws++;
        } else {
          rival.losses++;
        }
      });

      return Array.from(rivalMap.values())
        .sort((a, b) => b.matches - a.matches)
        .slice(0, 10);
    },
    enabled: !!teamId,
  });
}

// Hook para estatísticas por competição
export function useClubCompetitionStats(teamId: string) {
  return useQuery({
    queryKey: ["club-competition-stats", teamId],
    queryFn: async () => {
      const matches = await fetchAllRecords<any>(
        "partidas",
        `
          id,
          time_casa_id,
          time_fora_id,
          gols_casa,
          gols_fora,
          liga_id,
          ligas!inner(nome)
        `,
        (query) => query
          .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
          .eq("status", "finished")
          .not("gols_casa", "is", null)
          .not("gols_fora", "is", null)
          .not("liga_id", "is", null)
      );

      const competitionMap = new Map<string, ClubCompetitionStats>();

      matches.forEach((match) => {
        const leagueId = match.liga_id;
        const leagueName = match.ligas?.nome;

        if (!competitionMap.has(leagueId)) {
          competitionMap.set(leagueId, {
            league_id: leagueId,
            league_name: leagueName,
            matches: 0,
            wins: 0,
            goals_for: 0,
          });
        }

        const stats = competitionMap.get(leagueId)!;
        stats.matches++;

        const isHome = match.time_casa_id === teamId;
        const teamGoals = isHome ? match.gols_casa : match.gols_fora;
        const opponentGoals = isHome ? match.gols_fora : match.gols_casa;

        stats.goals_for += teamGoals;

        if (teamGoals > opponentGoals) {
          stats.wins++;
        }
      });

      return Array.from(competitionMap.values())
        .sort((a, b) => b.matches - a.matches);
    },
    enabled: !!teamId,
  });
}

// Hook para partidas recentes
export function useClubRecentMatches(teamId: string, limit = 10) {
  return useQuery({
    queryKey: ["club-recent-matches", teamId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partidas")
        .select(`
          id,
          data,
          time_casa_id,
          time_fora_id,
          gols_casa,
          gols_fora,
          time_casa:times!time_casa_id(nome, slug),
          time_fora:times!time_fora_id(nome, slug),
          ligas(nome)
        `)
        .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
        .eq("status", "finished")
        .not("gols_casa", "is", null)
        .not("gols_fora", "is", null)
        .order("data", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((match): RecentMatch => {
        const isHome = match.time_casa_id === teamId;
        return {
          id: match.id,
          data: match.data,
          opponent_id: isHome ? match.time_fora_id : match.time_casa_id,
          opponent_name: isHome ? match.time_fora?.nome : match.time_casa?.nome,
          opponent_slug: isHome ? match.time_fora?.slug : match.time_casa?.slug,
          league_name: match.ligas?.nome,
          home_goals: match.gols_casa,
          away_goals: match.gols_fora,
          is_home: isHome,
        };
      });
    },
    enabled: !!teamId,
  });
}

// Hook para calcular período histórico analisado
export function useClubHistoricalPeriod(teamId: string) {
  return useQuery({
    queryKey: ["club-historical-period", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partidas")
        .select("data")
        .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
        .eq("status", "finished")
        .not("gols_casa", "is", null)
        .not("gols_fora", "is", null)
        .order("data", { ascending: true })
        .limit(1);

      if (error) throw error;

      const firstMatch = data[0]?.data;
      if (!firstMatch) return null;

      const startYear = new Date(firstMatch).getFullYear();
      const currentYear = new Date().getFullYear();

      return {
        start_year: startYear,
        end_year: currentYear,
        first_match: firstMatch,
      };
    },
    enabled: !!teamId,
  });
}