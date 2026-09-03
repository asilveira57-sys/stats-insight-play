import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

export interface ArtilhariaRow {
  id: string;
  jogador_nome: string;
  jogador_slug: string;
  gols: number;
  partidas_com_gol: number;
  time_id: string | null;
  competicao_id: string | null;
  temporada: string | null;
  ligas?: { id: string; nome: string; pais: string | null } | null;
  time?: {
    id: string;
    nome: string;
    short_code: string | null;
    cores: { primary?: string; secondary?: string } | null;
  };
}

export interface CompeticaoOption {
  id: string;
  nome: string;
  pais: string | null;
  temporadas: string[];
}

const EUROPEAN_COUNTRIES = new Set([
  "England", "Spain", "Italy", "Germany", "France", "Portugal", "Netherlands", "Belgium",
  "Scotland", "Turkey", "Russia", "Ukraine", "Austria", "Switzerland", "Greece", "Denmark",
  "Sweden", "Norway", "Poland", "Czech-Republic", "Czech Republic", "Croatia", "Serbia",
  "Romania", "Hungary", "Bulgaria", "Slovakia", "Slovenia", "Ireland", "Wales", "Finland",
  "Iceland", "Bosnia", "Bosnia and Herzegovina", "Albania", "Andorra", "Armenia", "Azerbaijan",
  "Belarus", "Cyprus", "Estonia", "Faroe-Islands", "Georgia", "Gibraltar", "Israel", "Kosovo",
  "Latvia", "Lithuania", "Luxembourg", "Malta", "Moldova", "Montenegro", "North-Macedonia",
  "Macedonia", "San-Marino", "Europe",
]);

const SOUTH_AMERICAN_COUNTRIES = new Set([
  "Brazil", "Brasil", "Argentina", "Uruguay", "Chile", "Colombia", "Paraguay", "Peru",
  "Bolivia", "Ecuador", "Venezuela", "South-America", "World",
]);

export type RegiaoFiltro = "todos" | "brasil" | "america-do-sul" | "europa" | "outros";

export function regiaoDaLiga(pais: string | null | undefined): RegiaoFiltro {
  if (!pais) return "outros";
  if (pais === "Brazil" || pais === "Brasil") return "brasil";
  if (EUROPEAN_COUNTRIES.has(pais)) return "europa";
  if (SOUTH_AMERICAN_COUNTRIES.has(pais)) return "america-do-sul";
  return "outros";
}

async function fetchTimes(ids: string[]) {
  const map = new Map<string, ArtilhariaRow["time"]>();
  const CHUNK = 150;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("times")
      .select("id, nome, short_code, cores")
      .in("id", slice);
    if (error) throw error;
    data?.forEach((t) => map.set(t.id, t as any));
  }
  return map;
}

/**
 * Loads every per-competition scorer aggregate (competicao_id NOT NULL) with the
 * competition metadata needed for region/season filtering on the page.
 */
export function useArtilharia() {
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["artilharia-competition-rows"],
    queryFn: async () => {
      const data = await fetchAllRecords<ArtilhariaRow>(
        "artilharia_agregada",
        `id, jogador_nome, jogador_slug, gols, partidas_com_gol, time_id, competicao_id, temporada,
         ligas:competicao_id (id, nome, pais)`,
        (query) => query.not("competicao_id", "is", null),
        { column: "gols", ascending: false }
      );
      return data;
    },
  });

  const teamIds = [...new Set((rows ?? []).map((r) => r.time_id).filter(Boolean))] as string[];

  const { data: times } = useQuery({
    queryKey: ["artilharia-times", teamIds.length],
    queryFn: () => fetchTimes(teamIds),
    enabled: teamIds.length > 0,
  });

  const enriched: ArtilhariaRow[] = (rows ?? []).map((r) => ({
    ...r,
    time: r.time_id ? times?.get(r.time_id) : undefined,
  }));

  // Build competition catalog from data that actually exists
  const competicoesMap = new Map<string, CompeticaoOption & { seasons: Set<string> }>();
  const temporadasSet = new Set<string>();

  for (const r of rows ?? []) {
    if (r.temporada) temporadasSet.add(r.temporada);
    if (!r.competicao_id) continue;
    const nome = r.ligas?.nome ?? "Competição";
    if (!competicoesMap.has(r.competicao_id)) {
      competicoesMap.set(r.competicao_id, {
        id: r.competicao_id,
        nome,
        pais: r.ligas?.pais ?? null,
        temporadas: [],
        seasons: new Set<string>(),
      });
    }
    if (r.temporada) competicoesMap.get(r.competicao_id)!.seasons.add(r.temporada);
  }

  const competicoes: CompeticaoOption[] = [...competicoesMap.values()]
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      pais: c.pais,
      temporadas: [...c.seasons].sort((a, b) => Number(b) - Number(a)),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const temporadas = [...temporadasSet].sort((a, b) => Number(b) - Number(a));

  return { rows: enriched, competicoes, temporadas, isLoading, error };
}
