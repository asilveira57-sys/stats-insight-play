import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

export interface Artilheiro {
  id: string;
  jogador_nome: string;
  jogador_slug: string;
  gols: number;
  partidas_com_gol: number;
  time_id: string | null;
  competicao_id: string | null;
  temporada: string | null;
  time?: {
    id: string;
    nome: string;
    short_code: string | null;
    cores: { primary?: string; secondary?: string } | null;
  };
  competicao?: {
    id: string;
    nome: string;
  };
}

export interface UseArtilhariaOptions {
  competicaoId?: string | null;
  temporada?: string | null;
  tipo?: 'geral' | 'temporada' | 'campeonato';
}

export function useArtilharia(options: UseArtilhariaOptions = {}) {
  const { competicaoId, temporada, tipo = 'geral' } = options;

  // Fetch aggregated scorers
  const { data: artilheiros, isLoading, error } = useQuery({
    queryKey: ['artilharia', competicaoId, temporada, tipo],
    queryFn: async () => {
      // Build query based on filter type
      let query = supabase
        .from('artilharia_agregada')
        .select(`
          id,
          jogador_nome,
          jogador_slug,
          gols,
          partidas_com_gol,
          time_id,
          competicao_id,
          temporada
        `)
        .order('gols', { ascending: false });

      if (tipo === 'geral') {
        // Global ranking: competicao_id IS NULL and temporada IS NULL
        query = query.is('competicao_id', null).is('temporada', null);
      } else if (tipo === 'temporada' && temporada) {
        // By season: competicao_id IS NULL and temporada = selected
        query = query.is('competicao_id', null).eq('temporada', temporada);
      } else if (tipo === 'campeonato' && competicaoId) {
        // By competition: competicao_id = selected
        query = query.eq('competicao_id', competicaoId);
        if (temporada) {
          query = query.eq('temporada', temporada);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Artilheiro[];
    },
  });

  // Fetch teams for the scorers
  const teamIds = [...new Set(artilheiros?.map(a => a.time_id).filter(Boolean) || [])];
  
  const { data: times } = useQuery({
    queryKey: ['artilharia-times', teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return new Map();

      const { data, error } = await supabase
        .from('times')
        .select('id, nome, short_code, cores')
        .in('id', teamIds as string[]);

      if (error) throw error;

      const map = new Map();
      data?.forEach(t => map.set(t.id, t));
      return map;
    },
    enabled: teamIds.length > 0,
  });

  // Fetch available years
  const { data: temporadas } = useQuery({
    queryKey: ['artilharia-temporadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artilharia_agregada')
        .select('temporada')
        .not('temporada', 'is', null);

      if (error) throw error;

      const years = [...new Set(data?.map(d => d.temporada).filter(Boolean))] as string[];
      return years.sort((a, b) => Number(b) - Number(a));
    },
  });

  // Fetch available competitions
  const { data: competicoes } = useQuery({
    queryKey: ['artilharia-competicoes'],
    queryFn: async () => {
      const data = await fetchAllRecords<{ id: string; nome: string }>(
        'ligas',
        'id, nome',
        (query) => query.eq('ativa', true),
        { column: 'nome', ascending: true }
      );
      return data;
    },
  });

  // Enrich scorers with team data
  const artilheirosEnriquecidos = artilheiros?.map(a => ({
    ...a,
    time: a.time_id ? times?.get(a.time_id) : undefined,
  })) || [];

  return {
    artilheiros: artilheirosEnriquecidos,
    temporadas: temporadas || [],
    competicoes: competicoes || [],
    isLoading,
    error,
  };
}
