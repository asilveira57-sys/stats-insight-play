import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTopScorers } from "@/hooks/useTopScorers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Target, Trophy, TrendingUp, Goal, User, X } from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";

// Extract competition type and year from competition name
const parseCompetitionInfo = (name: string) => {
  const lowerName = name.toLowerCase();
  
  // Extract year from the name
  const yearMatch = name.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : null;
  
  // Determine competition type
  let type = "Outros";
  
  // International competitions
  if (lowerName.includes("world cup") || lowerName.includes("copa do mundo")) {
    type = "Internacional";
  } else if (lowerName.includes("euro") || lowerName.includes("eurocopa") || lowerName.includes("european championship")) {
    type = "Internacional";
  } else if (lowerName.includes("copa america") || lowerName.includes("copa américa")) {
    type = "Internacional";
  } else if (lowerName.includes("nations league") || lowerName.includes("liga das nações")) {
    type = "Internacional";
  } else if (lowerName.includes("champions league") || lowerName.includes("uefa champions")) {
    type = "Copas";
  // National leagues
  } else if (lowerName.includes("brasileiro") || lowerName.includes("série a") || lowerName.includes("brasileirão")) {
    type = "Ligas";
  } else if (lowerName.includes("premier league")) {
    type = "Ligas";
  } else if (lowerName.includes("la liga") || lowerName.includes("laliga") || lowerName.includes("primera")) {
    type = "Ligas";
  } else if (lowerName.includes("serie a") && !lowerName.includes("brasil")) {
    type = "Ligas";
  } else if (lowerName.includes("bundesliga")) {
    type = "Ligas";
  } else if (lowerName.includes("ligue 1")) {
    type = "Ligas";
  } else if (lowerName.includes("copa do brasil") || lowerName.includes("libertadores") || lowerName.includes("sudamericana")) {
    type = "Copas";
  }
  
  return { type, year };
};

