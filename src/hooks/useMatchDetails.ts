import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Gol {
  id: string;
  partida_id: string;
  time_id: string | null;
  minuto: number;
  acrescimo: number | null;
  tipo: string;
  jogador_nome: string;
  jogador_api_id: number | null;
  assistente_nome: string | null;
  assistente_api_id: number | null;
  placar_casa: number | null;
  placar_fora: number | null;
}

export interface Escalacao {
  id: string;
  partida_id: string;
  time_id: string | null;
  jogador_nome: string;
  jogador_api_id: number | null;
  posicao: string | null;
  numero_camisa: number | null;
  titular: boolean;
  formacao: string | null;
}

export interface Cartao {
  id: string;
  partida_id: string;
  time_id: string | null;
  minuto: number;
  jogador_nome: string;
  jogador_api_id: number | null;
  tipo: string;
}

export interface Tecnico {
  id: string;
  api_id: number | null;
  nome: string;
  nacionalidade: string | null;
}

export interface TecnicoPartida {
  id: string;
  partida_id: string;
  time_id: string | null;
  tecnico_id: string | null;
  tecnicos?: Tecnico;
}

export interface MatchFullDetails {
  gols: Gol[];
  escalacoes: Escalacao[];
  cartoes: Cartao[];
  tecnicos: TecnicoPartida[];
  detalhes_sincronizados: boolean;
}

export function useMatchGoals(matchId: string | null) {
  return useQuery({
    queryKey: ['match-goals', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      
      const { data, error } = await supabase
        .from('gols_partida')
        .select('*')
        .eq('partida_id', matchId)
        .order('minuto', { ascending: true });
      
      if (error) throw error;
      return data as Gol[];
    },
    enabled: !!matchId,
  });
}

export function useMatchLineups(matchId: string | null) {
  return useQuery({
    queryKey: ['match-lineups', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      
      const { data, error } = await supabase
        .from('escalacoes')
        .select('*')
        .eq('partida_id', matchId)
        .order('titular', { ascending: false })
        .order('numero_camisa', { ascending: true });
      
      if (error) throw error;
      return data as Escalacao[];
    },
    enabled: !!matchId,
  });
}

export function useMatchCards(matchId: string | null) {
  return useQuery({
    queryKey: ['match-cards', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      
      const { data, error } = await supabase
        .from('cartoes_partida')
        .select('*')
        .eq('partida_id', matchId)
        .order('minuto', { ascending: true });
      
      if (error) throw error;
      return data as Cartao[];
    },
    enabled: !!matchId,
  });
}

export function useMatchCoaches(matchId: string | null) {
  return useQuery({
    queryKey: ['match-coaches', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      
      const { data, error } = await supabase
        .from('tecnico_partida')
        .select(`
          *,
          tecnicos (*)
        `)
        .eq('partida_id', matchId);
      
      if (error) throw error;
      return data as TecnicoPartida[];
    },
    enabled: !!matchId,
  });
}

export function useMatchFullDetails(matchId: string | null) {
  return useQuery({
    queryKey: ['match-full-details', matchId],
    queryFn: async (): Promise<MatchFullDetails | null> => {
      if (!matchId) return null;
      
      // Check if match has synced details
      const { data: partida } = await supabase
        .from('partidas')
        .select('detalhes_sincronizados')
        .eq('id', matchId)
        .single();
      
      // Fetch all details in parallel
      const [goalsResult, lineupsResult, cardsResult, coachesResult] = await Promise.all([
        supabase
          .from('gols_partida')
          .select('*')
          .eq('partida_id', matchId)
          .order('minuto', { ascending: true }),
        supabase
          .from('escalacoes')
          .select('*')
          .eq('partida_id', matchId)
          .order('titular', { ascending: false })
          .order('numero_camisa', { ascending: true }),
        supabase
          .from('cartoes_partida')
          .select('*')
          .eq('partida_id', matchId)
          .order('minuto', { ascending: true }),
        supabase
          .from('tecnico_partida')
          .select(`*, tecnicos (*)`)
          .eq('partida_id', matchId),
      ]);
      
      return {
        gols: (goalsResult.data as Gol[]) || [],
        escalacoes: (lineupsResult.data as Escalacao[]) || [],
        cartoes: (cardsResult.data as Cartao[]) || [],
        tecnicos: (coachesResult.data as TecnicoPartida[]) || [],
        detalhes_sincronizados: partida?.detalhes_sincronizados || false,
      };
    },
    enabled: !!matchId,
  });
}

export function useSyncMatchDetails() {
  return useQuery({
    queryKey: ['sync-match-details'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-match-details', {
        body: { limit: 5 },
      });
      
      if (error) throw error;
      return data;
    },
    enabled: false, // Manual trigger only
  });
}
