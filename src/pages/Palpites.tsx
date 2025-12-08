import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { PredictionCard } from "@/components/cards/PredictionCard";
import { Button } from "@/components/ui/button";
import { usePredictions, useLeaguesForPredictions, useLeagueMatchCounts, Prediction } from "@/hooks/usePalpitesDB";
import { useUserPalpitesByMatches } from "@/hooks/useUserPalpitesByMatches";
import { UserPalpiteModal } from "@/components/palpites/UserPalpiteModal";
import { UserPalpitesHistory } from "@/components/palpites/UserPalpitesHistory";
import { BrasileiraoRetrospectiva } from "@/components/palpites/BrasileiraoRetrospectiva";
import { BulkAcceptModal } from "@/components/palpites/BulkAcceptModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Filter,
  TrendingUp,
  Info,
  ChevronRight,
  Crown,
  Lock,
  History,
  Target,
  CalendarX,
  Sparkles,
  CheckCircle,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export default function Palpites() {
  const { user } = useAuth();
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [selectedConfidence, setSelectedConfidence] = useState("all");
  const [selectedPalpiteStatus, setSelectedPalpiteStatus] = useState("all");
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const { data: predictions, isLoading: loadingPredictions } = usePredictions({
    leagueCode: selectedLeague,
    confidence: selectedConfidence,
    days: 7,
  });

  const { data: leagues, isLoading: loadingLeagues } = useLeaguesForPredictions();
  const { data: leagueMatchCounts } = useLeagueMatchCounts();

  // Get all match IDs to check for existing palpites
  const matchIds = useMemo(() => predictions?.map(p => p.matchId) || [], [predictions]);
  const { data: existingPalpites } = useUserPalpitesByMatches(matchIds);

  // Filter predictions based on palpite status
  const filteredPredictions = useMemo(() => {
    if (!predictions) return [];
    if (selectedPalpiteStatus === "all") return predictions;
    
    return predictions.filter(p => {
      const hasPalpite = existingPalpites?.get(p.matchId) || false;
      if (selectedPalpiteStatus === "done") return hasPalpite;
      if (selectedPalpiteStatus === "pending") return !hasPalpite;
      return true;
    });
  }, [predictions, existingPalpites, selectedPalpiteStatus]);

  // Count predictions by status
  const palpiteStatusCounts = useMemo(() => {
    if (!predictions || !existingPalpites) return { done: 0, pending: 0 };
    
    let done = 0;
    let pending = 0;
    predictions.forEach(p => {
      if (existingPalpites.get(p.matchId)) done++;
      else pending++;
    });
    return { done, pending };
  }, [predictions, existingPalpites]);

  const confidenceFilters = [
    { id: "all", label: "Todos" },
    { id: "high", label: "Alta Confiança" },
    { id: "medium", label: "Média" },
    { id: "low", label: "Baixa" },
  ];

  const palpiteStatusFilters = [
    { id: "all", label: "Todos", icon: null, count: predictions?.length || 0 },
    { id: "done", label: "Com Palpite", icon: CheckCircle, count: palpiteStatusCounts.done },
    { id: "pending", label: "A Fazer", icon: Circle, count: palpiteStatusCounts.pending },
  ];

  const handlePredictionClick = (prediction: Prediction) => {
    setSelectedPrediction(prediction);
    setModalOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                <span className="gradient-text">Palpites Matemáticos</span>
              </h1>
              <p className="text-muted-foreground">
                Previsões baseadas em análise estatística avançada
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="glass-card p-4 mb-8 border-l-4 border-l-primary">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Aviso:</strong> Este sistema não é uma plataforma de apostas. 
                Os palpites são gerados através de análises matemáticas usando distribuição de Poisson, 
                xG, forma recente e outras métricas estatísticas. Use as informações de forma responsável.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="predictions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Fazer Palpites
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Meu Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-6">
            {/* Bulk Accept Button */}
            {user && predictions && predictions.length > 0 && palpiteStatusCounts.pending > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setBulkModalOpen(true)}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Aceitar Todos os Palpites da IA
                </Button>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-4">
              {/* League and Confidence Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* League Filter */}
                <div className="glass-card p-4 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Liga</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedLeague("all")}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        selectedLeague === "all"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      Todas
                    </button>
                    {loadingLeagues ? (
                      <Skeleton className="h-9 w-32" />
                    ) : (
                      leagues?.slice(0, 6).map((league) => {
                        const matchCount = leagueMatchCounts?.get(league.codigo_api || '') || 0;
                        return (
                          <button
                            key={league.id}
                            onClick={() => setSelectedLeague(league.codigo_api || '')}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative",
                              selectedLeague === league.codigo_api
                                ? "bg-primary text-primary-foreground"
                                : matchCount === 0 
                                  ? "bg-muted/50 hover:bg-muted/60 text-muted-foreground/60"
                                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
                            )}
                          >
                            {league.logo_url && (
                              <img
                                src={league.logo_url}
                                alt={league.nome}
                                className={cn("w-4 h-4 object-contain", matchCount === 0 && "opacity-50")}
                              />
                            )}
                            <span className="hidden sm:inline">{league.nome}</span>
                            {matchCount > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                                {matchCount}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Confidence Filter */}
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Confiança</span>
                  </div>
                  <div className="flex gap-2">
                    {confidenceFilters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedConfidence(filter.id)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          selectedConfidence === filter.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Palpite Status Filter */}
              {user && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium">Status do Palpite</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {palpiteStatusFilters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedPalpiteStatus(filter.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          selectedPalpiteStatus === filter.id
                            ? filter.id === "done" 
                              ? "bg-secondary text-secondary-foreground"
                              : filter.id === "pending"
                                ? "bg-neon-orange text-white"
                                : "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        )}
                      >
                        {filter.icon && <filter.icon className="w-3 h-3" />}
                        {filter.label}
                        <span className={cn(
                          "px-1.5 py-0.5 text-xs rounded-full",
                          selectedPalpiteStatus === filter.id
                            ? "bg-white/20"
                            : "bg-primary/20 text-primary"
                        )}>
                          {filter.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Predictions Grid */}
            {loadingPredictions ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="glass-card p-5">
                    <div className="flex justify-between mb-4">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-col items-center gap-2">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                      <div className="flex flex-col items-center gap-2">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPredictions && filteredPredictions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPredictions.map((prediction) => (
                  <PredictionCard
                    key={prediction.id}
                    {...prediction}
                    hasPalpite={existingPalpites?.get(prediction.matchId) || false}
                    onClick={() => handlePredictionClick(prediction)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Retrospectiva for BSA */}
                {selectedLeague === 'BSA' && <BrasileiraoRetrospectiva />}
                
                <div className="glass-card p-8 text-center">
                  {selectedPalpiteStatus === "done" && palpiteStatusCounts.done === 0 ? (
                    <>
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum palpite feito ainda</h3>
                      <p className="text-muted-foreground mb-4">
                        Clique em uma partida para fazer seu primeiro palpite!
                      </p>
                      <Button onClick={() => setSelectedPalpiteStatus("pending")}>
                        Ver partidas disponíveis
                      </Button>
                    </>
                  ) : selectedPalpiteStatus === "pending" && palpiteStatusCounts.pending === 0 ? (
                    <>
                      <CheckCircle className="w-12 h-12 text-secondary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Todos os palpites feitos!</h3>
                      <p className="text-muted-foreground">
                        Parabéns! Você já fez palpites para todas as partidas disponíveis.
                      </p>
                    </>
                  ) : selectedLeague !== 'all' ? (
                    <>
                      <CalendarX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Temporada encerrada</h3>
                      <p className="text-muted-foreground mb-4">
                        {leagues?.find(l => l.codigo_api === selectedLeague)?.nome || 'Esta liga'} não possui jogos agendados no momento.
                        {selectedLeague === 'BSA' && ' A nova temporada do Brasileirão geralmente começa em abril.'}
                      </p>
                      
                      {/* Suggest other leagues with matches */}
                      {leagueMatchCounts && Array.from(leagueMatchCounts.entries()).filter(([_, count]) => count > 0).length > 0 && (
                        <div className="mt-6">
                          <p className="text-sm text-muted-foreground mb-3">Confira outras ligas com jogos disponíveis:</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {leagues?.filter(l => (leagueMatchCounts.get(l.codigo_api || '') || 0) > 0).slice(0, 4).map(league => (
                              <button
                                key={league.id}
                                onClick={() => setSelectedLeague(league.codigo_api || '')}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 hover:bg-primary/20 text-primary transition-all"
                              >
                                {league.logo_url && (
                                  <img src={league.logo_url} alt={league.nome} className="w-4 h-4 object-contain" />
                                )}
                                {league.nome}
                                <span className="text-xs opacity-70">
                                  ({leagueMatchCounts.get(league.codigo_api || '')})
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum palpite disponível</h3>
                      <p className="text-muted-foreground">
                        Não há partidas agendadas com dados suficientes para gerar palpites no momento.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Methodology Section */}
            <div className="glass-card p-6 md:p-8">
              <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Metodologia de Cálculo
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-3">
                    <span className="font-display font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Distribuição Poisson</h3>
                  <p className="text-sm text-muted-foreground">
                    Calculamos a probabilidade de cada placar usando a média de gols dos times.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center mb-3">
                    <span className="font-display font-bold text-secondary">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Forma Recente</h3>
                  <p className="text-sm text-muted-foreground">
                    Analisamos os últimos jogos para identificar tendências de desempenho.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center mb-3">
                    <span className="font-display font-bold text-accent">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Ataque vs Defesa</h3>
                  <p className="text-sm text-muted-foreground">
                    Comparamos força de ataque e fraqueza defensiva de cada time.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-neon-orange/20 flex items-center justify-center mb-3">
                    <span className="font-display font-bold text-neon-orange">4</span>
                  </div>
                  <h3 className="font-semibold mb-2">Fator Casa/Fora</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajustamos as probabilidades baseado no desempenho como mandante/visitante.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <UserPalpitesHistory />
          </TabsContent>
        </Tabs>

        {/* Premium CTA */}
        <div className="glass-card p-6 md:p-8 relative overflow-hidden mt-8">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
          
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Premium</span>
              </div>
              <h3 className="text-xl md:text-2xl font-display font-bold mb-2">
                Simulador de Campeonato
              </h3>
              <p className="text-muted-foreground mb-4">
                Simule os resultados de qualquer liga e veja a previsão final da tabela 
                baseada em milhares de simulações estatísticas.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  Exclusivo Premium
                </span>
              </div>
            </div>
            
            <Link to="/precos">
              <Button variant="premium" size="lg">
                <Crown className="w-5 h-5" />
                Desbloquear Simulador
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedPrediction && (
        <UserPalpiteModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          prediction={selectedPrediction}
        />
      )}

      {/* Bulk Accept Modal */}
      <BulkAcceptModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        predictions={predictions || []}
        existingPalpites={existingPalpites || new Map()}
      />
    </Layout>
  );
}
