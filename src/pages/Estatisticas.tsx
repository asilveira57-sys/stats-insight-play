import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/cards/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeams, useTeamStats, useTeamSearch } from "@/hooks/useTeamsDB";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Shield,
  Zap,
  Activity,
  Search,
  ChevronRight,
  Home,
  Plane,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Estatisticas() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: searchResults } = useTeamSearch(searchTerm);
  const { data: teamStats, isLoading: statsLoading } = useTeamStats(selectedTeamId);

  // Selecionar primeiro time automaticamente se não houver seleção
  useMemo(() => {
    if (!selectedTeamId && teams && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const formColors = {
    W: "bg-secondary text-secondary-foreground",
    D: "bg-muted text-muted-foreground",
    L: "bg-destructive text-destructive-foreground",
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSearchTerm("");
    setShowSearch(false);
  };

  const avgGoalsScored = teamStats && teamStats.jogos > 0 
    ? (teamStats.golsMarcados / teamStats.jogos).toFixed(2) 
    : "0.00";

  const avgGoalsConceded = teamStats && teamStats.jogos > 0 
    ? (teamStats.golsSofridos / teamStats.jogos).toFixed(2) 
    : "0.00";

  // Clean sheets estimation (jogos sem sofrer gols)
  const cleanSheets = teamStats 
    ? Math.round((teamStats.jogos - teamStats.golsSofridos / Math.max(teamStats.jogos, 1)) * 0.3)
    : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              <span className="gradient-text">Estatísticas</span>
            </h1>
            <p className="text-muted-foreground">
              Análise detalhada de times e competições
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar time..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                className="pl-10 pr-4 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full md:w-64"
              />
              
              {/* Search Results Dropdown */}
              {showSearch && searchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id)}
                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted transition-colors text-left"
                    >
                      <img
                        src={team.escudo_url || '/placeholder.svg'}
                        alt={team.nome}
                        className="w-6 h-6 object-contain"
                      />
                      <span className="text-sm">{team.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button 
              variant={compareMode ? "default" : "outline"}
              onClick={() => setCompareMode(!compareMode)}
            >
              <Activity className="w-4 h-4" />
              Comparar
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {(teamsLoading || statsLoading) && !teamStats ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        ) : !teamStats ? (
          <div className="glass-card p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">Nenhum time selecionado</h3>
            <p className="text-muted-foreground">
              Use a busca acima para encontrar um time
            </p>
          </div>
        ) : (
          <>
            {/* Team Header */}
            <div className="glass-card p-6 md:p-8 mb-8 neon-border">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-muted flex items-center justify-center">
                  <img
                    src={teamStats.escudo_url || '/placeholder.svg'}
                    alt={teamStats.nome}
                    className="w-20 h-20 md:w-28 md:h-28 object-contain"
                  />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
                    {teamStats.nome}
                  </h2>
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                    {teamStats.liga && (
                      <span className="league-badge">
                        {teamStats.ligaLogo && (
                          <img 
                            src={teamStats.ligaLogo} 
                            alt={teamStats.liga}
                            className="w-4 h-4"
                          />
                        )}
                        {teamStats.liga}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {teamStats.jogos} jogos
                    </span>
                  </div>
                  
                  {/* Form */}
                  {teamStats.forma.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground mr-2">Últimos {teamStats.forma.length}:</span>
                      {teamStats.forma.map((result, index) => (
                        <span
                          key={index}
                          className={cn(
                            "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold",
                            formColors[result as keyof typeof formColors]
                          )}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-display font-bold text-secondary">
                      {teamStats.vitorias}
                    </p>
                    <p className="text-xs text-muted-foreground">Vitórias</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-display font-bold text-muted-foreground">
                      {teamStats.empates}
                    </p>
                    <p className="text-xs text-muted-foreground">Empates</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-display font-bold text-destructive">
                      {teamStats.derrotas}
                    </p>
                    <p className="text-xs text-muted-foreground">Derrotas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Target}
                label="Gols Marcados"
                value={teamStats.golsMarcados}
                trend="up"
                trendValue={`+${teamStats.golsMarcados - teamStats.golsSofridos}`}
                variant="secondary"
              />
              <StatCard
                icon={Shield}
                label="Gols Sofridos"
                value={teamStats.golsSofridos}
                variant="primary"
              />
              <StatCard
                icon={TrendingUp}
                label="Média Gols/Jogo"
                value={avgGoalsScored}
                variant="default"
              />
              <StatCard
                icon={Zap}
                label="Saldo de Gols"
                value={teamStats.golsMarcados - teamStats.golsSofridos}
                variant="default"
              />
            </div>

            {/* Home vs Away */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Home Stats */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Home className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold">Em Casa</h3>
                    <p className="text-sm text-muted-foreground">
                      {teamStats.jogosCasa} jogos disputados
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Vitórias</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${teamStats.jogosCasa > 0 ? (teamStats.vitoriasCasa / teamStats.jogosCasa) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-secondary">{teamStats.vitoriasCasa}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Empates</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-muted-foreground rounded-full"
                          style={{ width: `${teamStats.jogosCasa > 0 ? (teamStats.empatesCasa / teamStats.jogosCasa) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-bold">{teamStats.empatesCasa}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Derrotas</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-destructive rounded-full"
                          style={{ width: `${teamStats.jogosCasa > 0 ? (teamStats.derrotasCasa / teamStats.jogosCasa) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-destructive">{teamStats.derrotasCasa}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gols Marcados</span>
                      <span className="font-bold text-secondary">{teamStats.golsMarcadosCasa}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Gols Sofridos</span>
                      <span className="font-bold text-destructive">{teamStats.golsSofridosCasa}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Away Stats */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Plane className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold">Fora de Casa</h3>
                    <p className="text-sm text-muted-foreground">
                      {teamStats.jogosFora} jogos disputados
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Vitórias</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${teamStats.jogosFora > 0 ? (teamStats.vitoriasFora / teamStats.jogosFora) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-secondary">{teamStats.vitoriasFora}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Empates</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-muted-foreground rounded-full"
                          style={{ width: `${teamStats.jogosFora > 0 ? (teamStats.empatesFora / teamStats.jogosFora) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-bold">{teamStats.empatesFora}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Derrotas</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-destructive rounded-full"
                          style={{ width: `${teamStats.jogosFora > 0 ? (teamStats.derrotasFora / teamStats.jogosFora) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-destructive">{teamStats.derrotasFora}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gols Marcados</span>
                      <span className="font-bold text-secondary">{teamStats.golsMarcadosFora}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Gols Sofridos</span>
                      <span className="font-bold text-destructive">{teamStats.golsSofridosFora}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-lg">Resumo de Desempenho</h3>
                <span className="text-xs text-primary px-2 py-1 rounded-full bg-primary/10">
                  Baseado em {teamStats.jogos} jogos
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <p className="text-4xl font-display font-bold gradient-text mb-2">
                    {avgGoalsScored}
                  </p>
                  <p className="text-sm text-muted-foreground">Média Gols Marcados</p>
                </div>

                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <p className="text-4xl font-display font-bold text-primary mb-2">
                    {avgGoalsConceded}
                  </p>
                  <p className="text-sm text-muted-foreground">Média Gols Sofridos</p>
                </div>

                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <p className="text-4xl font-display font-bold text-secondary mb-2">
                    {teamStats.jogos > 0 ? ((teamStats.vitorias / teamStats.jogos) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Aproveitamento</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
