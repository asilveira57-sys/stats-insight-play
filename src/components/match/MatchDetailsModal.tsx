import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { Button } from "@/components/ui/button";
import { 
  Goal, 
  Users, 
  AlertTriangle, 
  Clock, 
  User,
  ShieldCheck,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useMatchFullDetails, Gol, Escalacao, Cartao } from "@/hooks/useMatchDetails";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Team {
  id: string;
  name: string;
  logo: string;
  score?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

interface MatchDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string | null;
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  league: string;
}

export function MatchDetailsModal({
  open,
  onOpenChange,
  matchId,
  homeTeam,
  awayTeam,
  date,
  league,
}: MatchDetailsModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: details, isLoading } = useMatchFullDetails(matchId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const homeGoals = details?.gols.filter(g => g.time_id === homeTeam.id) || [];
  const awayGoals = details?.gols.filter(g => g.time_id === awayTeam.id) || [];
  const homeLineup = details?.escalacoes.filter(e => e.time_id === homeTeam.id) || [];
  const awayLineup = details?.escalacoes.filter(e => e.time_id === awayTeam.id) || [];
  const homeCards = details?.cartoes.filter(c => c.time_id === homeTeam.id) || [];
  const awayCards = details?.cartoes.filter(c => c.time_id === awayTeam.id) || [];
  
  const homeFormation = homeLineup.find(e => e.formacao)?.formacao;
  const awayFormation = awayLineup.find(e => e.formacao)?.formacao;
  
  const homeCoach = details?.tecnicos.find(t => t.time_id === homeTeam.id)?.tecnicos;
  const awayCoach = details?.tecnicos.find(t => t.time_id === awayTeam.id)?.tecnicos;

  const hasDetails = details && (
    details.gols.length > 0 || 
    details.escalacoes.length > 0 || 
    details.cartoes.length > 0
  );

  const handleSyncDetails = async () => {
    if (!matchId) return;
    
    setIsSyncing(true);
    try {
      // First try the primary source (Football-Data.org)
      const { data: result1, error: error1 } = await supabase.functions.invoke('sync-match-details', {
        body: { matchId }
      });
      
      // Check if we got data from primary source
      if (result1?.synced > 0) {
        await queryClient.invalidateQueries({ queryKey: ['match-full-details', matchId] });
        toast({
          title: "Sincronização concluída",
          description: `${result1.synced} partida(s) sincronizada(s)`,
        });
        return;
      }
      
      // If primary source didn't have data, try API-Football as fallback
      console.log('Primary source had no data, trying API-Football...');
      const { data: result2, error: error2 } = await supabase.functions.invoke('sync-match-details-apifootball', {
        body: { matchId }
      });
      
      await queryClient.invalidateQueries({ queryKey: ['match-full-details', matchId] });
      
      if (result2?.synced > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${result2.synced} partida(s) sincronizada(s) via fonte alternativa`,
        });
      } else {
        // Both sources failed to return data
        const errorMsg = result1?.errors?.[0] || result2?.errors?.[0] || 'Dados não disponíveis nas fontes';
        toast({
          title: "Dados não disponíveis",
          description: "Os detalhes desta partida ainda não estão disponíveis nas APIs externas",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error syncing match details:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os detalhes",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {league}
            </Badge>
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>
          
          {/* Match Header */}
          <div className="flex items-center justify-between gap-4 mt-4">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamBadge
                name={homeTeam.name}
                primaryColor={homeTeam.primaryColor}
                secondaryColor={homeTeam.secondaryColor}
                size="xl"
              />
              <span className="text-sm font-medium text-center">{homeTeam.name}</span>
              {homeFormation && (
                <Badge variant="secondary" className="text-[10px]">{homeFormation}</Badge>
              )}
            </div>

            {/* Score */}
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold font-display neon-text">
                {homeTeam.score ?? 0}
              </span>
              <span className="text-2xl text-muted-foreground">-</span>
              <span className="text-4xl font-bold font-display neon-text">
                {awayTeam.score ?? 0}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamBadge
                name={awayTeam.name}
                primaryColor={awayTeam.primaryColor}
                secondaryColor={awayTeam.secondaryColor}
                size="xl"
              />
              <span className="text-sm font-medium text-center">{awayTeam.name}</span>
              {awayFormation && (
                <Badge variant="secondary" className="text-[10px]">{awayFormation}</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !hasDetails ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">Detalhes não disponíveis para esta partida</p>
            <p className="text-xs mt-1 mb-4">Os dados serão sincronizados em breve</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSyncDetails}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Detalhes
                </>
              )}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="goals" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="goals" className="gap-2">
                <Goal className="w-4 h-4" />
                Gols
              </TabsTrigger>
              <TabsTrigger value="lineups" className="gap-2">
                <Users className="w-4 h-4" />
                Escalações
              </TabsTrigger>
              <TabsTrigger value="cards" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Cartões
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="goals" className="mt-0">
                <GoalsTimeline 
                  homeGoals={homeGoals} 
                  awayGoals={awayGoals}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                />
              </TabsContent>

              <TabsContent value="lineups" className="mt-0">
                <LineupsView
                  homeLineup={homeLineup}
                  awayLineup={awayLineup}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  homeCoach={homeCoach?.nome}
                  awayCoach={awayCoach?.nome}
                />
              </TabsContent>

              <TabsContent value="cards" className="mt-0">
                <CardsView
                  homeCards={homeCards}
                  awayCards={awayCards}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Goals Timeline Component
function GoalsTimeline({ 
  homeGoals, 
  awayGoals,
  homeTeam,
  awayTeam 
}: { 
  homeGoals: Gol[]; 
  awayGoals: Gol[];
  homeTeam: Team;
  awayTeam: Team;
}) {
  const allGoals = [...homeGoals.map(g => ({ ...g, isHome: true })), ...awayGoals.map(g => ({ ...g, isHome: false }))]
    .sort((a, b) => {
      if (a.minuto !== b.minuto) return a.minuto - b.minuto;
      return (a.acrescimo || 0) - (b.acrescimo || 0);
    });

  if (allGoals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Goal className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhum gol registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allGoals.map((goal, index) => (
        <div 
          key={goal.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg bg-muted/50",
            goal.isHome ? "flex-row" : "flex-row-reverse"
          )}
        >
          <TeamBadge
            name={goal.isHome ? homeTeam.name : awayTeam.name}
            primaryColor={goal.isHome ? homeTeam.primaryColor : awayTeam.primaryColor}
            secondaryColor={goal.isHome ? homeTeam.secondaryColor : awayTeam.secondaryColor}
            size="md"
          />
          
          <div className={cn(
            "flex-1",
            goal.isHome ? "text-left" : "text-right"
          )}>
            <p className="font-medium text-sm">{goal.jogador_nome}</p>
            {goal.assistente_nome && (
              <p className="text-xs text-muted-foreground">
                Assistência: {goal.assistente_nome}
              </p>
            )}
            {goal.tipo !== 'REGULAR' && (
              <Badge variant="outline" className="text-[10px] mt-1">
                {goal.tipo === 'PENALTY' ? 'Pênalti' : goal.tipo === 'OWN_GOAL' ? 'Gol Contra' : goal.tipo}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-primary shrink-0">
            <Clock className="w-3 h-3" />
            <span className="text-sm font-medium">
              {goal.minuto}'
              {goal.acrescimo && goal.acrescimo > 0 && `+${goal.acrescimo}`}
            </span>
          </div>
          
          <div className="text-xs text-muted-foreground shrink-0 min-w-[40px] text-center">
            {goal.placar_casa} - {goal.placar_fora}
          </div>
        </div>
      ))}
    </div>
  );
}

// Lineups View Component
function LineupsView({
  homeLineup,
  awayLineup,
  homeTeam,
  awayTeam,
  homeCoach,
  awayCoach,
}: {
  homeLineup: Escalacao[];
  awayLineup: Escalacao[];
  homeTeam: Team;
  awayTeam: Team;
  homeCoach?: string;
  awayCoach?: string;
}) {
  const homeStarters = homeLineup.filter(p => p.titular);
  const homeBench = homeLineup.filter(p => !p.titular);
  const awayStarters = awayLineup.filter(p => p.titular);
  const awayBench = awayLineup.filter(p => !p.titular);

  if (homeLineup.length === 0 && awayLineup.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Users className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Escalações não disponíveis</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Home Team */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <TeamBadge
            name={homeTeam.name}
            primaryColor={homeTeam.primaryColor}
            secondaryColor={homeTeam.secondaryColor}
            size="sm"
          />
          <span className="text-sm font-medium">{homeTeam.name}</span>
        </div>
        
        {homeCoach && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3 h-3" />
            <span>Técnico: {homeCoach}</span>
          </div>
        )}
        
        <div className="space-y-1">
          <p className="text-xs font-medium text-primary mb-2">Titulares</p>
          {homeStarters.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}
        </div>
        
        {homeBench.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Reservas</p>
            {homeBench.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </div>
        )}
      </div>

      {/* Away Team */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50 justify-end">
          <span className="text-sm font-medium">{awayTeam.name}</span>
          <TeamBadge
            name={awayTeam.name}
            primaryColor={awayTeam.primaryColor}
            secondaryColor={awayTeam.secondaryColor}
            size="sm"
          />
        </div>
        
        {awayCoach && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
            <span>Técnico: {awayCoach}</span>
            <ShieldCheck className="w-3 h-3" />
          </div>
        )}
        
        <div className="space-y-1">
          <p className="text-xs font-medium text-primary mb-2 text-right">Titulares</p>
          {awayStarters.map((player) => (
            <PlayerRow key={player.id} player={player} align="right" />
          ))}
        </div>
        
        {awayBench.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2 text-right">Reservas</p>
            {awayBench.map((player) => (
              <PlayerRow key={player.id} player={player} align="right" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ player, align = "left" }: { player: Escalacao; align?: "left" | "right" }) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-xs py-1",
      align === "right" && "flex-row-reverse"
    )}>
      <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-medium">
        {player.numero_camisa || "-"}
      </span>
      <span className="flex-1">{player.jogador_nome}</span>
      {player.posicao && (
        <span className="text-[10px] text-muted-foreground uppercase">
          {player.posicao.slice(0, 3)}
        </span>
      )}
    </div>
  );
}

// Cards View Component
function CardsView({
  homeCards,
  awayCards,
  homeTeam,
  awayTeam,
}: {
  homeCards: Cartao[];
  awayCards: Cartao[];
  homeTeam: Team;
  awayTeam: Team;
}) {
  const allCards = [...homeCards.map(c => ({ ...c, isHome: true })), ...awayCards.map(c => ({ ...c, isHome: false }))]
    .sort((a, b) => a.minuto - b.minuto);

  if (allCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhum cartão registrado</p>
      </div>
    );
  }

  const getCardColor = (tipo: string) => {
    if (tipo.includes('RED')) return 'bg-red-500';
    if (tipo.includes('YELLOW_RED')) return 'bg-gradient-to-r from-yellow-500 to-red-500';
    return 'bg-yellow-500';
  };

  const getCardLabel = (tipo: string) => {
    if (tipo === 'RED_CARD') return 'Vermelho';
    if (tipo === 'YELLOW_RED_CARD') return '2º Amarelo';
    return 'Amarelo';
  };

  return (
    <div className="space-y-3">
      {allCards.map((card) => (
        <div 
          key={card.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg bg-muted/50",
            card.isHome ? "flex-row" : "flex-row-reverse"
          )}
        >
          <TeamBadge
            name={card.isHome ? homeTeam.name : awayTeam.name}
            primaryColor={card.isHome ? homeTeam.primaryColor : awayTeam.primaryColor}
            secondaryColor={card.isHome ? homeTeam.secondaryColor : awayTeam.secondaryColor}
            size="md"
          />
          
          <div className={cn(
            "flex-1",
            card.isHome ? "text-left" : "text-right"
          )}>
            <p className="font-medium text-sm">{card.jogador_nome}</p>
            <p className="text-xs text-muted-foreground">{getCardLabel(card.tipo)}</p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className={cn(
              "w-4 h-5 rounded-sm",
              getCardColor(card.tipo)
            )} />
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-sm">{card.minuto}'</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
