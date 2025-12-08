import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateUserPalpite } from '@/hooks/useUserPalpites';
import { Prediction } from '@/hooks/usePalpitesDB';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BulkAcceptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  predictions: Prediction[];
  existingPalpites: Map<string, boolean>;
}

export function BulkAcceptModal({
  open,
  onOpenChange,
  predictions,
  existingPalpites,
}: BulkAcceptModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createPalpite = useCreateUserPalpite();
  const [selectedLeagues, setSelectedLeagues] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState(0);

  // Get unique leagues from predictions (only those without existing palpites)
  const availablePredictions = predictions.filter(p => !existingPalpites.get(p.matchId));
  const leagueGroups = availablePredictions.reduce((acc, p) => {
    if (!acc[p.leagueCode]) {
      acc[p.leagueCode] = { name: p.league, predictions: [] };
    }
    acc[p.leagueCode].predictions.push(p);
    return acc;
  }, {} as Record<string, { name: string; predictions: Prediction[] }>);

  const toggleLeague = (leagueCode: string) => {
    const newSelected = new Set(selectedLeagues);
    if (newSelected.has(leagueCode)) {
      newSelected.delete(leagueCode);
    } else {
      newSelected.add(leagueCode);
    }
    setSelectedLeagues(newSelected);
  };

  const selectAll = () => {
    setSelectedLeagues(new Set(Object.keys(leagueGroups)));
  };

  const deselectAll = () => {
    setSelectedLeagues(new Set());
  };

  const getTotalSelected = () => {
    let total = 0;
    selectedLeagues.forEach(league => {
      total += leagueGroups[league]?.predictions.length || 0;
    });
    return total;
  };

  const handleBulkAccept = async () => {
    if (!user) return;

    setIsProcessing(true);
    setCompleted(0);

    const predictionsToAccept: Prediction[] = [];
    selectedLeagues.forEach(league => {
      predictionsToAccept.push(...(leagueGroups[league]?.predictions || []));
    });

    let successCount = 0;
    for (const prediction of predictionsToAccept) {
      try {
        await createPalpite.mutateAsync({
          partidaId: prediction.matchId,
          placarCasa: prediction.predictedScore.home,
          placarFora: prediction.predictedScore.away,
          palpiteSistemaId: prediction.palpiteId,
          aceitouSugestao: true,
        });
        successCount++;
        setCompleted(successCount);
      } catch (error) {
        console.error('Error creating palpite:', error);
      }
    }

    setIsProcessing(false);

    if (successCount > 0) {
      toast({
        title: 'Palpites aceitos!',
        description: `${successCount} palpites da IA foram salvos com sucesso.`,
      });
      onOpenChange(false);
    }
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faça login para aceitar palpites</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground mb-4">
            Crie uma conta gratuita para salvar seus palpites e acompanhar sua assertividade.
          </p>
          <Link to="/auth">
            <Button className="w-full">Entrar / Criar Conta</Button>
          </Link>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Aceitar Palpites da IA
          </DialogTitle>
          <DialogDescription>
            Selecione os campeonatos para aceitar todas as sugestões da IA de uma vez.
          </DialogDescription>
        </DialogHeader>

        {availablePredictions.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-secondary mx-auto mb-3" />
            <p className="text-muted-foreground">
              Você já fez palpites para todas as partidas disponíveis!
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                {availablePredictions.length} partidas disponíveis
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Selecionar Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Limpar
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {Object.entries(leagueGroups).map(([leagueCode, group]) => (
                <label
                  key={leagueCode}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                >
                  <Checkbox
                    checked={selectedLeagues.has(leagueCode)}
                    onCheckedChange={() => toggleLeague(leagueCode)}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{group.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({group.predictions.length} partidas)
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">
                  Total selecionado: {getTotalSelected()} partidas
                </span>
              </div>

              {isProcessing && (
                <div className="mb-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(completed / getTotalSelected()) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    Processando {completed} de {getTotalSelected()}...
                  </span>
                </div>
              )}

              <Button
                onClick={handleBulkAccept}
                disabled={getTotalSelected() === 0 || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Aceitar {getTotalSelected()} Palpites
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
