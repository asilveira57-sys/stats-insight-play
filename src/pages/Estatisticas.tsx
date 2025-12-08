import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/cards/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeams, useTeamStats, useTeamSearch, useLeagues, useTeamsByLeague, TeamStats } from "@/hooks/useTeamsDB";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  X,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Estatisticas() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [compareTeamId, setCompareTeamId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [searchingFor, setSearchingFor] = useState<'main' | 'compare'>('main');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: leagues } = useLeagues();
  const { data: leagueTeams } = useTeamsByLeague(selectedLeagueId);
  const { data: searchResults } = useTeamSearch(searchTerm, selectedLeagueId);
  const { data: teamStats, isLoading: statsLoading } = useTeamStats(selectedTeamId);
  const { data: compareTeamStats, isLoading: compareStatsLoading } = useTeamStats(compareTeamId);

  // Selecionar primeiro time automaticamente se não houver seleção
  useMemo(() => {
    if (!selectedTeamId && teams && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const handleLeagueChange = (value: string) => {
    setSelectedLeagueId(value === 'all' ? null : value);
    setSelectedTeamId(null);
    setCompareTeamId(null);
    setCompareMode(false);
  };

  const formColors = {
    V: "bg-secondary text-secondary-foreground",    // Vitória
    E: "bg-muted text-muted-foreground",            // Empate
    D: "bg-destructive text-destructive-foreground", // Derrota
  };

  const handleTeamSelect = (teamId: string) => {
    if (searchingFor === 'compare') {
      setCompareTeamId(teamId);
    } else {
      setSelectedTeamId(teamId);
    }
    setSearchTerm("");
    setShowSearch(false);
  };

  const handleCompareClick = () => {
    if (compareMode) {
      setCompareMode(false);
      setCompareTeamId(null);
    } else {
      setCompareMode(true);
    }
  };

  const avgGoalsScored = teamStats && teamStats.jogos > 0 
    ? (teamStats.golsMarcados / teamStats.jogos).toFixed(2) 
    : "0.00";

  const avgGoalsConceded = teamStats && teamStats.jogos > 0 
    ? (teamStats.golsSofridos / teamStats.jogos).toFixed(2) 
    : "0.00";

  const compareAvgGoalsScored = compareTeamStats && compareTeamStats.jogos > 0 
    ? (compareTeamStats.golsMarcados / compareTeamStats.jogos).toFixed(2) 
    : "0.00";

  const compareAvgGoalsConceded = compareTeamStats && compareTeamStats.jogos > 0 
    ? (compareTeamStats.golsSofridos / compareTeamStats.jogos).toFixed(2) 
    : "0.00";

  const renderTeamForm = (forma: string[]) => (
    <div className="flex items-center gap-1">
      {forma.map((result, index) => (
        <span
          key={index}
          className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold",
            formColors[result as keyof typeof formColors]
          )}
        >
          {result}
        </span>
      ))}
    </div>
  );

  const renderComparisonBar = (value1: number, value2: number, label: string, inverse: boolean = false) => {
    const total = value1 + value2 || 1;
    const pct1 = (value1 / total) * 100;
    const pct2 = (value2 / total) * 100;
    const better1 = inverse ? value1 < value2 : value1 > value2;
    const better2 = inverse ? value2 < value1 : value2 > value1;

    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className={cn("font-bold", better1 && "text-secondary")}>{value1}</span>
          <span className="text-muted-foreground text-xs">{label}</span>
          <span className={cn("font-bold", better2 && "text-secondary")}>{value2}</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
          <div 
            className={cn("transition-all", better1 ? "bg-secondary" : "bg-primary/50")}
            style={{ width: `${pct1}%` }}
          />
          <div 
            className={cn("transition-all", better2 ? "bg-secondary" : "bg-primary/50")}
            style={{ width: `${pct2}%` }}
          />
        </div>
      </div>
    );
  };

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

          <div className="flex flex-col sm:flex-row gap-3">
            {/* League Filter */}
            <Select value={selectedLeagueId || 'all'} onValueChange={handleLeagueChange}>
              <SelectTrigger className="w-full sm:w-48 bg-muted border-border">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por liga" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all">Todas as ligas</SelectItem>
                {leagues?.map((league) => (
                  <SelectItem key={league.id} value={league.id}>
                    <div className="flex items-center gap-2">
                      {league.logo_url && (
                        <img src={league.logo_url} alt={league.nome} className="w-4 h-4 object-contain" />
                      )}
                      {league.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={selectedLeagueId ? "Buscar time na liga..." : "Buscar time..."}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearch(true);
                  setSearchingFor('main');
                }}
                onFocus={() => {
                  setShowSearch(true);
                  setSearchingFor('main');
                }}
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
              onClick={handleCompareClick}
            >
              <Activity className="w-4 h-4" />
              {compareMode ? "Cancelar" : "Comparar"}
            </Button>
          </div>
        </div>

        {/* League Teams Grid */}
        {selectedLeagueId && leagueTeams && leagueTeams.length > 0 && !compareMode && (
          <div className="mb-8">
            <h3 className="font-display font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Times da Liga ({leagueTeams.length})
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {leagueTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setShowSearch(false);
                  }}
                  className={cn(
                    "p-3 rounded-xl border transition-all flex flex-col items-center gap-2 hover:scale-105",
                    selectedTeamId === team.id 
                      ? "border-primary bg-primary/10 shadow-lg" 
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <img
                    src={team.escudo_url || '/placeholder.svg'}
                    alt={team.nome}
                    className="w-10 h-10 object-contain"
                  />
                  <span className="text-xs text-center line-clamp-2 font-medium">{team.nome}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Compare Mode - Select Second Team */}
        {compareMode && !compareTeamId && (
          <div className="glass-card p-6 mb-8 border-2 border-primary/50">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold">Selecione o segundo time para comparar</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar time para comparar..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearch(true);
                  setSearchingFor('compare');
                }}
                onFocus={() => {
                  setShowSearch(true);
                  setSearchingFor('compare');
                }}
                className="pl-10 pr-4 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full"
              />
              
              {showSearch && searchResults && searchResults.length > 0 && searchingFor === 'compare' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.filter(t => t.id !== selectedTeamId).map((team) => (
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
          </div>
        )}

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
        ) : compareMode && compareTeamStats ? (
          /* Comparison View */
          <div className="space-y-8">
            {/* Teams Header Comparison */}
            <div className="glass-card p-6 md:p-8 neon-border">
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* Team 1 */}
                <div className="text-center">
                  <img
                    src={teamStats.escudo_url || '/placeholder.svg'}
                    alt={teamStats.nome}
                    className="w-20 h-20 md:w-24 md:h-24 mx-auto object-contain mb-3"
                  />
                  <h2 className="text-lg md:text-xl font-display font-bold mb-2">
                    {teamStats.nome}
                  </h2>
                  {teamStats.forma.length > 0 && renderTeamForm(teamStats.forma)}
                </div>

                {/* VS */}
                <div className="text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-2">
                    <span className="text-2xl md:text-3xl font-display font-bold text-primary">VS</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setCompareTeamId(null)}
                    className="text-muted-foreground"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Trocar
                  </Button>
                </div>

                {/* Team 2 */}
                <div className="text-center">
                  <img
                    src={compareTeamStats.escudo_url || '/placeholder.svg'}
                    alt={compareTeamStats.nome}
                    className="w-20 h-20 md:w-24 md:h-24 mx-auto object-contain mb-3"
                  />
                  <h2 className="text-lg md:text-xl font-display font-bold mb-2">
                    {compareTeamStats.nome}
                  </h2>
                  {compareTeamStats.forma.length > 0 && renderTeamForm(compareTeamStats.forma)}
                </div>
              </div>
            </div>

            {/* Stats Comparison */}
            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-lg mb-6 text-center">Comparativo de Desempenho</h3>
              
              <div className="max-w-2xl mx-auto">
                {renderComparisonBar(teamStats.jogos, compareTeamStats.jogos, "Jogos")}
                {renderComparisonBar(teamStats.vitorias, compareTeamStats.vitorias, "Vitórias")}
                {renderComparisonBar(teamStats.empates, compareTeamStats.empates, "Empates")}
                {renderComparisonBar(teamStats.derrotas, compareTeamStats.derrotas, "Derrotas", true)}
                {renderComparisonBar(teamStats.golsMarcados, compareTeamStats.golsMarcados, "Gols Marcados")}
                {renderComparisonBar(teamStats.golsSofridos, compareTeamStats.golsSofridos, "Gols Sofridos", true)}
                {renderComparisonBar(
                  teamStats.golsMarcados - teamStats.golsSofridos, 
                  compareTeamStats.golsMarcados - compareTeamStats.golsSofridos, 
                  "Saldo de Gols"
                )}
              </div>
            </div>

            {/* Average Stats Comparison */}
            <div className="glass-card p-6">
              <h3 className="font-display font-bold text-lg mb-6 text-center">Médias por Jogo</h3>
              
              <div className="max-w-2xl mx-auto">
                {renderComparisonBar(
                  parseFloat(avgGoalsScored), 
                  parseFloat(compareAvgGoalsScored), 
                  "Média Gols Marcados"
                )}
                {renderComparisonBar(
                  parseFloat(avgGoalsConceded), 
                  parseFloat(compareAvgGoalsConceded), 
                  "Média Gols Sofridos",
                  true
                )}
                {renderComparisonBar(
                  teamStats.jogos > 0 ? (teamStats.vitorias / teamStats.jogos) * 100 : 0,
                  compareTeamStats.jogos > 0 ? (compareTeamStats.vitorias / compareTeamStats.jogos) * 100 : 0,
                  "% Vitórias"
                )}
              </div>
            </div>

            {/* Home vs Away Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Home Stats */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Home className="w-5 h-5 text-secondary" />
                  <h3 className="font-display font-bold">Desempenho em Casa</h3>
                </div>
                <div className="space-y-4">
                  {renderComparisonBar(teamStats.vitoriasCasa, compareTeamStats.vitoriasCasa, "Vitórias")}
                  {renderComparisonBar(teamStats.golsMarcadosCasa, compareTeamStats.golsMarcadosCasa, "Gols Marcados")}
                  {renderComparisonBar(teamStats.golsSofridosCasa, compareTeamStats.golsSofridosCasa, "Gols Sofridos", true)}
                </div>
              </div>

              {/* Away Stats */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Plane className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-bold">Desempenho Fora</h3>
                </div>
                <div className="space-y-4">
                  {renderComparisonBar(teamStats.vitoriasFora, compareTeamStats.vitoriasFora, "Vitórias")}
                  {renderComparisonBar(teamStats.golsMarcadosFora, compareTeamStats.golsMarcadosFora, "Gols Marcados")}
                  {renderComparisonBar(teamStats.golsSofridosFora, compareTeamStats.golsSofridosFora, "Gols Sofridos", true)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Single Team View */
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
                  <p className="text-4xl font-display font-bold text-destructive mb-2">
                    {avgGoalsConceded}
                  </p>
                  <p className="text-sm text-muted-foreground">Média Gols Sofridos</p>
                </div>

                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <p className="text-4xl font-display font-bold text-secondary mb-2">
                    {teamStats.jogos > 0 ? ((teamStats.vitorias / teamStats.jogos) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Taxa de Vitória</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
