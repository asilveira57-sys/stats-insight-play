import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentSeasonStart } from "./locales";

export type IntlTeam = { id: string; nome: string; slug: string | null };
export type IntlMatch = {
  id: string;
  slug: string | null;
  data: string;
  hora: string | null;
  status: string;
  gols_casa: number | null;
  gols_fora: number | null;
  rodada: number | null;
  liga_id: string;
  casa: IntlTeam | null;
  fora: IntlTeam | null;
};

const SELECT =
  "id, slug, data, hora, status, gols_casa, gols_fora, rodada, liga_id, casa:times!partidas_time_casa_id_fkey(id, nome, slug), fora:times!partidas_time_fora_id_fkey(id, nome, slug)";

export function seasonWindow(start = currentSeasonStart()) {
  return { from: `${start}-07-01`, to: `${start + 1}-06-30`, label: `${start}/${String(start + 1).slice(2)}` };
}

/** Jogos da temporada corrente de um campeonato */
export function useSeasonMatches(ligaId?: string) {
  const w = seasonWindow();
  return useQuery({
    enabled: !!ligaId,
    queryKey: ["intl", "season", ligaId, w.from],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partidas")
        .select(SELECT)
        .eq("liga_id", ligaId!)
        .gte("data", w.from)
        .lte("data", w.to)
        .order("data", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as IntlMatch[];
    },
  });
}

export function useMatchBySlug(slug?: string) {
  return useQuery({
    enabled: !!slug,
    queryKey: ["intl", "match", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("partidas").select(SELECT).eq("slug", slug!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as IntlMatch | null;
    },
  });
}

/** Histórico do confronto e últimos jogos de cada time antes da data do jogo (consultas leves, por índice) */
export function useMatchContext(m?: IntlMatch | null) {
  return useQuery({
    enabled: !!m?.casa?.id && !!m?.fora?.id,
    queryKey: ["intl", "context", m?.id],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const a = m!.casa!.id;
      const b = m!.fora!.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- builder do supabase-js
      const before = (q: any) =>
        q.lt("data", m!.data).not("gols_casa", "is", null).not("gols_fora", "is", null).order("data", { ascending: false });
      const pair = (h: string, f: string) =>
        before(supabase.from("partidas").select(SELECT).eq("time_casa_id", h).eq("time_fora_id", f)).limit(200);
      const side = (col: "time_casa_id" | "time_fora_id", t: string) =>
        before(supabase.from("partidas").select(SELECT).eq(col, t)).limit(5);
      const [ab, ba, ah, aa, bh, ba2] = await Promise.all([
        pair(a, b),
        pair(b, a),
        side("time_casa_id", a),
        side("time_fora_id", a),
        side("time_casa_id", b),
        side("time_fora_id", b),
      ]);
      const sortDesc = (x: IntlMatch[]) => x.sort((p, q) => (p.data < q.data ? 1 : -1));
      const h2h = sortDesc([...(ab.data ?? []), ...(ba.data ?? [])] as IntlMatch[]);
      const formA = sortDesc([...(ah.data ?? []), ...(aa.data ?? [])] as IntlMatch[]).slice(0, 5);
      const formB = sortDesc([...(bh.data ?? []), ...(ba2.data ?? [])] as IntlMatch[]).slice(0, 5);
      return { h2h, formA, formB };
    },
  });
}

export type TableRow = {
  team: IntlTeam;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
};

/** Classificação calculada a partir dos resultados (3 pontos por vitória) */
export function buildTable(matches: IntlMatch[]): TableRow[] {
  const rows = new Map<string, TableRow>();
  const get = (t: IntlTeam) => {
    if (!rows.has(t.id)) rows.set(t.id, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
    return rows.get(t.id)!;
  };
  for (const m of matches) {
    if (!m.casa || !m.fora) continue;
    const h = get(m.casa);
    const a = get(m.fora);
    if (m.status !== "finished" || m.gols_casa == null || m.gols_fora == null) continue;
    h.p++; a.p++;
    h.gf += m.gols_casa; h.ga += m.gols_fora;
    a.gf += m.gols_fora; a.ga += m.gols_casa;
    if (m.gols_casa > m.gols_fora) { h.w++; a.l++; h.pts += 3; }
    else if (m.gols_casa < m.gols_fora) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return [...rows.values()].sort(
    (x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || x.team.nome.localeCompare(y.team.nome),
  );
}

/** Data/hora gravadas no horário de Brasília → horário local do visitante */
export function kickOff(m: IntlMatch, localeTag: string) {
  const iso = `${m.data}T${(m.hora ?? "12:00:00").slice(0, 8)}-03:00`;
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat(localeTag, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d),
    time: m.hora ? new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" }).format(d) : null,
  };
}
