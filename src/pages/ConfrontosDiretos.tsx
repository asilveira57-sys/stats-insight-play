import { useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useNationalTeamsList, useNationalTeamsHeadToHead } from "@/hooks/useNationalTeamsHeadToHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Trophy, Target, Calendar, ArrowRightLeft, TrendingUp, Flame, Award, BarChart3, Filter } from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ALL = "all";

export default function ConfrontosDiretos() {
  const [team1Id, setTeam1Id] = useState<string>("");
  const [team2Id, setTeam2Id] = useState<string>("");
  const [ligaFilter, setLigaFilter] = useState<string>(ALL);
  const [paisFilter, setPaisFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");

  const { data, isLoading: loadingTeams } = useNationalTeamsList();
  const allTeams = data?.teams;
  const competitions = data?.competitions ?? [];

  const { data: h2h, isLoading: loadingH2H } = useNationalTeamsHeadToHead(
    team1Id || null, 
    team2Id || null
  );

  const paises = useMemo(() => {
    const set = new Set<string>();
    (allTeams ?? []).forEach(t => {
      if (t.pais) set.add(t.pais);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [allTeams]);

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (allTeams ?? []).filter(t => {
      if (ligaFilter !== ALL && !t.ligaIds.includes(ligaFilter)) return false;
      if (paisFilter !== ALL && t.pais !== paisFilter) return false;
      if (term && !t.nome.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [allTeams, ligaFilter, paisFilter, search]);

  const team1 = allTeams?.find(t => t.id === team1Id);
  const team2 = allTeams?.find(t => t.id === team2Id);

  const resetFilters = () => {
    setLigaFilter(ALL);
    setPaisFilter(ALL);
    setSearch("");
  };

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

        {/* Filters */}
        <Card className="mb-4 bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4 text-primary" />
              Filtre para reduzir as opções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={ligaFilter} onValueChange={setLigaFilter}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Competição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as competições</SelectItem>
                  {competitions.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paisFilter} onValueChange={setPaisFilter}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="País / Região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os países</SelectItem>
                  {paises.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar seleção por nome..."
                className="bg-background border-border"
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                {loadingTeams ? "Carregando seleções..." : `${filteredTeams.length} seleções disponíveis`}
              </p>
              {(ligaFilter !== ALL || paisFilter !== ALL || search) && (
                <button onClick={resetFilters} className="text-xs text-primary hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          </CardContent>
        </Card>

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
                    ) : filteredTeams.filter(t => t.id !== team2Id).length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Nenhuma seleção com esses filtros</div>
                    ) : (
                      filteredTeams.filter(t => t.id !== team2Id).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <TeamBadge name={team.nome} primaryColor={team.cores?.primary} secondaryColor={team.cores?.secondary} size="sm" />
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
                    ) : filteredTeams.filter(t => t.id !== team1Id).length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Nenhuma seleção com esses filtros</div>
                    ) : (
                      filteredTeams.filter(t => t.id !== team1Id).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <TeamBadge name={team.nome} primaryColor={team.cores?.primary} secondaryColor={team.cores?.secondary} size="sm" />
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
                    <TeamBadge name={team1.nome} primaryColor={team1.cores?.primary} secondaryColor={team1.cores?.secondary} size="lg" />
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
                    <TeamBadge name={team2.nome} primaryColor={team2.cores?.primary} secondaryColor={team2.cores?.secondary} size="lg" />
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
                      {h2h.mediaGolsTime1.toFixed(1)}/jogo
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
                      {h2h.mediaGolsTime2.toFixed(1)}/jogo
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Statistics */}
            <Card className="bg-card/50 border-border/50 mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Estatísticas Avançadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Average Goals */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      Média de Gols
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10">
                      <p className="text-3xl font-bold text-center">{h2h.mediaGolsPorJogo.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground text-center mt-1">gols por jogo</p>
                    </div>
                    {h2h.jogoMaisGols && (
                      <div className="text-xs text-muted-foreground text-center">
                        <span className="font-medium">Jogo mais gols:</span> {h2h.jogoMaisGols.placar} ({h2h.jogoMaisGols.total} gols)
                      </div>
                    )}
                  </div>

                  {/* Winning Streaks */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Flame className="w-4 h-4" />
                      Sequências de Vitórias
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                        <div className="flex items-center gap-2">
                          <TeamBadge name={team1.nome} primaryColor={team1.cores?.primary} secondaryColor={team1.cores?.secondary} size="sm" />
                          <span className="text-sm font-medium truncate max-w-[100px]">{team1.nome}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{h2h.maiorSequenciaTime1}</p>
                          <p className="text-xs text-muted-foreground">maior sequência</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                        <div className="flex items-center gap-2">
                          <TeamBadge name={team2.nome} primaryColor={team2.cores?.primary} secondaryColor={team2.cores?.secondary} size="sm" />
                          <span className="text-sm font-medium truncate max-w-[100px]">{team2.nome}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-secondary">{h2h.maiorSequenciaTime2}</p>
                          <p className="text-xs text-muted-foreground">maior sequência</p>
                        </div>
                      </div>
                    </div>
                    {(h2h.sequenciaAtualTime1 > 1 || h2h.sequenciaAtualTime2 > 1) && (
                      <div className="text-xs text-center text-muted-foreground">
                        {h2h.sequenciaAtualTime1 > 1 && (
                          <span className="text-primary font-medium">{team1.nome} com {h2h.sequenciaAtualTime1} vitórias seguidas</span>
                        )}
                        {h2h.sequenciaAtualTime2 > 1 && (
                          <span className="text-secondary font-medium">{team2.nome} com {h2h.sequenciaAtualTime2} vitórias seguidas</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Biggest Victories */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Award className="w-4 h-4" />
                      Maiores Vitórias
                    </div>
                    <div className="space-y-3">
                      {h2h.maiorVitoriaTime1 && (
                        <div className="p-3 rounded-lg bg-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            <TeamBadge name={team1.nome} primaryColor={team1.cores?.primary} secondaryColor={team1.cores?.secondary} size="sm" />
                            <span className="text-sm font-medium">{team1.nome}</span>
                          </div>
                          <p className="text-lg font-bold text-primary">{h2h.maiorVitoriaTime1.placar}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(h2h.maiorVitoriaTime1.data), "dd/MM/yyyy")}
                          </p>
                        </div>
                      )}
                      {h2h.maiorVitoriaTime2 && (
                        <div className="p-3 rounded-lg bg-secondary/10">
                          <div className="flex items-center gap-2 mb-1">
                            <TeamBadge name={team2.nome} primaryColor={team2.cores?.primary} secondaryColor={team2.cores?.secondary} size="sm" />
                            <span className="text-sm font-medium">{team2.nome}</span>
                          </div>
                          <p className="text-lg font-bold text-secondary">{h2h.maiorVitoriaTime2.placar}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(h2h.maiorVitoriaTime2.data), "dd/MM/yyyy")}
                          </p>
                        </div>
                      )}
                      {!h2h.maiorVitoriaTime1 && !h2h.maiorVitoriaTime2 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Sem vitórias registradas</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unbeaten Streaks */}
                {(h2h.sequenciaInvictoTime1 > 2 || h2h.sequenciaInvictoTime2 > 2) && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                      <Trophy className="w-4 h-4" />
                      Maior Sequência Invicta
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center">
                      {h2h.sequenciaInvictoTime1 > 2 && (
                        <Badge variant="outline" className="px-3 py-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <TeamBadge name={team1.nome} primaryColor={team1.cores?.primary} secondaryColor={team1.cores?.secondary} size="sm" />
                            {team1.nome}: {h2h.sequenciaInvictoTime1} jogos
                          </div>
                        </Badge>
                      )}
                      {h2h.sequenciaInvictoTime2 > 2 && (
                        <Badge variant="outline" className="px-3 py-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <TeamBadge name={team2.nome} primaryColor={team2.cores?.primary} secondaryColor={team2.cores?.secondary} size="sm" />
                            {team2.nome}: {h2h.sequenciaInvictoTime2} jogos
                          </div>
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
                                <TeamBadge name={team1.nome} primaryColor={team1.cores?.primary} secondaryColor={team1.cores?.secondary} size="sm" />
                                <span className="font-medium text-sm md:text-base">{team1.nome}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-background/80">
                                <span className="text-lg font-bold">{team1Score}</span>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-lg font-bold">{team2Score}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <TeamBadge name={team2.nome} primaryColor={team2.cores?.primary} secondaryColor={team2.cores?.secondary} size="sm" />
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
