import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTopScorers } from "@/hooks/useTopScorers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Trophy, TrendingUp, Goal, Shield, User } from "lucide-react";

export default function Artilheiros() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");
  const { data: competitionStats, isLoading } = useTopScorers(selectedCompetition || undefined);

  const allCompetitions = competitionStats || [];
  const displayStats = selectedCompetition 
    ? allCompetitions.filter(c => c.competitionId === selectedCompetition)
    : allCompetitions;

  // Get overall top scorers across all competitions
  const allPlayerScorers = allCompetitions.flatMap(comp => 
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

  const totalGoalsAllComps = allCompetitions.reduce((sum, c) => sum + c.totalGoals, 0);
  const totalMatchesAllComps = allCompetitions.reduce((sum, c) => sum + c.totalMatches, 0);
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

        {/* Filter */}
        <div className="mb-6">
          <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
            <SelectTrigger className="w-full md:w-[300px] bg-card border-border">
              <SelectValue placeholder="Todas as competições" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as competições</SelectItem>
              {allCompetitions.map(comp => (
                <SelectItem key={comp.competitionId} value={comp.competitionId}>
                  {comp.competitionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

            {/* Top 5 Overall */}
            {!selectedCompetition && topPlayersOverall.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Top 5 Artilheiros (Todas Competições)
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
                        
                        {player.teamLogo ? (
                          <img src={player.teamLogo} alt={player.teamName} className="w-8 h-8 object-contain" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        
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
                          
                          {scorer.teamLogo ? (
                            <img src={scorer.teamLogo} alt={scorer.teamName} className="w-6 h-6 object-contain" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <Shield className="w-3 h-3" />
                            </div>
                          )}
                          
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
