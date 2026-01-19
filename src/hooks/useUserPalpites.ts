import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserPalpite {
  id: string;
  user_id: string;
  partida_id: string;
  palpite_sistema_id: string | null;
  aceitou_sugestao: boolean;
  placar_casa: number;
  placar_fora: number;
  created_at: string;
  updated_at: string;
}

interface TeamData {
  nome: string;
  escudo_url: string | null;
  cores: { primary?: string; secondary?: string } | null;
}

interface UserPalpiteWithMatch extends UserPalpite {
  partida: {
    id: string;
    data: string;
    hora: string | null;
    status: string;
    gols_casa: number | null;
    gols_fora: number | null;
    time_casa: TeamData | null;
    time_fora: TeamData | null;
    liga: { nome: string; logo_url: string | null } | null;
  };
  palpite_sistema: {
    placar_casa_estimado: number | null;
    placar_fora_estimado: number | null;
    prob_casa: number | null;
    prob_empate: number | null;
    prob_fora: number | null;
  } | null;
}

interface ComparativoResultado {
  id: string;
  partida_id: string;
  placar_oficial_casa: number;
  placar_oficial_fora: number;
  resultado_oficial: string;
  sistema_acertou_resultado: boolean;
  sistema_acertou_placar: boolean;
}

export function useUserPalpites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-palpites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('palpites_usuarios')
        .select(`
          *,
          partida:partidas(
            id, data, hora, status, gols_casa, gols_fora,
            time_casa:times!partidas_time_casa_id_fkey(nome, escudo_url, cores),
            time_fora:times!partidas_time_fora_id_fkey(nome, escudo_url, cores),
            liga:ligas(nome, logo_url)
          ),
          palpite_sistema:palpites(
            placar_casa_estimado, placar_fora_estimado,
            prob_casa, prob_empate, prob_fora
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as UserPalpiteWithMatch[];
    },
    enabled: !!user,
  });
}

export function useUserPalpiteForMatch(partidaId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-palpite', user?.id, partidaId],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('palpites_usuarios')
        .select('*')
        .eq('user_id', user.id)
        .eq('partida_id', partidaId)
        .maybeSingle();

      if (error) throw error;
      return data as UserPalpite | null;
    },
    enabled: !!user && !!partidaId,
  });
}

export function useCreateUserPalpite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      partidaId,
      placarCasa,
      placarFora,
      palpiteSistemaId,
      aceitouSugestao,
    }: {
      partidaId: string;
      placarCasa: number;
      placarFora: number;
      palpiteSistemaId?: string;
      aceitouSugestao?: boolean;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('palpites_usuarios')
        .upsert({
          user_id: user.id,
          partida_id: partidaId,
          placar_casa: placarCasa,
          placar_fora: placarFora,
          palpite_sistema_id: palpiteSistemaId || null,
          aceitou_sugestao: aceitouSugestao || false,
        }, {
          onConflict: 'user_id,partida_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-palpites'] });
      queryClient.invalidateQueries({ queryKey: ['user-palpite'] });
    },
  });
}

export function useUserAccuracyStats(startDate?: string, endDate?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-accuracy-stats', user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return null;

      // Get user's predictions for finished matches
      const { data: userPalpites, error: palpitesError } = await supabase
        .from('palpites_usuarios')
        .select(`
          id, placar_casa, placar_fora, aceitou_sugestao,
          partida:partidas!inner(
            id, status, gols_casa, gols_fora, data
          )
        `)
        .eq('user_id', user.id);

      if (palpitesError) throw palpitesError;

      // Filter by finished and date range
      const finishedPalpites = (userPalpites || []).filter((p: any) => {
        if (p.partida?.status !== 'finished') return false;
        const matchDate = p.partida?.data;
        if (startDate && matchDate < startDate) return false;
        if (endDate && matchDate > endDate) return false;
        return true;
      });

      let totalPalpites = finishedPalpites.length;
      let acertosResultado = 0;
      let acertosPlacar = 0;
      let palpitesComIA = 0;
      let acertosComIA = 0;

      for (const palpite of finishedPalpites as any[]) {
        const match = palpite.partida;
        if (!match || match.gols_casa === null || match.gols_fora === null) continue;

        const userResultado = palpite.placar_casa > palpite.placar_fora ? 'casa' 
          : palpite.placar_casa < palpite.placar_fora ? 'fora' : 'empate';
        
        const officialResultado = match.gols_casa > match.gols_fora ? 'casa'
          : match.gols_casa < match.gols_fora ? 'fora' : 'empate';

        if (userResultado === officialResultado) {
          acertosResultado++;
        }

        if (palpite.placar_casa === match.gols_casa && palpite.placar_fora === match.gols_fora) {
          acertosPlacar++;
        }

        if (palpite.aceitou_sugestao) {
          palpitesComIA++;
          if (userResultado === officialResultado) {
            acertosComIA++;
          }
        }
      }

      return {
        totalPalpites,
        acertosResultado,
        acertosPlacar,
        percentualResultado: totalPalpites > 0 ? (acertosResultado / totalPalpites) * 100 : 0,
        percentualPlacar: totalPalpites > 0 ? (acertosPlacar / totalPalpites) * 100 : 0,
        palpitesComIA,
        acertosComIA,
        percentualIA: palpitesComIA > 0 ? (acertosComIA / palpitesComIA) * 100 : 0,
      };
    },
    enabled: !!user,
  });
}

export function useSystemAccuracyStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['system-accuracy-stats', startDate, endDate],
    queryFn: async () => {
      // Fetch ALL records without the default 1000 limit using pagination
      const allRecords: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('comparativo_resultados')
          .select('*, partida:partidas(data)')
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allRecords.push(...data);
          offset += batchSize;
          if (data.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      // Filter by date range if provided
      let results = allRecords;
      if (startDate || endDate) {
        results = results.filter((r: any) => {
          const matchDate = r.partida?.data;
          if (!matchDate) return true;
          if (startDate && matchDate < startDate) return false;
          if (endDate && matchDate > endDate) return false;
          return true;
        });
      }

      const total = results.length;
      const acertosResultado = results.filter(r => r.sistema_acertou_resultado).length;
      const acertosPlacar = results.filter(r => r.sistema_acertou_placar).length;

      return {
        total,
        acertosResultado,
        acertosPlacar,
        percentualResultado: total > 0 ? (acertosResultado / total) * 100 : 0,
        percentualPlacar: total > 0 ? (acertosPlacar / total) * 100 : 0,
      };
    },
  });
}
