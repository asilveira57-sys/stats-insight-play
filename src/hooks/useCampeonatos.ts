import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

export interface Liga {
  id: string;
  nome: string;
  slug: string | null;
  pais: string | null;
  estado: string | null;
  logo_url: string | null;
  ativa: boolean | null;
  priority_score: number | null;
  tipo_principal: string | null;
  continente: string | null;
  ordem_exibicao: number | null;
}

export type TipoPrincipal = 'ESTADUAL' | 'NACIONAL' | 'COPA' | 'INTERNACIONAL';

export interface CategoriaLigas {
  nome: string;
  icon: string;
  ordem: number;
  ligas: Liga[];
}

// Ordem padrão para Brasil
const ordemCategoriasBrasil: TipoPrincipal[] = ['ESTADUAL', 'NACIONAL', 'COPA', 'INTERNACIONAL'];

const categoriaNomes: Record<TipoPrincipal, string> = {
  'ESTADUAL': 'Estaduais',
  'NACIONAL': 'Nacionais',
  'COPA': 'Copas',
  'INTERNACIONAL': 'Internacionais',
};

const categoriaIcons: Record<TipoPrincipal, string> = {
  'ESTADUAL': 'MapPin',
  'NACIONAL': 'Flag',
  'COPA': 'Trophy',
  'INTERNACIONAL': 'Globe',
};

export function useCampeonatos(searchTerm: string = '') {
  // Fetch all active leagues
  const { data: ligas, isLoading: isLoadingLigas } = useQuery({
    queryKey: ['campeonatos-ligas'],
    queryFn: async () => {
      const data = await fetchAllRecords<Liga>(
        'ligas',
        'id, nome, slug, pais, estado, logo_url, ativa, priority_score, tipo_principal, continente, ordem_exibicao',
        (query) => query.eq('ativa', true),
        { column: 'ordem_exibicao', ascending: true }
      );
      return data;
    },
  });

  // Fetch match counts per league (ALL records)
  const { data: matchCounts } = useQuery({
    queryKey: ['campeonatos-match-counts'],
    queryFn: async () => {
      const data = await fetchAllRecords<{ liga_id: string | null }>(
        'partidas',
        'liga_id'
      );

      const counts = new Map<string, number>();
      data.forEach(match => {
        if (match.liga_id) {
          counts.set(match.liga_id, (counts.get(match.liga_id) || 0) + 1);
        }
      });

      return counts;
    },
  });

  // Fetch team counts per league (ALL records)
  const { data: teamCounts } = useQuery({
    queryKey: ['campeonatos-team-counts'],
    queryFn: async () => {
      const data = await fetchAllRecords<{ liga_id: string | null; time_casa_id: string | null; time_fora_id: string | null }>(
        'partidas',
        'liga_id, time_casa_id, time_fora_id'
      );

      const teamsByLiga = new Map<string, Set<string>>();
      data.forEach(match => {
        if (match.liga_id) {
          if (!teamsByLiga.has(match.liga_id)) {
            teamsByLiga.set(match.liga_id, new Set());
          }
          const teams = teamsByLiga.get(match.liga_id)!;
          if (match.time_casa_id) teams.add(match.time_casa_id);
          if (match.time_fora_id) teams.add(match.time_fora_id);
        }
      });

      const counts = new Map<string, number>();
      teamsByLiga.forEach((teams, ligaId) => {
        counts.set(ligaId, teams.size);
      });

      return counts;
    },
  });

  // Filter and group leagues by category
  const categorias: CategoriaLigas[] = [];

  if (ligas) {
    // Filter by search term
    const filtered = ligas.filter(liga =>
      liga.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (liga.pais?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (liga.estado?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Group by tipo_principal
    const grupos = new Map<TipoPrincipal, Liga[]>();
    
    filtered.forEach(liga => {
      const tipo = (liga.tipo_principal as TipoPrincipal) || 'INTERNACIONAL';
      if (!grupos.has(tipo)) {
        grupos.set(tipo, []);
      }
      grupos.get(tipo)!.push(liga);
    });

    // Create categories in order
    ordemCategoriasBrasil.forEach((tipo, index) => {
      const ligasTipo = grupos.get(tipo);
      if (ligasTipo && ligasTipo.length > 0) {
        categorias.push({
          nome: categoriaNomes[tipo],
          icon: categoriaIcons[tipo],
          ordem: index,
          ligas: ligasTipo.sort((a, b) => 
            (a.ordem_exibicao || 100) - (b.ordem_exibicao || 100)
          ),
        });
      }
    });

    // Add "Outros" for leagues without tipo_principal
    const outros = filtered.filter(l => !l.tipo_principal);
    if (outros.length > 0) {
      categorias.push({
        nome: 'Outros',
        icon: 'Star',
        ordem: 99,
        ligas: outros,
      });
    }
  }

  const getStats = (ligaId: string) => ({
    matches: matchCounts?.get(ligaId) || 0,
    teams: teamCounts?.get(ligaId) || 0,
  });

  return {
    categorias,
    totalLigas: ligas?.length || 0,
    isLoading: isLoadingLigas,
    getStats,
  };
}
