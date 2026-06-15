import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWC2026Teams(filters?: { group?: string; status?: string; confederation?: string }) {
  return useQuery({
    queryKey: ["wc2026", "teams", filters],
    queryFn: async () => {
      let q = supabase.from("world_cup_2026_teams").select("*").eq("is_active", true).order("group_letter").order("name");
      if (filters?.group) q = q.eq("group_letter", filters.group);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.confederation) q = q.eq("confederation", filters.confederation);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWC2026Team(slug: string | undefined) {
  return useQuery({
    enabled: !!slug,
    queryKey: ["wc2026", "team", slug],
    queryFn: async () => {
      const { data: team } = await supabase.from("world_cup_2026_teams").select("*").eq("slug", slug!).maybeSingle();
      if (!team) return null;
      const [{ data: history }, { data: players }, { data: matches }, { data: analyses }] = await Promise.all([
        supabase.from("world_cup_2026_team_history").select("*").eq("team_id", team.id).order("year", { ascending: false }),
        supabase.from("world_cup_2026_players").select("*").eq("team_id", team.id).order("shirt_number"),
        supabase.from("world_cup_2026_matches").select("*, home:world_cup_2026_teams!home_team_id(name,flag_url,slug), away:world_cup_2026_teams!away_team_id(name,flag_url,slug)").or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`).order("match_date"),
        supabase.from("world_cup_2026_ai_analyses").select("*").eq("team_id", team.id),
      ]);
      return { team, history: history ?? [], players: players ?? [], matches: matches ?? [], analyses: analyses ?? [] };
    },
  });
}

export function useWC2026Matches(filters?: { stage?: string; group?: string; status?: string; teamId?: string; date?: string }) {
  return useQuery({
    queryKey: ["wc2026", "matches", filters],
    queryFn: async () => {
      let q = supabase.from("world_cup_2026_matches")
        .select("*, home:world_cup_2026_teams!home_team_id(name,flag_url,slug), away:world_cup_2026_teams!away_team_id(name,flag_url,slug)")
        .order("match_date");
      if (filters?.stage) q = q.eq("stage", filters.stage);
      if (filters?.group) q = q.eq("group_letter", filters.group);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.teamId) q = q.or(`home_team_id.eq.${filters.teamId},away_team_id.eq.${filters.teamId}`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWC2026Match(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["wc2026", "match", id],
    queryFn: async () => {
      const { data: match } = await supabase.from("world_cup_2026_matches")
        .select("*, home:world_cup_2026_teams!home_team_id(*), away:world_cup_2026_teams!away_team_id(*)").eq("id", id!).maybeSingle();
      if (!match) return null;
      const [{ data: lineups }, { data: events }, { data: analyses }] = await Promise.all([
        supabase.from("world_cup_2026_lineups").select("*, player:player_id(name,position,shirt_number)").eq("match_id", id!),
        supabase.from("world_cup_2026_match_events").select("*, player:player_id(name)").eq("match_id", id!).order("minute"),
        supabase.from("world_cup_2026_ai_analyses").select("*").eq("match_id", id!).order("generated_at", { ascending: false }),
      ]);
      return { match, lineups: lineups ?? [], events: events ?? [], analyses: analyses ?? [] };
    },
  });
}

export function useWC2026Standings() {
  return useQuery({
    queryKey: ["wc2026", "standings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("world_cup_2026_standings")
        .select("*, team:team_id(name,flag_url,slug,status)")
        .order("group_letter").order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWC2026Posts(limit?: number) {
  return useQuery({
    queryKey: ["wc2026", "posts", limit],
    queryFn: async () => {
      // Posts da Copa 2026 são gravados na tabela `noticias` com world_cup_2026_match_id
      // ou slug começando com "copa-2026-".
      const { data, error } = await supabase
        .from("noticias")
        .select("id, slug, titulo, resumo, imagem_url, imagem_alt, data_publicacao, world_cup_2026_match_id")
        .eq("publicada", true)
        .or("world_cup_2026_match_id.not.is.null,slug.ilike.copa-2026-%")
        .order("data_publicacao", { ascending: false });
      if (error) throw error;
      return limit ? (data ?? []).slice(0, limit) : (data ?? []);
    },
  });
}


export function useWC2026Overview() {
  return useQuery({
    queryKey: ["wc2026", "overview"],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(); today.setHours(0,0,0,0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
      const baseSelect = "*, home:world_cup_2026_teams!home_team_id(name,flag_url,slug), away:world_cup_2026_teams!away_team_id(name,flag_url,slug)";
      const [todayMatches, nextMatches, liveMatches, lastResults, posts] = await Promise.all([
        supabase.from("world_cup_2026_matches").select(baseSelect)
          .gte("match_date", today.toISOString()).lt("match_date", tomorrow.toISOString())
          .order("match_date"),
        supabase.from("world_cup_2026_matches").select(baseSelect)
          .gte("match_date", now.toISOString()).eq("status", "scheduled")
          .order("match_date").limit(5),
        supabase.from("world_cup_2026_matches").select(baseSelect)
          .eq("status", "live").order("match_date"),
        supabase.from("world_cup_2026_matches").select(baseSelect)
          .eq("status", "finished").order("match_date", { ascending: false }).limit(6),
        supabase.from("noticias")
          .select("id, slug, titulo, resumo, imagem_url, data_publicacao")
          .eq("publicada", true)
          .or("world_cup_2026_match_id.not.is.null,slug.ilike.copa-2026-%")
          .order("data_publicacao", { ascending: false }).limit(12),
      ]);
      return {
        todayMatches: todayMatches.data ?? [],
        nextMatches: nextMatches.data ?? [],
        nextMatch: (nextMatches.data ?? [])[0] ?? null,
        liveMatches: liveMatches.data ?? [],
        lastResults: lastResults.data ?? [],
        recentPosts: (posts.data ?? []).slice(0, 6),
      };
    },
  });
}

