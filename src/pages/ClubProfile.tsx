import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, MapPin, Calendar, Building, Trophy, TrendingUp, Users, Target, Clock, BarChart3 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/cards/StatCard";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { 
  useClubData, 
  useClubProfile, 
  useClubStats,
  useClubDecadeStats,
  useClubTopScorers,
  useClubRivals,
  useClubCompetitionStats,
  useClubRecentMatches,
  useClubHistoricalPeriod
} from "@/hooks/useClubProfile";

export default function ClubProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: club, isLoading: clubLoading } = useClubData(slug || "");
  const { data: profile } = useClubProfile(club?.id || "");
  const { data: stats } = useClubStats(club?.id || "");
  const { data: decadeStats } = useClubDecadeStats(club?.id || "");
  const { data: topScorers } = useClubTopScorers(club?.id || "");
  const { data: rivals } = useClubRivals(club?.id || "");
  const { data: competitionStats } = useClubCompetitionStats(club?.id || "");
  const { data: recentMatches } = useClubRecentMatches(club?.id || "");
  const { data: historicalPeriod } = useClubHistoricalPeriod(club?.id || "");

  if (clubLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!club) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Clube não encontrado</h1>
            <Button onClick={() => navigate("/times")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Times
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const title = `${club.nome} - Análise Estatística Completa | Statball`;
  const description = `Análise estatística completa do ${club.nome}${club.pais ? ` (${club.pais})` : ""}. Histórico, estatísticas, artilheiros e confrontos históricos.`;

  return (
    <Layout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://stats-insight-play.lovable.app/clubes/${club.slug}`} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Header Navigation */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/times")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Times
          </Button>
        </div>

        {/* Header Institucional do Clube */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="flex flex-col items-center gap-4">
              <TeamBadge
                teamId={club.id}
                teamName={club.nome}
                colors={club.cores}
                size="xl"
              />
              <div>
                <h1 className="text-3xl font-bold font-display">{club.nome}</h1>
                {club.short_code && (
                  <p className="text-muted-foreground mt-1">
                    Código: {club.short_code}
                  </p>
                )}
                <div className="flex items-center justify-center gap-6 mt-3 text-sm text-muted-foreground">
                  {club.estado && club.pais && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {club.estado} — {club.pais}
                    </div>
                  )}
                  {club.pais && !club.estado && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {club.pais}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    Fundado em {new Date(club.created_at).getFullYear()}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Resumo Institucional */}
        {profile && (
          <div className="mb-8 space-y-6">
            <h2 className="text-2xl font-bold">História do Clube</h2>
            
            {profile.history_text && (
              <Card>
                <CardHeader>
                  <CardTitle>História</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: profile.history_text }} />
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.stadium_text && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Estádio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: profile.stadium_text }} />
                  </CardContent>
                </Card>
              )}

              {profile.culture_text && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Cultura
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: profile.culture_text }} />
                  </CardContent>
                </Card>
              )}

              {profile.rivalries_text && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Rivalidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: profile.rivalries_text }} />
                  </CardContent>
                </Card>
              )}

              {profile.legacy_text && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Legado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: profile.legacy_text }} />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Estatísticas Gerais */}
        {stats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Estatísticas Gerais</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={BarChart3}
                label="Total de Jogos"
                value={stats.total_matches}
                variant="default"
              />
              <StatCard
                icon={TrendingUp}
                label="Vitórias"
                value={stats.wins}
                variant="primary"
              />
              <StatCard
                icon={Target}
                label="Gols Marcados"
                value={stats.goals_for}
                variant="secondary"
              />
              <StatCard
                icon={Trophy}
                label="Aproveitamento"
                value={`${stats.win_percentage}%`}
                variant="primary"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <StatCard
                icon={BarChart3}
                label="Empates"
                value={stats.draws}
                variant="default"
              />
              <StatCard
                icon={BarChart3}
                label="Derrotas"
                value={stats.losses}
                variant="default"
              />
              <StatCard
                icon={Target}
                label="Gols Sofridos"
                value={stats.goals_against}
                variant="default"
              />
              <StatCard
                icon={TrendingUp}
                label="Saldo de Gols"
                value={stats.goal_difference >= 0 ? `+${stats.goal_difference}` : `${stats.goal_difference}`}
                variant={stats.goal_difference >= 0 ? "primary" : "default"}
                trend={stats.goal_difference >= 0 ? "up" : "down"}
              />
            </div>
          </div>
        )}

        {/* Linha do Tempo Histórica */}
        {decadeStats && decadeStats.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Linha do Tempo Histórica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decadeStats.map((decade) => (
                <Card key={decade.decade}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Década de {decade.decade}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jogos:</span>
                        <span className="font-semibold">{decade.matches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vitórias:</span>
                        <span className="font-semibold text-primary">{decade.wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aproveitamento:</span>
                        <span className="font-semibold">
                          {decade.matches > 0 ? Math.round((decade.wins / decade.matches) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Artilheiros Históricos */}
        {topScorers && topScorers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Artilheiros Históricos</h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posição</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="text-center">Gols</TableHead>
                    <TableHead className="text-center">Jogos (est.)</TableHead>
                    <TableHead className="text-center">Média</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topScorers.slice(0, 10).map((scorer, index) => (
                    <TableRow key={scorer.player_name}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          {index + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{scorer.player_name}</TableCell>
                      <TableCell className="text-center font-semibold text-primary">
                        {scorer.goals}
                      </TableCell>
                      <TableCell className="text-center">{scorer.matches}</TableCell>
                      <TableCell className="text-center">{scorer.average}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Confrontos Clássicos */}
        {rivals && rivals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Confrontos Clássicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rivals.slice(0, 6).map((rival) => (
                <Card key={rival.team_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                          <TeamBadge
                            teamId={rival.team_id}
                            teamName={rival.team_name}
                            size="md"
                          />
                      <div>
                        <div className="font-display">{club.nome} × {rival.team_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {rival.matches} jogos disputados
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{rival.wins}</div>
                        <div className="text-xs text-muted-foreground">Vitórias</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{rival.draws}</div>
                        <div className="text-xs text-muted-foreground">Empates</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{rival.losses}</div>
                        <div className="text-xs text-muted-foreground">Derrotas</div>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between text-sm">
                      <span>Gols: {rival.goals_for} × {rival.goals_against}</span>
                      <span className="font-semibold">
                        {rival.matches > 0 ? Math.round((rival.wins / rival.matches) * 100) : 0}% aproveitamento
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Estatísticas por Competição */}
        {competitionStats && competitionStats.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Estatísticas por Competição</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {competitionStats.map((comp) => (
                <Card key={comp.league_id}>
                  <CardHeader>
                    <CardTitle className="text-lg truncate">{comp.league_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jogos:</span>
                        <span className="font-semibold">{comp.matches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vitórias:</span>
                        <span className="font-semibold text-primary">{comp.wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gols:</span>
                        <span className="font-semibold">{comp.goals_for}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aproveitamento:</span>
                        <span className="font-semibold">
                          {comp.matches > 0 ? Math.round((comp.wins / comp.matches) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Últimos Jogos */}
        {recentMatches && recentMatches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Últimos Jogos Registrados</h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Adversário</TableHead>
                    <TableHead>Competição</TableHead>
                    <TableHead className="text-center">Placar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMatches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>
                        {new Date(match.data).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TeamBadge
                            teamId={match.opponent_id}
                            teamName={match.opponent_name}
                            size={24}
                          />
                          <div>
                            <div className="font-medium">{match.opponent_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {match.is_home ? "Em casa" : "Fora"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {match.league_name || "N/A"}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {match.is_home 
                          ? `${match.home_goals} × ${match.away_goals}`
                          : `${match.away_goals} × ${match.home_goals}`
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Rodapé com dados de atualização */}
        {historicalPeriod && stats && (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                <p><strong>Dados atualizados até:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Base histórica analisada:</strong> {historicalPeriod.start_year} até {historicalPeriod.end_year}</p>
                <p><strong>Total de partidas registradas:</strong> {stats.total_matches} jogos</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}