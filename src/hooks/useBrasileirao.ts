import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

export const BRASILEIRAO_SLUG = "campeonato-brasileiro-serie-a";
export const BRASILEIRAO_SEASON = 2026;

export type BRTeam = {
  id: string;
  nome: string;
  slug: string | null;
  cores: any;
  escudo_url?: string | null;
};

export type BRMatch = {
  id: string;
  slug: string | null;
  data: string;
  hora: string | null;
  status: string;
  rodada: number | null;
  gols_casa: number | null;
  gols_fora: number | null;
  time_casa: BRTeam | null;
  time_fora: BRTeam | null;
  palpite: BRPalpite | null;
};

export type BRPalpite = {
  prob_casa: number | null;
  prob_empate: number | null;
  prob_fora: number | null;
  placar_casa_estimado: number | null;
  placar_fora_estimado: number | null;
  confianca: number | null;
  analise: string | null;
};

const MATCH_SELECT = `
  id, slug, data, hora, status, rodada, gols_casa, gols_fora,
  time_casa:times!partidas_time_casa_id_fkey(id, nome, slug, cores, escudo_url),
  time_fora:times!partidas_time_fora_id_fkey(id, nome, slug, cores, escudo_url)
`;

export function useBrasileiraoLeague() {
  return useQuery({
    queryKey: ["brasileirao", "league"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ligas")
        .select("id, nome, slug, pais, logo_url, pillar_content")
        .eq("slug", BRASILEIRAO_SLUG)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Todas as partidas da temporada atual com o palpite da IA anexado. */
export function useBrasileiraoSeasonMatches(season: number = BRASILEIRAO_SEASON) {
  const { data: league } = useBrasileiraoLeague();
  return useQuery({
    enabled: !!league?.id,
    queryKey: ["brasileirao", "season-matches", league?.id, season],
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
  // "Hoje" no fuso de São Paulo (UTC-3)
  const now = new Date();
  const sp = new Date(now.getTime() - 3 * 3600 * 1000);
  const y = sp.getUTCFullYear();
  const m = String(sp.getUTCMonth() + 1).padStart(2, "0");
  const d = String(sp.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function useBrasileiraoOverview(season: number = BRASILEIRAO_SEASON) {
  const q = useBrasileiraoSeasonMatches(season);
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
  const hitResult = finishedWithPalpite.filter((m) => resultHit(m)).length;
  const hitScore = finishedWithPalpite.filter((m) => scoreHit(m)).length;

  const rodadas = Array.from(
    new Set(matches.map((m) => m.rodada).filter((r): r is number => r != null))
  ).sort((a, b) => a - b);

  const currentRodada =
    matches.find((m) => m.status !== "finished" && m.rodada != null)?.rodada ??
    rodadas[rodadas.length - 1] ??
    null;

  return {
    ...q,
    live,
    todayMatches,
    nextMatches,
    lastResults,
    matches,
    rodadas,
    currentRodada,
    ia: {
      total: finishedWithPalpite.length,
      hitResult,
      hitScore,
      accResult: finishedWithPalpite.length ? (hitResult / finishedWithPalpite.length) * 100 : 0,
      accScore: finishedWithPalpite.length ? (hitScore / finishedWithPalpite.length) * 100 : 0,
    },
  };
}

export function predictedOutcome(p: BRPalpite | null): "casa" | "empate" | "fora" | null {
  if (!p) return null;
  if (p.placar_casa_estimado != null && p.placar_fora_estimado != null) {
    if (p.placar_casa_estimado > p.placar_fora_estimado) return "casa";
    if (p.placar_casa_estimado < p.placar_fora_estimado) return "fora";
    return "empate";
  }
  const probs = [
    { k: "casa" as const, v: p.prob_casa ?? -1 },
    { k: "empate" as const, v: p.prob_empate ?? -1 },
    { k: "fora" as const, v: p.prob_fora ?? -1 },
  ].sort((a, b) => b.v - a.v);
  return probs[0].v >= 0 ? probs[0].k : null;
}

export function realOutcome(m: BRMatch): "casa" | "empate" | "fora" | null {
  if (m.gols_casa == null || m.gols_fora == null) return null;
  if (m.gols_casa > m.gols_fora) return "casa";
  if (m.gols_casa < m.gols_fora) return "fora";
  return "empate";
}

export function resultHit(m: BRMatch): boolean {
  const p = predictedOutcome(m.palpite);
  const r = realOutcome(m);
  return !!p && !!r && p === r;
}

export function scoreHit(m: BRMatch): boolean {
  const p = m.palpite;
  if (!p || p.placar_casa_estimado == null || p.placar_fora_estimado == null) return false;
  return p.placar_casa_estimado === m.gols_casa && p.placar_fora_estimado === m.gols_fora;
}

export type BRStandingRow = {
  team: BRTeam;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
  pontos: number;
  aproveitamento: number;
  form: Array<"V" | "E" | "D">;
};

export function useBrasileiraoStandings(season: number = BRASILEIRAO_SEASON) {
  const q = useBrasileiraoSeasonMatches(season);
  const matches = (q.data ?? []).filter(
    (m) => m.status === "finished" && m.gols_casa != null && m.gols_fora != null
  );

  const map = new Map<string, BRStandingRow>();
  const ensure = (t: BRTeam) => {
    if (!map.has(t.id)) {
      map.set(t.id, {
        team: t,
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        golsPro: 0,
        golsContra: 0,
        saldo: 0,
        pontos: 0,
        aproveitamento: 0,
        form: [],
      });
    }
    return map.get(t.id)!;
  };

  matches.forEach((m) => {
    if (!m.time_casa || !m.time_fora) return;
    const home = ensure(m.time_casa);
    const away = ensure(m.time_fora);
    const gc = m.gols_casa!;
    const gf = m.gols_fora!;
    home.jogos++; away.jogos++;
    home.golsPro += gc; home.golsContra += gf;
    away.golsPro += gf; away.golsContra += gc;
    if (gc > gf) {
      home.vitorias++; home.pontos += 3; away.derrotas++;
      home.form.push("V"); away.form.push("D");
    } else if (gc < gf) {
      away.vitorias++; away.pontos += 3; home.derrotas++;
      away.form.push("V"); home.form.push("D");
    } else {
      home.empates++; away.empates++;
      home.pontos++; away.pontos++;
      home.form.push("E"); away.form.push("E");
    }
  });

  const rows = Array.from(map.values()).map((r) => ({
    ...r,
    saldo: r.golsPro - r.golsContra,
    aproveitamento: r.jogos ? (r.pontos / (r.jogos * 3)) * 100 : 0,
    form: r.form.slice(-5),
  }));

  rows.sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.vitorias - a.vitorias ||
      b.saldo - a.saldo ||
      b.golsPro - a.golsPro ||
      a.team.nome.localeCompare(b.team.nome)
  );

  return { ...q, rows };
}

export type BRScorer = {
  jogador: string;
  gols: number;
  penaltis: number;
  time: BRTeam | null;
};

export function useBrasileiraoArtilharia(season: number = BRASILEIRAO_SEASON) {
  const { data: matches } = useBrasileiraoSeasonMatches(season);
  const ids = (matches ?? []).map((m) => m.id);
  const teamById = new Map<string, BRTeam>();
  (matches ?? []).forEach((m) => {
    if (m.time_casa) teamById.set(m.time_casa.id, m.time_casa);
    if (m.time_fora) teamById.set(m.time_fora.id, m.time_fora);
  });

  return useQuery({
    enabled: ids.length > 0,
    queryKey: ["brasileirao", "artilharia", season, ids.length],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<BRScorer[]> => {
      const rows: any[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { data } = await supabase
          .from("gols_partida")
          .select("jogador_nome, tipo, time_id")
          .in("partida_id", chunk);
        rows.push(...(data ?? []));
      }
      const agg = new Map<string, BRScorer>();
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

/** Atualização automática ao vivo das partidas do Brasileirão. */
export function useBrasileiraoRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: ["brasileirao"] });
    const ch = supabase
      .channel("brasileirao-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "partidas" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "palpites" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}