export default function Artilheiros() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const { data: competitionStats, isLoading } = useTopScorers({ 
    selectedCompetition: selectedCompetition || undefined,
    selectedYear: selectedYear || undefined
  });

  const allCompetitions = competitionStats || [];

  // Get unique competition types and years
  const { competitionTypes, years } = useMemo(() => {
    const types = new Set<string>();
    const yearsSet = new Set<string>();
    
    allCompetitions.forEach(comp => {
      const { type, year } = parseCompetitionInfo(comp.competitionName);
      types.add(type);
      // Use competitionYear from data if available, otherwise extract from name
      const effectiveYear = comp.competitionYear || year;
      if (effectiveYear) yearsSet.add(effectiveYear);
    });
    
    return {
      competitionTypes: Array.from(types).sort(),
      years: Array.from(yearsSet).sort((a, b) => Number(b) - Number(a))
    };
  }, [allCompetitions]);

  // Filter competitions based on selected filters
  const filteredCompetitions = useMemo(() => {
    return allCompetitions.filter(comp => {
      if (selectedCompetition && comp.competitionId !== selectedCompetition) {
        return false;
      }
      
      const { type, year } = parseCompetitionInfo(comp.competitionName);
      // Use competitionYear from data if available, otherwise extract from name
      const effectiveYear = comp.competitionYear || year;
      
      if (selectedType && type !== selectedType) {
        return false;
      }
      
      if (selectedYear && effectiveYear !== selectedYear) {
        return false;
      }
      
      return true;
    });
  }, [allCompetitions, selectedCompetition, selectedType, selectedYear]);

  const displayStats = filteredCompetitions;

  const hasActiveFilters = selectedCompetition || selectedType || selectedYear;

  const clearFilters = () => {
    setSelectedCompetition("");
    setSelectedType("");
    setSelectedYear("");
  };

  // Get overall top scorers across filtered competitions
  const allPlayerScorers = displayStats.flatMap(comp => 
    comp.scorers.filter(s => !s.playerName.includes('(Seleção)')).map(scorer => ({
      ...scorer,
      competition: comp.competitionName
    }))
  );

  // Aggregate by player across competitions
  const aggregatedPlayers = new Map<string, {
    teamName: string;
    teamLogo: string | null;
    totalGoals: number;
    totalMatches: number;
    competitions: string[];
  }>();

  allPlayerScorers.forEach(scorer => {
    if (!aggregatedPlayers.has(scorer.playerName)) {
      aggregatedPlayers.set(scorer.playerName, {
        teamName: scorer.teamName,
        teamLogo: scorer.teamLogo,
        totalGoals: 0,
        totalMatches: 0,
        competitions: []
      });
    }
    const agg = aggregatedPlayers.get(scorer.playerName)!;
    agg.totalGoals += scorer.goals;
    agg.totalMatches += scorer.matches;
    if (!agg.competitions.includes(scorer.competition)) {
      agg.competitions.push(scorer.competition);
    }
  });

  const topPlayersOverall = Array.from(aggregatedPlayers.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.totalGoals - a.totalGoals)
    .slice(0, 5);

  const totalGoalsAllComps = displayStats.reduce((sum, c) => sum + c.totalGoals, 0);
  const totalMatchesAllComps = displayStats.reduce((sum, c) => sum + c.totalMatches, 0);
  const uniquePlayers = aggregatedPlayers.size;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold gradient-text mb-2">
            Artilheiros por Competição
          </h1>
          <p className="text-muted-foreground">
            Ranking de artilheiros em competições internacionais históricas
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <Select value={selectedType || "all"} onValueChange={(val) => setSelectedType(val === "all" ? "" : val)}>
            <SelectTrigger className="w-full sm:w-[200px] bg-card border-border">
              <SelectValue placeholder="Tipo de competição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {competitionTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear || "all"} onValueChange={(val) => setSelectedYear(val === "all" ? "" : val)}>
            <SelectTrigger className="w-full sm:w-[140px] bg-card border-border">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCompetition || "all"} onValueChange={(val) => setSelectedCompetition(val === "all" ? "" : val)}>
            <SelectTrigger className="w-full sm:w-[280px] bg-card border-border">
              <SelectValue placeholder="Competição específica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as competições</SelectItem>
              {allCompetitions.map(comp => (
                <SelectItem key={comp.competitionId} value={comp.competitionId}>
                  {comp.competitionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpar filtros
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{allCompetitions.length}</p>
                      <p className="text-xs text-muted-foreground">Competições</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/20">
                      <Goal className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalGoalsAllComps}</p>
                      <p className="text-xs text-muted-foreground">Gols</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                      <User className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{uniquePlayers}</p>
                      <p className="text-xs text-muted-foreground">Artilheiros</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {totalMatchesAllComps > 0 ? (totalGoalsAllComps / totalMatchesAllComps).toFixed(1) : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Média/Jogo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top 5 Overall - show when filtering or no specific competition */}
            {topPlayersOverall.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Top 5 Artilheiros {hasActiveFilters ? "(Filtro Aplicado)" : "(Geral)"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topPlayersOverall.map((player, index) => (
                      <div 
                        key={player.name}
                        className="flex items-center gap-4 p-3 rounded-lg bg-background/50"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                          index === 1 ? 'bg-gray-400/20 text-gray-400' :
                          index === 2 ? 'bg-amber-600/20 text-amber-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <TeamBadge name={player.teamName} size="md" />
                        
                        <div className="flex-1">
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {player.teamName} • {player.competitions.length} competição(ões)
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">{player.totalGoals}</p>
                          <p className="text-xs text-muted-foreground">gols</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per Competition */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {displayStats.map(competition => (
                <Card key={competition.competitionId} className="bg-card/50 border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{competition.competitionName}</CardTitle>
                      <Badge variant="secondary">
                        {competition.totalGoals} gols
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {competition.scorers.slice(0, 10).map((scorer, index) => (
                        <div 
                          key={`${scorer.playerName}-${scorer.teamId}`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <span className={`w-6 text-center font-medium ${
                            index < 3 ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                          
                          <TeamBadge name={scorer.teamName} size="sm" />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{scorer.playerName}</p>
                            <p className="text-xs text-muted-foreground truncate">{scorer.teamName}</p>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">{scorer.matches}j</span>
                            <span className="font-bold text-primary w-6 text-right">{scorer.goals}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {displayStats.length === 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-12 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum dado de artilharia disponível para as competições selecionadas.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
