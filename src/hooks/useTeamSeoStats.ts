import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

export interface SeoTeamStats {
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
  mediaGolsMarcados: number;
  mediaGolsSofridos: number;
  saldo: number;
  aproveitamento: number;
  over25: number;
  btts: number;
  cleanSheets: number;
  semMarcar: number;
  casaJogos: number;
  casaVitorias: number;
  casaGolsMarcados: number;
  casaGolsSofridos: number;
  foraJogos: number;
  foraVitorias: number;
  foraGolsMarcados: number;
  foraGolsSofridos: number;
  forma: string[];
  ultimosJogos: Array<{
    id: string;
    data: string;
    adversario: string;
    placar: string;
    resultado: "V" | "E" | "D";
    local: "casa" | "fora";
  }>;
}

export interface SeoTeamData {
  team: { id: string; nome: string; slug: string; cores: any; pais: string | null };
  league: { id: string; nome: string; slug: string; pais: string | null } | null;
  availableSeasons: number[];
  availableLeagues: Array<{ id: string; nome: string; slug: string }>;
  season: number;
  stats: SeoTeamStats;
}

export function useTeamSeoStats(
  teamSlug: string | null,
  leagueSlug: string | null,
  season: number | null,
) {
  return useQuery({
    queryKey: ["team-seo-stats", teamSlug, leagueSlug, season],
    enabled: !!teamSlug,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<SeoTeamData | null> => {
      if (!teamSlug) return null;

      const { data: team } = await supabase
        .from("times")
        .select("id, nome, slug, cores, pais")
        .eq("slug", teamSlug)
        .maybeSingle();
      if (!team) return null;

      // Resolve league
      let league: SeoTeamData["league"] = null;
      if (leagueSlug) {
        const { data: lg } = await supabase
          .from("ligas")
          .select("id, nome, slug, pais")
          .eq("slug", leagueSlug)
          .maybeSingle();
        if (lg) league = lg;
      }

      // Fetch all matches involving the team
      let homeQuery = (q: any) =>
        q.eq("time_casa_id", team.id).eq("status", "finished");
      let awayQuery = (q: any) =>
        q.eq("time_fora_id", team.id).eq("status", "finished");
      if (league) {
        const lid = league.id;
        homeQuery = (q: any) =>
          q.eq("time_casa_id", team.id).eq("status", "finished").eq("liga_id", lid);
        awayQuery = (q: any) =>
          q.eq("time_fora_id", team.id).eq("status", "finished").eq("liga_id", lid);
      }

      const homeMatches = await fetchAllRecords<any>(
        "partidas",
        `id, data, gols_casa, gols_fora, liga_id,
          time_fora:times!partidas_time_fora_id_fkey(id, nome, slug),
          liga:ligas(id, nome, slug)`,
        homeQuery,
        { column: "data", ascending: false },
      );
      const awayMatches = await fetchAllRecords<any>(
        "partidas",
        `id, data, gols_casa, gols_fora, liga_id,
          time_casa:times!partidas_time_casa_id_fkey(id, nome, slug),
          liga:ligas(id, nome, slug)`,
        awayQuery,
        { column: "data", ascending: false },
      );

      const allMatches = [
        ...homeMatches.map((m: any) => ({ ...m, _local: "casa" as const })),
        ...awayMatches.map((m: any) => ({ ...m, _local: "fora" as const })),
      ];

      // Available seasons
      const seasonsSet = new Set<number>();
      allMatches.forEach((m: any) => seasonsSet.add(new Date(m.data).getFullYear()));
      const availableSeasons = Array.from(seasonsSet).sort((a, b) => b - a);

      // Available leagues
      const leaguesMap = new Map<string, { id: string; nome: string; slug: string }>();
      allMatches.forEach((m: any) => {
        if (m.liga?.id) leaguesMap.set(m.liga.id, m.liga);
      });
      const availableLeagues = Array.from(leaguesMap.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome),
      );

      const targetSeason = season ?? availableSeasons[0] ?? new Date().getFullYear();

      // Filter by season
      const seasonMatches = allMatches.filter(
        (m: any) => new Date(m.data).getFullYear() === targetSeason,
      );

      let v = 0, e = 0, d = 0, gm = 0, gs = 0;
      let casaJ = 0, casaV = 0, casaGM = 0, casaGS = 0;
      let foraJ = 0, foraV = 0, foraGM = 0, foraGS = 0;
      let over25 = 0, btts = 0, clean = 0, semMarcar = 0;

      const processed = seasonMatches.map((m: any) => {
        const isHome = m._local === "casa";
        const gc = m.gols_casa ?? 0;
        const gf = m.gols_fora ?? 0;
        const myGoals = isHome ? gc : gf;
        const oppGoals = isHome ? gf : gc;
        const total = gc + gf;
        gm += myGoals;
        gs += oppGoals;
        if (total > 2) over25++;
        if (gc > 0 && gf > 0) btts++;
        if (oppGoals === 0) clean++;
        if (myGoals === 0) semMarcar++;

        let resultado: "V" | "E" | "D";
        if (myGoals > oppGoals) {
          v++;
          resultado = "V";
          if (isHome) casaV++;
          else foraV++;
        } else if (myGoals === oppGoals) {
          e++;
          resultado = "E";
        } else {
          d++;
          resultado = "D";
        }

        if (isHome) {
          casaJ++;
          casaGM += myGoals;
          casaGS += oppGoals;
        } else {
          foraJ++;
          foraGM += myGoals;
          foraGS += oppGoals;
        }

        return {
          id: m.id,
          data: m.data,
          adversario: isHome ? m.time_fora?.nome : m.time_casa?.nome,
          placar: isHome ? `${gc} x ${gf}` : `${gc} x ${gf}`,
          resultado,
          local: m._local,
        };
      });

      processed.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const jogos = processed.length;
      const stats: SeoTeamStats = {
        jogos,
        vitorias: v,
        empates: e,
        derrotas: d,
        golsMarcados: gm,
        golsSofridos: gs,
        mediaGolsMarcados: jogos ? gm / jogos : 0,
        mediaGolsSofridos: jogos ? gs / jogos : 0,
        saldo: gm - gs,
        aproveitamento: jogos ? Math.round(((v * 3 + e) / (jogos * 3)) * 100) : 0,
        over25: jogos ? Math.round((over25 / jogos) * 100) : 0,
        btts: jogos ? Math.round((btts / jogos) * 100) : 0,
        cleanSheets: clean,
        semMarcar,
        casaJogos: casaJ,
        casaVitorias: casaV,
        casaGolsMarcados: casaGM,
        casaGolsSofridos: casaGS,
        foraJogos: foraJ,
        foraVitorias: foraV,
        foraGolsMarcados: foraGM,
        foraGolsSofridos: foraGS,
        forma: processed.slice(0, 5).map((p) => p.resultado),
        ultimosJogos: processed.slice(0, 10),
      };

      return {
        team,
        league,
        availableSeasons,
        availableLeagues,
        season: targetSeason,
        stats,
      };
    },
  });
}

export function useTeamSeoContent(
  teamId: string | null,
  leagueId: string | null,
  season: number | null,
) {
  return useQuery({
    queryKey: ["team-seo-content", teamId, leagueId, season],
    enabled: !!teamId && !!season,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      if (!teamId || !season) return null;
      let q = supabase
        .from("team_seo_content")
        .select("*")
        .eq("team_id", teamId)
        .eq("season", season);
      q = leagueId ? q.eq("league_id", leagueId) : q.is("league_id", null);
      const { data } = await q.maybeSingle();
      return data;
    },
  });
}
