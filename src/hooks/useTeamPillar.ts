import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamPillarData {
  id: string;
  nome: string;
  slug: string;
  pais: string | null;
  cores: { primary: string; secondary: string } | null;
  pillar_content: {
    visao_geral: string;
    estilo_jogo: string;
    desempenho_temporada: string;
    confrontos_relevantes: string;
    updated_at: string;
  } | null;
  pillar_updated_at: string | null;
  // Computed stats
  stats: {
    jogos: number;
    vitorias: number;
    empates: number;
    derrotas: number;
    golsMarcados: number;
    golsSofridos: number;
    aproveitamento: number;
    forma: string[];
    jogosCasa: number;
    vitoriasCasa: number;
    jogosFora: number;
    vitoriasFora: number;
  };
  liga: {
    id: string;
    nome: string;
  } | null;
  recentMatches: Array<{
    id: string;
    data: string;
    adversario: string;
    resultado: string;
    placar: string;
    local: "casa" | "fora";
  }>;
  upcomingMatches: Array<{
    id: string;
    data: string;
    adversario: string;
    local: "casa" | "fora";
  }>;
}

export function useTeamBySlug(slug: string | null) {
  return useQuery({
    queryKey: ["team-by-slug", slug],
    queryFn: async (): Promise<TeamPillarData | null> => {
      if (!slug) return null;

      // Fetch team by slug
      const { data: team, error: teamError } = await supabase
        .from("times")
        .select("*")
        .eq("slug", slug)
        .single();

      if (teamError || !team) {
        console.error("Error fetching team:", teamError);
        return null;
      }

      // Fetch recent finished matches
      const { data: homeMatches } = await supabase
        .from("partidas")
        .select(`
          id, data, gols_casa, gols_fora, status,
          time_fora:times!partidas_time_fora_id_fkey(id, nome),
          liga:ligas(id, nome)
        `)
        .eq("time_casa_id", team.id)
        .eq("status", "finished")
        .order("data", { ascending: false })
        .limit(20);

      const { data: awayMatches } = await supabase
        .from("partidas")
        .select(`
          id, data, gols_casa, gols_fora, status,
          time_casa:times!partidas_time_casa_id_fkey(id, nome),
          liga:ligas(id, nome)
        `)
        .eq("time_fora_id", team.id)
        .eq("status", "finished")
        .order("data", { ascending: false })
        .limit(20);

      // Fetch upcoming matches
      const { data: upcomingHome } = await supabase
        .from("partidas")
        .select(`
          id, data,
          time_fora:times!partidas_time_fora_id_fkey(id, nome)
        `)
        .eq("time_casa_id", team.id)
        .eq("status", "scheduled")
        .order("data", { ascending: true })
        .limit(5);

      const { data: upcomingAway } = await supabase
        .from("partidas")
        .select(`
          id, data,
          time_casa:times!partidas_time_casa_id_fkey(id, nome)
        `)
        .eq("time_fora_id", team.id)
        .eq("status", "scheduled")
        .order("data", { ascending: true })
        .limit(5);

      // Calculate stats
      let vitorias = 0, empates = 0, derrotas = 0;
      let golsMarcados = 0, golsSofridos = 0;
      let vitoriasCasa = 0, vitoriasFora = 0;

      const processedHome = (homeMatches || []).map(m => {
        const gc = m.gols_casa ?? 0;
        const gf = m.gols_fora ?? 0;
        golsMarcados += gc;
        golsSofridos += gf;
        
        let resultado: string;
        if (gc > gf) { vitorias++; vitoriasCasa++; resultado = "V"; }
        else if (gc === gf) { empates++; resultado = "E"; }
        else { derrotas++; resultado = "D"; }

        return {
          id: m.id,
          data: m.data,
          adversario: (m.time_fora as any)?.nome || "Adversário",
          resultado,
          placar: `${gc} x ${gf}`,
          local: "casa" as const,
          liga: m.liga,
        };
      });

      const processedAway = (awayMatches || []).map(m => {
        const gc = m.gols_casa ?? 0;
        const gf = m.gols_fora ?? 0;
        golsMarcados += gf;
        golsSofridos += gc;
        
        let resultado: string;
        if (gf > gc) { vitorias++; vitoriasFora++; resultado = "V"; }
        else if (gf === gc) { empates++; resultado = "E"; }
        else { derrotas++; resultado = "D"; }

        return {
          id: m.id,
          data: m.data,
          adversario: (m.time_casa as any)?.nome || "Adversário",
          resultado,
          placar: `${gc} x ${gf}`,
          local: "fora" as const,
          liga: m.liga,
        };
      });

      const allMatches = [...processedHome, ...processedAway]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const forma = allMatches.slice(0, 5).map(m => m.resultado);
      const jogos = allMatches.length;
      const aproveitamento = jogos > 0 ? Math.round((vitorias * 3 + empates) / (jogos * 3) * 100) : 0;

      // Get main league from most recent match
      const mainLiga = allMatches[0]?.liga || null;

      // Process upcoming matches
      const upcomingMatches = [
        ...(upcomingHome || []).map(m => ({
          id: m.id,
          data: m.data,
          adversario: (m.time_fora as any)?.nome || "Adversário",
          local: "casa" as const,
        })),
        ...(upcomingAway || []).map(m => ({
          id: m.id,
          data: m.data,
          adversario: (m.time_casa as any)?.nome || "Adversário",
          local: "fora" as const,
        })),
      ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()).slice(0, 5);

      return {
        id: team.id,
        nome: team.nome,
        slug: team.slug || slug,
        pais: team.pais,
        cores: team.cores as { primary: string; secondary: string } | null,
        pillar_content: team.pillar_content as TeamPillarData["pillar_content"],
        pillar_updated_at: team.pillar_updated_at,
        stats: {
          jogos,
          vitorias,
          empates,
          derrotas,
          golsMarcados,
          golsSofridos,
          aproveitamento,
          forma,
          jogosCasa: processedHome.length,
          vitoriasCasa,
          jogosFora: processedAway.length,
          vitoriasFora,
        },
        liga: mainLiga ? { id: (mainLiga as any).id, nome: (mainLiga as any).nome } : null,
        recentMatches: allMatches.slice(0, 10),
        upcomingMatches,
      };
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useTeamRelatedNews(teamName: string | null, limit: number = 5) {
  return useQuery({
    queryKey: ["team-related-news", teamName, limit],
    queryFn: async () => {
      if (!teamName) return [];

      const { data, error } = await supabase
        .from("noticias")
        .select("id, titulo, slug, data_publicacao, imagem_url")
        .eq("publicada", true)
        .ilike("titulo", `%${teamName}%`)
        .order("data_publicacao", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching related news:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!teamName,
    staleTime: 1000 * 60 * 5,
  });
}
