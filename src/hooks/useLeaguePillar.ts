import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaguePillarData {
  id: string;
  nome: string;
  slug: string;
  pais: string | null;
  logo_url: string | null;
  pillar_content: {
    visao_geral: string;
    estilo_liga: string;
    panorama_temporada: string;
  } | null;
  pillar_updated_at: string | null;
  // Computed stats
  stats: {
    totalPartidas: number;
    partidasFinalizadas: number;
    totalGols: number;
    mediaGolsPorJogo: number;
    jogosSemGols: number;
    percentualEmpates: number;
  };
  teams: Array<{
    id: string;
    nome: string;
    slug: string | null;
    cores: { primary: string; secondary: string } | null;
  }>;
  upcomingMatches: Array<{
    id: string;
    data: string;
    timeCasa: string;
    timeFora: string;
    timeCasaSlug: string | null;
    timeForaSlug: string | null;
  }>;
  recentMatches: Array<{
    id: string;
    data: string;
    timeCasa: string;
    timeFora: string;
    golsCasa: number;
    golsFora: number;
  }>;
}

export function useLeagueBySlug(slug: string | null) {
  return useQuery({
    queryKey: ["league-by-slug", slug],
    queryFn: async (): Promise<LeaguePillarData | null> => {
      if (!slug) return null;

      // Fetch league by slug
      const { data: league, error: leagueError } = await supabase
        .from("ligas")
        .select("*")
        .eq("slug", slug)
        .single();

      if (leagueError || !league) {
        console.error("Error fetching league:", leagueError);
        return null;
      }

      // Fetch all matches for this league
      const { data: matches } = await supabase
        .from("partidas")
        .select(`
          id, data, gols_casa, gols_fora, status,
          time_casa:times!partidas_time_casa_id_fkey(id, nome, slug, cores),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, slug, cores)
        `)
        .eq("liga_id", league.id)
        .order("data", { ascending: false })
        .limit(100);

      // Calculate stats
      const finishedMatches = (matches || []).filter(m => m.status === "finished");
      const scheduledMatches = (matches || []).filter(m => m.status === "scheduled");
      
      let totalGols = 0;
      let jogosSemGols = 0;
      let empates = 0;

      finishedMatches.forEach(m => {
        const gc = m.gols_casa ?? 0;
        const gf = m.gols_fora ?? 0;
        totalGols += gc + gf;
        if (gc + gf === 0) jogosSemGols++;
        if (gc === gf) empates++;
      });

      const mediaGolsPorJogo = finishedMatches.length > 0 
        ? Math.round((totalGols / finishedMatches.length) * 100) / 100 
        : 0;

      const percentualEmpates = finishedMatches.length > 0 
        ? Math.round((empates / finishedMatches.length) * 100) 
        : 0;

      // Get unique teams
      const teamsMap = new Map<string, {
        id: string;
        nome: string;
        slug: string | null;
        cores: { primary: string; secondary: string } | null;
      }>();

      (matches || []).forEach(m => {
        const casa = m.time_casa as any;
        const fora = m.time_fora as any;
        if (casa && !teamsMap.has(casa.id)) {
          teamsMap.set(casa.id, {
            id: casa.id,
            nome: casa.nome,
            slug: casa.slug,
            cores: casa.cores,
          });
        }
        if (fora && !teamsMap.has(fora.id)) {
          teamsMap.set(fora.id, {
            id: fora.id,
            nome: fora.nome,
            slug: fora.slug,
            cores: fora.cores,
          });
        }
      });

      const teams = Array.from(teamsMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));

      // Format recent matches
      const recentMatches = finishedMatches.slice(0, 10).map(m => ({
        id: m.id,
        data: m.data,
        timeCasa: (m.time_casa as any)?.nome || "Time Casa",
        timeFora: (m.time_fora as any)?.nome || "Time Fora",
        golsCasa: m.gols_casa ?? 0,
        golsFora: m.gols_fora ?? 0,
      }));

      // Format upcoming matches
      const upcomingMatches = scheduledMatches
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        .slice(0, 10)
        .map(m => ({
          id: m.id,
          data: m.data,
          timeCasa: (m.time_casa as any)?.nome || "Time Casa",
          timeFora: (m.time_fora as any)?.nome || "Time Fora",
          timeCasaSlug: (m.time_casa as any)?.slug || null,
          timeForaSlug: (m.time_fora as any)?.slug || null,
        }));

      return {
        id: league.id,
        nome: league.nome,
        slug: league.slug || slug,
        pais: league.pais,
        logo_url: league.logo_url,
        pillar_content: league.pillar_content as LeaguePillarData["pillar_content"],
        pillar_updated_at: league.pillar_updated_at,
        stats: {
          totalPartidas: (matches || []).length,
          partidasFinalizadas: finishedMatches.length,
          totalGols,
          mediaGolsPorJogo,
          jogosSemGols,
          percentualEmpates,
        },
        teams,
        upcomingMatches,
        recentMatches,
      };
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });
}

export function useLeagueRelatedNews(leagueName: string | null, limit: number = 5) {
  return useQuery({
    queryKey: ["league-related-news", leagueName, limit],
    queryFn: async () => {
      if (!leagueName) return [];

      const { data, error } = await supabase
        .from("noticias")
        .select("id, titulo, slug, data_publicacao, imagem_url")
        .eq("publicada", true)
        .ilike("titulo", `%${leagueName}%`)
        .order("data_publicacao", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching related news:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!leagueName,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllLeagues() {
  return useQuery({
    queryKey: ["all-leagues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ligas")
        .select("id, nome, slug, pais, logo_url")
        .eq("ativa", true)
        .order("nome");

      if (error) {
        console.error("Error fetching leagues:", error);
        return [];
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 30,
  });
}
