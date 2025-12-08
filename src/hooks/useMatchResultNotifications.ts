import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useMatchResultNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('match-results')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'partidas',
          filter: 'status=eq.finished'
        },
        async (payload) => {
          const match = payload.new as {
            id: string;
            gols_casa: number | null;
            gols_fora: number | null;
            time_casa_id: string;
            time_fora_id: string;
            status: string;
          };

          // Only process if match just finished (was not finished before)
          const oldMatch = payload.old as { status: string };
          if (oldMatch.status === 'finished') return;

          // Check if user has a prediction for this match
          const { data: userPalpite } = await supabase
            .from('palpites_usuarios')
            .select('placar_casa, placar_fora')
            .eq('partida_id', match.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!userPalpite) return;

          // Get team names
          const { data: teams } = await supabase
            .from('times')
            .select('id, nome')
            .in('id', [match.time_casa_id, match.time_fora_id]);

          const timeCasa = teams?.find(t => t.id === match.time_casa_id)?.nome || 'Casa';
          const timeFora = teams?.find(t => t.id === match.time_fora_id)?.nome || 'Fora';

          const golsCasa = match.gols_casa ?? 0;
          const golsFora = match.gols_fora ?? 0;

          // Check if exact score match
          const acertouPlacar = userPalpite.placar_casa === golsCasa && 
                               userPalpite.placar_fora === golsFora;

          // Check if result match (win/draw/loss)
          const resultadoReal = golsCasa > golsFora ? 'casa' : golsCasa < golsFora ? 'fora' : 'empate';
          const resultadoPalpite = userPalpite.placar_casa > userPalpite.placar_fora ? 'casa' : 
                                   userPalpite.placar_casa < userPalpite.placar_fora ? 'fora' : 'empate';
          const acertouResultado = resultadoReal === resultadoPalpite;

          const resultadoFinal = `${golsCasa} x ${golsFora}`;
          const seuPalpite = `${userPalpite.placar_casa} x ${userPalpite.placar_fora}`;

          if (acertouPlacar) {
            toast({
              title: "🎯 Placar Exato!",
              description: `${timeCasa} ${resultadoFinal} ${timeFora} - Você acertou em cheio!`,
              variant: "default",
              className: "bg-green-600 text-white border-green-700"
            });
          } else if (acertouResultado) {
            toast({
              title: "✅ Resultado Certo!",
              description: `${timeCasa} ${resultadoFinal} ${timeFora} - Seu palpite: ${seuPalpite}`,
              variant: "default",
              className: "bg-blue-600 text-white border-blue-700"
            });
          } else {
            toast({
              title: "❌ Não foi dessa vez",
              description: `${timeCasa} ${resultadoFinal} ${timeFora} - Seu palpite: ${seuPalpite}`,
              variant: "destructive"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}
