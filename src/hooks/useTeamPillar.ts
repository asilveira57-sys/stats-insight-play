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

export type TeamPillarResult =
  | { status: "found"; team: TeamPillarData }
  | { status: "not_found" }
  | { status: "error"; message: string };

const RECENT_LIMIT = 50;
const UPCOMING_LIMIT = 5;

export function useTeamBySlug(slug: string | null) {
  return useQuery({
    queryKey: ["team-by-slug-v2", slug],
    queryFn: async (): Promise<TeamPillarResult> => {
      if (!slug) return { status: "not_found" };

      // Resolve team — maybeSingle distingue "0 linhas" de "erro de rede"
      const { data: team, error: teamError } = await supabase
        .from("times")
        .select("id, nome, slug, pais, cores, pillar_content, pillar_updated_at")
        .eq("slug", slug)
        .maybeSingle();

      if (teamError) {
        console.error("Erro ao buscar time:", teamError);
        return { status: "error", message: teamError.message };
      }
      if (!team) return { status: "not_found" };

      // Carrega últimas partidas finalizadas (uma query única, paginada)
      const { data: recentRaw, error: recentErr } = await supabase
        .from("partidas")
        .select(
          `id, data, gols_casa, gols_fora, time_casa_id, time_fora_id,
            time_casa:times!partidas_time_casa_id_fkey(id, nome),
            time_fora:times!partidas_time_fora_id_fkey(id, nome),
            liga:ligas(id, nome)`
        )
        .or(`time_casa_id.eq.${team.id},time_fora_id.eq.${team.id}`)
        .eq("status", "finished")
        .order("data", { ascending: false })
        .limit(RECENT_LIMIT);

      if (recentErr) {
        console.error("Erro ao buscar partidas:", recentErr);
      }

      const { data: upcomingRaw } = await supabase
        .from("partidas")
        .select(
          `id, data, time_casa_id, time_fora_id,
            time_casa:times!partidas_time_casa_id_fkey(id, nome),
            time_fora:times!partidas_time_fora_id_fkey(id, nome)`
        )
        .or(`time_casa_id.eq.${team.id},time_fora_id.eq.${team.id}`)
        .eq("status", "scheduled")
        .gte("data", new Date().toISOString().slice(0, 10))
        .order("data", { ascending: true })
        .limit(UPCOMING_LIMIT);

      // Agrega estatísticas
      let vitorias = 0, empates = 0, derrotas = 0;
      let golsMarcados = 0, golsSofridos = 0;
      let jogosCasa = 0, vitoriasCasa = 0;
      let jogosFora = 0, vitoriasFora = 0;
      const recentMatches: TeamPillarData["recentMatches"] = [];

      (recentRaw || []).forEach((m: any) => {
        const isHome = m.time_casa_id === team.id;
        const gc = m.gols_casa ?? 0;
        const gf = m.gols_fora ?? 0;
        const gm = isHome ? gc : gf;
        const gs = isHome ? gf : gc;
        golsMarcados += gm;
        golsSofridos += gs;
        let resultado: string;
        if (gm > gs) {
          vitorias++;
          if (isHome) vitoriasCasa++; else vitoriasFora++;
          resultado = "V";
        } else if (gm === gs) {
          empates++;
          resultado = "E";
        } else {
          derrotas++;
          resultado = "D";
        }
        if (isHome) jogosCasa++; else jogosFora++;
        recentMatches.push({
          id: m.id,
          data: m.data,
          adversario: (isHome ? m.time_fora : m.time_casa)?.nome || "Adversário",
          resultado,
          placar: `${gc} x ${gf}`,
          local: isHome ? "casa" : "fora",
        });
      });

      const jogos = recentMatches.length;
      const aproveitamento =
        jogos > 0 ? Math.round(((vitorias * 3 + empates) / (jogos * 3)) * 100) : 0;
      const forma = recentMatches.slice(0, 5).map((m) => m.resultado);
      const mainLiga = (recentRaw?.[0] as any)?.liga || null;

      const upcomingMatches: TeamPillarData["upcomingMatches"] = (upcomingRaw || []).map(
        (m: any) => {
          const isHome = m.time_casa_id === team.id;
          return {
            id: m.id,
            data: m.data,
            adversario: (isHome ? m.time_fora : m.time_casa)?.nome || "Adversário",
            local: isHome ? "casa" : "fora",
          };
        }
      );

      return {
        status: "found",
        team: {
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
            jogosCasa,
            vitoriasCasa,
            jogosFora,
            vitoriasFora,
          },
          liga: mainLiga ? { id: mainLiga.id, nome: mainLiga.nome } : null,
          recentMatches: recentMatches.slice(0, 10),
          upcomingMatches,
        },
      };
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
    retry: 1,
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
        .limit(20);
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

export interface TeamTitle {
  id: string;
  competition_name: string;
  competition_tier: "estadual" | "regional" | "nacional" | "continental" | "mundial" | "amistoso" | "outro";
  edition_year: number | null;
  position: string;
  confederation: string | null;
  source_url: string | null;
}

export interface TeamParticipation {
  id: string;
  competition_name: string;
  competition_tier: TeamTitle["competition_tier"];
  year_from: number | null;
  year_to: number | null;
  total_editions: number | null;
  notes: string | null;
}

export interface TeamProfileMeta {
  history_text: string | null;
  stadium_text: string | null;
  culture_text: string | null;
  rivalries_text: string | null;
  legacy_text: string | null;
  founded_year: number | null;
  stadium_name: string | null;
  stadium_capacity: number | null;
  mascot: string | null;
  nickname: string | null;
  anthem_url: string | null;
}

export function useTeamCurriculum(teamId: string | null) {
  return useQuery({
    queryKey: ["team-curriculum", teamId],
    queryFn: async () => {
      if (!teamId) return { titles: [], participations: [], profile: null };
      const [titlesRes, partsRes, profileRes] = await Promise.all([
        supabase
          .from("team_titles" as any)
          .select("id, competition_name, competition_tier, edition_year, position, confederation, source_url")
          .eq("team_id", teamId)
          .order("edition_year", { ascending: false }),
        supabase
          .from("team_participations" as any)
          .select("id, competition_name, competition_tier, year_from, year_to, total_editions, notes")
          .eq("team_id", teamId)
          .order("competition_tier", { ascending: true }),
        supabase
          .from("team_profiles" as any)
          .select("history_text, stadium_text, culture_text, rivalries_text, legacy_text, founded_year, stadium_name, stadium_capacity, mascot, nickname, anthem_url")
          .eq("team_id", teamId)
          .maybeSingle(),
      ]);
      return {
        titles: (titlesRes.data || []) as unknown as TeamTitle[],
        participations: (partsRes.data || []) as unknown as TeamParticipation[],
        profile: (profileRes.data || null) as unknown as TeamProfileMeta | null,
      };
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 10,
  });
}
