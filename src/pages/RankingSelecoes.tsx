import { useState } from "react";
import { ArrowLeft, Trophy, Target, TrendingUp, Medal, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { Link } from "react-router-dom";
import { useNationalTeamsRanking, useInternationalCompetitions, TeamRankingData } from "@/hooks/useNationalTeamsRanking";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type SortField = 'pontos' | 'vitorias' | 'gols_marcados' | 'aproveitamento' | 'saldo_gols';
type SortDirection = 'asc' | 'desc';

const RankingSelecoes = () => {
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('pontos');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const { data: ranking, isLoading } = useNationalTeamsRanking(competitionFilter);
  const { data: competitions } = useInternationalCompetitions();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedRanking = ranking?.slice().sort((a, b) => {
    const multiplier = sortDirection === 'desc' ? -1 : 1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  // Calculate top stats
  const topScorer = ranking?.[0] ? ranking.reduce((max, team) => 
    team.gols_marcados > max.gols_marcados ? team : max, ranking[0]) : null;
  const topWinner = ranking?.[0] ? ranking.reduce((max, team) => 
    team.vitorias > max.vitorias ? team : max, ranking[0]) : null;
  const topEfficiency = ranking?.[0] ? ranking.reduce((max, team) => 
    team.aproveitamento > max.aproveitamento && team.jogos >= 3 ? team : max, ranking[0]) : null;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'desc' ? 
      <ChevronDown className="h-4 w-4 inline ml-1" /> : 
      <ChevronUp className="h-4 w-4 inline ml-1" />;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors text-center"
      onClick={() => handleSort(field)}
    >
      {children}
      <SortIcon field={field} />
    </TableHead>
  );

  const getPositionBadge = (position: number) => {
    if (position === 1) return <Badge className="bg-yellow-500 text-black">🥇 1º</Badge>;
    if (position === 2) return <Badge className="bg-gray-300 text-black">🥈 2º</Badge>;
    if (position === 3) return <Badge className="bg-amber-600 text-white">🥉 3º</Badge>;
    return <Badge variant="outline">{position}º</Badge>;
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/hub">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Ranking de Seleções
            </h1>
            <p className="text-muted-foreground">
              Performance nas competições históricas (Copa do Mundo, Euro, Copa América)
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtrar por:</span>
              </div>
              <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Todas as competições" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Competições</SelectItem>
                  {competitions?.map(comp => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Top Stats */}
        {!isLoading && ranking && ranking.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Maior Artilharia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <TeamBadge name={topScorer?.nome || ''} primaryColor={topScorer?.cores?.primary} secondaryColor={topScorer?.cores?.secondary} size="lg" />
                  <div>
                    <p className="font-bold">{topScorer?.nome}</p>
                    <p className="text-2xl font-bold text-yellow-500">{topScorer?.gols_marcados} gols</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Medal className="h-4 w-4" />
                  Mais Vitórias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <TeamBadge name={topWinner?.nome || ''} primaryColor={topWinner?.cores?.primary} secondaryColor={topWinner?.cores?.secondary} size="lg" />
                  <div>
                    <p className="font-bold">{topWinner?.nome}</p>
                    <p className="text-2xl font-bold text-green-500">{topWinner?.vitorias} vitórias</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Melhor Aproveitamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <TeamBadge name={topEfficiency?.nome || ''} primaryColor={topEfficiency?.cores?.primary} secondaryColor={topEfficiency?.cores?.secondary} size="lg" />
                  <div>
                    <p className="font-bold">{topEfficiency?.nome}</p>
                    <p className="text-2xl font-bold text-blue-500">{topEfficiency?.aproveitamento}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ranking Table */}
        <Card>
          <CardHeader>
            <CardTitle>Classificação Geral</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sortedRanking && sortedRanking.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] text-center">#</TableHead>
                      <TableHead>Seleção</TableHead>
                      <TableHead className="text-center">J</TableHead>
                      <SortableHeader field="vitorias">V</SortableHeader>
                      <TableHead className="text-center">E</TableHead>
                      <TableHead className="text-center">D</TableHead>
                      <SortableHeader field="gols_marcados">GM</SortableHeader>
                      <TableHead className="text-center">GS</TableHead>
                      <SortableHeader field="saldo_gols">SG</SortableHeader>
                      <SortableHeader field="pontos">Pts</SortableHeader>
                      <SortableHeader field="aproveitamento">%</SortableHeader>
                      <TableHead className="hidden md:table-cell">Competições</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRanking.map((team, index) => (
                      <TableRow key={team.id} className="hover:bg-muted/50">
                        <TableCell className="text-center font-medium">
                          {getPositionBadge(index + 1)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <TeamBadge name={team.nome} primaryColor={team.cores?.primary} secondaryColor={team.cores?.secondary} size="md" />
                            <span className="font-medium">{team.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{team.jogos}</TableCell>
                        <TableCell className="text-center font-medium text-green-500">{team.vitorias}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{team.empates}</TableCell>
                        <TableCell className="text-center text-red-500">{team.derrotas}</TableCell>
                        <TableCell className="text-center font-medium">{team.gols_marcados}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{team.gols_sofridos}</TableCell>
                        <TableCell className={`text-center font-medium ${team.saldo_gols > 0 ? 'text-green-500' : team.saldo_gols < 0 ? 'text-red-500' : ''}`}>
                          {team.saldo_gols > 0 ? '+' : ''}{team.saldo_gols}
                        </TableCell>
                        <TableCell className="text-center font-bold">{team.pontos}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={team.aproveitamento >= 70 ? "default" : team.aproveitamento >= 50 ? "secondary" : "outline"}>
                            {team.aproveitamento}%
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {team.competicoes.slice(0, 2).map(comp => (
                              <Badge key={comp} variant="outline" className="text-xs">
                                {comp.replace('FIFA ', '').replace('UEFA ', '')}
                              </Badge>
                            ))}
                            {team.competicoes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{team.competicoes.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum dado disponível para exibição.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Legenda:</strong> J = Jogos | V = Vitórias | E = Empates | D = Derrotas | 
              GM = Gols Marcados | GS = Gols Sofridos | SG = Saldo de Gols | Pts = Pontos | % = Aproveitamento
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RankingSelecoes;
