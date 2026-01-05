import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateUserPalpite, useUserPalpiteForMatch } from '@/hooks/useUserPalpites';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Check, Crown, Edit3, Loader2, Lock, Sparkles, Target, Zap } from 'lucide-react';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Prediction } from '@/hooks/usePalpitesDB';

interface UserPalpiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prediction: Prediction;
}

export function UserPalpiteModal({ open, onOpenChange, prediction }: UserPalpiteModalProps) {
  const { user } = useAuth();
  const { data: userPlan, isLoading: loadingPlan } = useUserPlan();
  const { data: existingPalpite, isLoading: loadingExisting } = useUserPalpiteForMatch(prediction.matchId);
  const createPalpite = useCreateUserPalpite();

  const [mode, setMode] = useState<'accept' | 'custom'>('accept');
  const [customHome, setCustomHome] = useState(prediction.predictedScore.home);
  const [customAway, setCustomAway] = useState(prediction.predictedScore.away);

  // Reset custom scores when prediction changes
  useEffect(() => {
    setCustomHome(prediction.predictedScore.home);
    setCustomAway(prediction.predictedScore.away);
  }, [prediction]);

  const handleSubmit = async (acceptSuggestion: boolean) => {
    if (!user) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para fazer palpites.',
        variant: 'destructive',
      });
      return;
    }

    if (!userPlan?.canSavePalpites) {
      toast({
        title: 'Recurso Premium',
        description: 'Atualize seu plano para salvar palpites.',
        variant: 'destructive',
      });
      return;
    }

    const placarCasa = acceptSuggestion ? prediction.predictedScore.home : customHome;
    const placarFora = acceptSuggestion ? prediction.predictedScore.away : customAway;

    try {
      await createPalpite.mutateAsync({
        partidaId: prediction.matchId,
        placarCasa,
        placarFora,
        palpiteSistemaId: prediction.palpiteId,
        aceitouSugestao: acceptSuggestion,
      });

      toast({
        title: 'Palpite registrado!',
        description: `Seu palpite: ${prediction.homeTeam.name} ${placarCasa} x ${placarFora} ${prediction.awayTeam.name}`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro ao salvar palpite',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  // Not logged in
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Faça login para palpitar</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Crie uma conta para fazer seus palpites e acompanhar sua assertividade.
            </p>
            <Link to="/auth">
              <Button className="w-full">Entrar / Criar Conta</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Free user - show upgrade prompt
  if (!loadingPlan && !userPlan?.canSavePalpites) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Recurso Premium
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Salvar Palpites</h3>
            <p className="text-muted-foreground mb-6">
              Com o plano Premium, você pode salvar seus palpites, acompanhar seu histórico e comparar sua assertividade com a IA.
            </p>
            
            {/* Show prediction info */}
            <div className="p-4 rounded-lg bg-muted/50 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Sugestão da IA para esta partida:</p>
              <div className="flex items-center justify-center gap-4">
                <span className="font-medium">{prediction.homeTeam.name}</span>
                <span className="text-2xl font-bold text-primary">
                  {prediction.predictedScore.home} x {prediction.predictedScore.away}
                </span>
                <span className="font-medium">{prediction.awayTeam.name}</span>
              </div>
            </div>

            <Link to="/precos">
              <Button className="w-full" size="lg">
                <Crown className="w-4 h-4 mr-2" />
                Ver Planos Premium
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Fazer Palpite
          </DialogTitle>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Match Info */}
            <div className="flex items-center justify-center gap-4 py-4 bg-muted/50 rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <TeamBadge name={prediction.homeTeam.name} size="lg" />
                <span className="text-sm font-medium text-center">{prediction.homeTeam.name}</span>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">VS</span>
              <div className="flex flex-col items-center gap-2">
                <TeamBadge name={prediction.awayTeam.name} size="lg" />
                <span className="text-sm font-medium text-center">{prediction.awayTeam.name}</span>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {prediction.league} • {prediction.date} às {prediction.time}
            </div>

            {existingPalpite && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-sm">
                  Você já palpitou: <strong>{existingPalpite.placar_casa} x {existingPalpite.placar_fora}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Você pode atualizar seu palpite abaixo</p>
              </div>
            )}

            {/* AI Suggestion */}
            <div
              onClick={() => setMode('accept')}
              className={cn(
                'p-4 rounded-xl border-2 cursor-pointer transition-all',
                mode === 'accept'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Aceitar Sugestão da IA</h3>
                  <p className="text-xs text-muted-foreground">Baseado em análise estatística</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-6 py-3">
                <span className="text-3xl font-bold">{prediction.predictedScore.home}</span>
                <span className="text-xl text-muted-foreground">x</span>
                <span className="text-3xl font-bold">{prediction.predictedScore.away}</span>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Casa: {prediction.homeTeam.probability.toFixed(0)}%</span>
                <span>Empate: {prediction.drawProbability.toFixed(0)}%</span>
                <span>Fora: {prediction.awayTeam.probability.toFixed(0)}%</span>
              </div>
            </div>

            {/* Custom Prediction */}
            <div
              onClick={() => setMode('custom')}
              className={cn(
                'p-4 rounded-xl border-2 cursor-pointer transition-all',
                mode === 'custom'
                  ? 'border-secondary bg-secondary/10'
                  : 'border-border hover:border-secondary/50'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold">Meu Palpite Personalizado</h3>
                  <p className="text-xs text-muted-foreground">Digite seu próprio placar</p>
                </div>
              </div>

              {mode === 'custom' && (
                <div className="flex items-center justify-center gap-4 py-3">
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={customHome}
                    onChange={(e) => setCustomHome(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                    className="w-20 text-center text-2xl font-bold h-14"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xl text-muted-foreground">x</span>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    value={customAway}
                    onChange={(e) => setCustomAway(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                    className="w-20 text-center text-2xl font-bold h-14"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => handleSubmit(mode === 'accept')}
              disabled={createPalpite.isPending}
              className="w-full"
              size="lg"
            >
              {createPalpite.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {existingPalpite ? 'Atualizar Palpite' : 'Confirmar Palpite'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
