import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useNationalTeamsList, useNationalTeamsHeadToHead } from "@/hooks/useNationalTeamsHeadToHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Swords, Trophy, Target, Calendar, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConfrontosDiretos() {
  const [team1Id, setTeam1Id] = useState<string>("");
  const [team2Id, setTeam2Id] = useState<string>("");
  
  const { data: teams, isLoading: loadingTeams } = useNationalTeamsList();
  const { data: h2h, isLoading: loadingH2H } = useNationalTeamsHeadToHead(
    team1Id || null, 
    team2Id || null
  );

  const team1 = teams?.find(t => t.id === team1Id);
  const team2 = teams?.find(t => t.id === team2Id);

  const swapTeams = () => {
    const temp = team1Id;
    setTeam1Id(team2Id);
    setTeam2Id(temp);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold gradient-text mb-2">
            Confrontos Diretos
          </h1>
          <p className="text-muted-foreground">
            Compare o histórico entre duas seleções em competições internacionais
          </p>
        </div>

        {/* Team Selection */}
        <Card className="mb-8 bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Selecione as Seleções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <Select value={team1Id} onValueChange={setTeam1Id}>
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue placeholder="Selecione a primeira seleção" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTeams ? (
                      <div className="p-2">Carregando...</div>
                    ) : (
                      teams?.filter(t => t.id !== team2Id).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            {team.escudo_url ? (
                              <img src={team.escudo_url} alt={team.nome} className="w-5 h-5 object-contain" />
                            ) : (
                              <Shield className="w-5 h-5 text-muted-foreground" />
                            )}
                            {team.nome}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={swapTeams}
                disabled={!team1Id || !team2Id}
                className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Trocar seleções"
              >
                <ArrowRightLeft className="w-5 h-5 text-primary" />
              </button>

              <div className="flex-1 w-full">
                <Select value={team2Id} onValueChange={setTeam2Id}>
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue placeholder="Selecione a segunda seleção" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTeams ? (
                      <div className="p-2">Carregando...</div>
                    ) : (
                      teams?.filter(t => t.id !== team1Id).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            {team.escudo_url ? (
                              <img src={team.escudo_url} alt={team.nome} className="w-5 h-5 object-contain" />
                            ) : (
                              <Shield className="w-5 h-5 text-muted-foreground" />
                            )}
                            {team.nome}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loadingH2H && team1Id && team2Id && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        )}

        {/* Results */}
        {h2h && team1 && team2 && (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* Team 1 Stats */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {team1.escudo_url ? (
                      <img src={team1.escudo_url} alt={team1.nome} className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                    ) : (
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center">
                        <Shield className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="font-semibold text-sm md:text-base truncate max-w-full">{team1.nome}</p>
                    <p className="text-2xl md:text-4xl font-bold text-primary">{h2h.vitoriasTime1}</p>
                    <p className="text-xs text-muted-foreground">vitórias</p>
                  </div>
                </CardContent>
              </Card>

              {/* Draws */}
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Swords className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground" />
                    <p className="font-semibold text-sm md:text-base">Empates</p>
                    <p className="text-2xl md:text-4xl font-bold">{h2h.empates}</p>
                    <p className="text-xs text-muted-foreground">{h2h.totalJogos} jogos</p>
                  </div>
                </CardContent>
              </Card>

              {/* Team 2 Stats */}
              <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/30">
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {team2.escudo_url ? (
                      <img src={team2.escudo_url} alt={team2.nome} className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                    ) : (
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center">
                        <Shield className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="font-semibold text-sm md:text-base truncate max-w-full">{team2.nome}</p>
                    <p className="text-2xl md:text-4xl font-bold text-secondary">{h2h.vitoriasTime2}</p>
                    <p className="text-xs text-muted-foreground">vitórias</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Goals Summary */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gols {team1.nome}</p>
                        <p className="text-2xl font-bold">{h2h.golsTime1}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {h2h.totalJogos > 0 ? (h2h.golsTime1 / h2h.totalJogos).toFixed(1) : 0}/jogo
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary/20">
                        <Target className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gols {team2.nome}</p>
                        <p className="text-2xl font-bold">{h2h.golsTime2}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {h2h.totalJogos > 0 ? (h2h.golsTime2 / h2h.totalJogos).toFixed(1) : 0}/jogo
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Match History */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Histórico de Partidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {h2h.partidas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Swords className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum confronto encontrado entre estas seleções.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {h2h.partidas.map((match) => {
                      const team1Score = match.time1EmCasa ? match.golsCasa : match.golsFora;
                      const team2Score = match.time1EmCasa ? match.golsFora : match.golsCasa;
                      
                      let resultClass = "bg-muted/50";
                      if (team1Score > team2Score) resultClass = "bg-primary/10 border-l-4 border-l-primary";
                      else if (team2Score > team1Score) resultClass = "bg-secondary/10 border-l-4 border-l-secondary";
                      
                      return (
                        <div 
                          key={match.id}
                          className={`p-4 rounded-lg ${resultClass} transition-colors`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                {team1.escudo_url ? (
                                  <img src={team1.escudo_url} alt={team1.nome} className="w-6 h-6 object-contain" />
                                ) : (
                                  <Shield className="w-6 h-6 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm md:text-base">{team1.nome}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-background/80">
                                <span className="text-lg font-bold">{team1Score}</span>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-lg font-bold">{team2Score}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {team2.escudo_url ? (
                                  <img src={team2.escudo_url} alt={team2.nome} className="w-6 h-6 object-contain" />
                                ) : (
                                  <Shield className="w-6 h-6 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm md:text-base hidden sm:inline">{team2.nome}</span>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <Badge variant="outline" className="mb-1 text-xs">
                                {match.competicao}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(match.data), "dd MMM yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!team1Id || !team2Id ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-16 text-center">
              <Swords className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground mb-2">
                Selecione duas seleções para ver o histórico de confrontos
              </p>
              <p className="text-sm text-muted-foreground">
                Compare estatísticas, vitórias e resultados de partidas anteriores
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* No matches found */}
        {h2h && h2h.totalJogos === 0 && (
          <Card className="bg-card/50 border-border/50 mt-4">
            <CardContent className="py-8 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                Não há registros de confrontos entre {team1?.nome} e {team2?.nome} em competições internacionais.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
