import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";
import { computeAuditMetrics } from "@/lib/auditMetrics";
import { resultHit, scoreHit, type BRMatch, type BRPalpite, type BRTeam } from "@/hooks/useBrasileirao";

export const COPA_BRASIL_SLUG = "copa-do-brasil";
export const COPA_BRASIL_SEASON = 2026;

/** Temporada selecionada via ?temporada=YYYY (default: temporada corrente). */
export function useCopaBrasilSeason(): [number, (y: number) => void] {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get("temporada"));
  const season = Number.isFinite(raw) && raw > 1950 && raw < 2100 ? raw : COPA_BRASIL_SEASON;
  const setSeason = (y: number) => {
    const next = new URLSearchParams(params);
    if (y === COPA_BRASIL_SEASON) next.delete("temporada");
    else next.set("temporada", String(y));
    setParams(next, { replace: false });
  };
  return [season, setSeason];
}

export function useCopaBrasilLeague() {
  return useQuery({
    queryKey: ["copa-brasil", "league"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ligas")
        .select("id, nome, slug, pais, logo_url, pillar_content")
        .eq("slug", COPA_BRASIL_SLUG)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Anos disponíveis (derivados da primeira e última partida no banco). */
export function useCopaBrasilSeasons() {
  const { data: league } = useCopaBrasilLeague();
  return useQuery({
    enabled: !!league?.id,
    queryKey: ["copa-brasil", "seasons", league?.id],
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<number[]> => {
      const base = () => supabase.from("partidas").select("data").eq("liga_id", league!.id);
      const [{ data: first }, { data: last }] = await Promise.all([
        base().order("data", { ascending: true }).limit(1),
        base().order("data", { ascending: false }).limit(1),
      ]);
      const y0 = first?.[0]?.data ? new Date(first[0].data).getUTCFullYear() : COPA_BRASIL_SEASON;
      const y1 = last?.[0]?.data ? new Date(last[0].data).getUTCFullYear() : COPA_BRASIL_SEASON;
      const years: number[] = [];
      for (let y = Math.max(y1, COPA_BRASIL_SEASON); y >= y0; y--) years.push(y);
      return years;
    },
  });
}

const MATCH_SELECT = `
  id, slug, data, hora, status, rodada, gols_casa, gols_fora,
  time_casa:times!partidas_time_casa_id_fkey(id, nome, slug, cores, escudo_url),
  time_fora:times!partidas_time_fora_id_fkey(id, nome, slug, cores, escudo_url)
`;

export function useCopaBrasilSeasonMatches(season: number = COPA_BRASIL_SEASON) {
  const { data: league } = useCopaBrasilLeague();
  return useQuery({
    enabled: !!league?.id,
    queryKey: ["copa-brasil", "season-matches", league?.id, season],
    staleTime: 1000 * 60,
    queryFn: async (): Promise<BRMatch[]> => {
      const from = `${season}-01-01`;
      const to = `${season + 1}-01-01`;
      const rows = await fetchAllRecords<any>(
        "partidas",
        MATCH_SELECT,
        (q) => q.eq("liga_id", league!.id).gte("data", from).lt("data", to),
        { column: "data", ascending: true }
      );

      const ids = rows.map((r) => r.id);
      const palpiteMap = new Map<string, BRPalpite>();
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        if (!chunk.length) continue;
        const { data: palps } = await supabase
          .from("palpites")
          .select("partida_id, prob_casa, prob_empate, prob_fora, placar_casa_estimado, placar_fora_estimado, confianca, analise")
          .in("partida_id", chunk);
        (palps ?? []).forEach((p: any) => {
          if (!palpiteMap.has(p.partida_id)) palpiteMap.set(p.partida_id, p);
        });
      }

      return rows.map((r) => ({ ...r, palpite: palpiteMap.get(r.id) ?? null })) as BRMatch[];
    },
  });
}

const startOfDaySP = () => {
  const now = new Date();
  const sp = new Date(now.getTime() - 3 * 3600 * 1000);
  const y = sp.getUTCFullYear();
  const m = String(sp.getUTCMonth() + 1).padStart(2, "0");
  const d = String(sp.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function useCopaBrasilOverview(season: number = COPA_BRASIL_SEASON) {
  const q = useCopaBrasilSeasonMatches(season);
  const matches = q.data ?? [];
  const today = startOfDaySP();
  const now = Date.now();
  const dayKey = (m: BRMatch) => (m.data ?? "").slice(0, 10);

  const live = matches.filter((m) => m.status === "live");
  const todayMatches = matches.filter((m) => dayKey(m) === today);
  const nextMatches = matches
    .filter((m) => m.status === "scheduled" && new Date(m.data).getTime() >= now - 12 * 3600 * 1000)
    .slice(0, 8);
  const lastResults = matches
    .filter((m) => m.status === "finished")
    .slice()
    .reverse()
    .slice(0, 9);

  const finishedWithPalpite = matches.filter(
    (m) => m.status === "finished" && m.palpite && m.gols_casa != null && m.gols_fora != null
  );

  const audit = computeAuditMetrics(
    finishedWithPalpite.map((m) => ({
      predHome: m.palpite!.placar_casa_estimado,
      predAway: m.palpite!.placar_fora_estimado,
      realHome: m.gols_casa,
      realAway: m.gols_fora,
      probHome: m.palpite!.prob_casa,
      probDraw: m.palpite!.prob_empate,
      probAway: m.palpite!.prob_fora,
    }))
  );

  const fases = Array.from(
    new Set(matches.map((m) => m.rodada).filter((r): r is number => r != null))
  ).sort((a, b) => a - b);

  const clubes = new Set<string>();
  matches.forEach((m) => {
    if (m.time_casa) clubes.add(m.time_casa.id);
    if (m.time_fora) clubes.add(m.time_fora.id);
  });

  return {
    ...q,
    live,
    todayMatches,
    nextMatches,
    lastResults,
    matches,
    fases,
    totalClubes: clubes.size,
    audit,
    ia: {
      total: finishedWithPalpite.length,
      hitResult: finishedWithPalpite.filter((m) => resultHit(m)).length,
      hitScore: finishedWithPalpite.filter((m) => scoreHit(m)).length,
    },
  };
}

export type CBScorer = {
  jogador: string;
  gols: number;
  penaltis: number;
  time: BRTeam | null;
};

export function useCopaBrasilArtilharia(season: number = COPA_BRASIL_SEASON) {
  const { data: matches } = useCopaBrasilSeasonMatches(season);
  const ids = (matches ?? []).map((m) => m.id);
  const teamById = new Map<string, BRTeam>();
  (matches ?? []).forEach((m) => {
    if (m.time_casa) teamById.set(m.time_casa.id, m.time_casa);
    if (m.time_fora) teamById.set(m.time_fora.id, m.time_fora);
  });

  return useQuery({
    enabled: ids.length > 0,
    queryKey: ["copa-brasil", "artilharia", season, ids.length],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<CBScorer[]> => {
      const rows: any[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { data } = await supabase
          .from("gols_partida")
          .select("jogador_nome, tipo, time_id")
          .in("partida_id", chunk);
        rows.push(...(data ?? []));
      }
      const agg = new Map<string, CBScorer>();
      rows.forEach((g) => {
        const nome = (g.jogador_nome ?? "").trim();
        if (!nome) return;
        if (/own\s*goal|contra/i.test(g.tipo ?? "")) return;
        const key = `${g.time_id}::${nome.toLowerCase()}`;
        const cur = agg.get(key) ?? { jogador: nome, gols: 0, penaltis: 0, time: teamById.get(g.time_id) ?? null };
        cur.gols++;
        if (/penal/i.test(g.tipo ?? "")) cur.penaltis++;
        agg.set(key, cur);
      });
      return Array.from(agg.values()).sort(
        (a, b) => b.gols - a.gols || a.jogador.localeCompare(b.jogador)
      );
    },
  });
}

/** Atualização automática ao vivo das partidas da Copa do Brasil. */
export function useCopaBrasilRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: ["copa-brasil"] });
    const ch = supabase
      .channel("copa-brasil-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "partidas" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "palpites" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}
