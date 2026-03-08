import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useLeagueBySlug, useLeagueRelatedNews } from "@/hooks/useLeaguePillar";
import { LeaguePillarSEO } from "@/components/league/LeaguePillarSEO";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { AdSlot } from "@/components/ads/AdSlot";
import { PremiumCTA } from "@/components/news/PremiumCTA";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeasonDetailModal } from "@/components/league/SeasonDetailModal";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  Loader2, Home, ChevronRight, TrendingUp, Target, 
  Calendar, MapPin, Trophy, Users, ArrowRight, Newspaper,
  BarChart3, History
} from "lucide-react";

function StatBox({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="text-center p-4 bg-muted/30 rounded-lg">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sublabel && <div className="text-xs text-muted-foreground/70">{sublabel}</div>}
    </div>
  );
}

export default function CampeonatoPilar() {
  const { slug } = useParams<{ slug: string }>();
  const { data: league, isLoading } = useLeagueBySlug(slug || null);
  const { data: relatedNews } = useLeagueRelatedNews(league?.nome || null);
  
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSeasonClick = (year: number) => {
    setSelectedSeason(year);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!league) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="text-2xl font-display font-bold mb-2">Campeonato não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            O campeonato que você está procurando não existe ou foi removido.
          </p>
          <Button asChild>
            <Link to="/">Voltar à Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const pageUrl = `${window.location.origin}/campeonatos/${slug}`;
  const { stats } = league;

  return (
    <Layout>
      <LeaguePillarSEO
        leagueName={league.nome}
        country={league.pais}
        url={pageUrl}
      />

      <article className="min-h-screen">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="w-3.5 h-3.5" />
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/campeonatos">Campeonatos</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{league.nome}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Hero Section */}
        <section className="py-12 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* League Icon */}
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-primary" />
              </div>

              {/* League Info */}
              <div className="text-center md:text-left flex-1">
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
                  {league.nome}
                </h1>
                <p className="text-lg text-muted-foreground mb-4">
                  Análise estatística completa da temporada
                </p>
                {league.pais && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{league.pais}</span>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <StatBox label="Partidas" value={stats.partidasFinalizadas} />
                <StatBox label="Gols" value={stats.totalGols} />
                <StatBox label="Média/Jogo" value={stats.mediaGolsPorJogo} />
                <StatBox label="Empates" value={`${stats.percentualEmpates}%`} />
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            
            {/* Visão Geral */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Visão Geral
              </h2>
              <div className="prose prose-lg prose-invert max-w-none">
                {league.pillar_content?.visao_geral ? (
                  <div dangerouslySetInnerHTML={{ __html: league.pillar_content.visao_geral }} />
                ) : (
                  <p className="text-muted-foreground">
                    A {league.nome} é uma das competições de futebol mais importantes
                    {league.pais ? ` do(a) ${league.pais}` : ""}. Com uma história rica e tradição 
                    consolidada, a liga reúne alguns dos principais clubes e talentos do futebol,
                    proporcionando jogos de alto nível técnico e tático ao longo de toda a temporada.
                  </p>
                )}
              </div>
            </section>

            {/* AdSlot 1 - After Overview */}
            <AdSlot position="article-intro" className="my-8" />

            {/* Estilo da Liga */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Estilo da Liga e Tendências Estatísticas
              </h2>
              <div className="prose prose-lg prose-invert max-w-none">
                {league.pillar_content?.estilo_liga ? (
                  <div dangerouslySetInnerHTML={{ __html: league.pillar_content.estilo_liga }} />
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Com uma média de {stats.mediaGolsPorJogo} gols por partida, a {league.nome} apresenta 
                      {stats.mediaGolsPorJogo > 2.5 ? " um perfil ofensivo e dinâmico" : stats.mediaGolsPorJogo < 2 ? " um perfil mais tático e defensivo" : " um equilíbrio entre ataque e defesa"}.
                      A taxa de empates de {stats.percentualEmpates}% indica 
                      {stats.percentualEmpates > 30 ? " alta competitividade e equilíbrio entre as equipes" : " definições claras na maioria das partidas"}.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 not-prose">
                      <Card>
                        <CardContent className="pt-4 text-center">
                          <div className="text-3xl font-bold text-primary">{stats.totalGols}</div>
                          <div className="text-sm text-muted-foreground">Total de Gols</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 text-center">
                          <div className="text-3xl font-bold text-yellow-400">{stats.jogosSemGols}</div>
                          <div className="text-sm text-muted-foreground">Jogos 0x0</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 text-center">
                          <div className="text-3xl font-bold text-blue-400">{league.teams.length}</div>
                          <div className="text-sm text-muted-foreground">Times</div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Panorama da Temporada */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                Panorama da Temporada
              </h2>
              <div className="prose prose-lg prose-invert max-w-none">
                {league.pillar_content?.panorama_temporada ? (
                  <div dangerouslySetInnerHTML={{ __html: league.pillar_content.panorama_temporada }} />
                ) : (
                  <p className="text-muted-foreground">
                    A temporada atual da {league.nome} já conta com {stats.partidasFinalizadas} partidas 
                    disputadas, com {stats.totalGols} gols marcados até o momento. Os números indicam
                    uma campanha dinâmica, com tendências que se consolidam a cada rodada.
                    Acompanhe as análises detalhadas de cada time participante para uma visão completa
                    da competição.
                  </p>
                )}
              </div>
            </section>

            {/* Histórico por Temporada */}
            {league.seasons && league.seasons.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                  <History className="w-6 h-6 text-primary" />
                  Histórico por Temporada
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {league.seasons.map((season) => (
                    <Card 
                      key={season.year} 
                      className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => handleSeasonClick(season.year)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary group-hover:scale-105 transition-transform">{season.year}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {season.totalMatches} jogos
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {season.totalGoals} gols ({season.avgGoals}/jogo)
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Season Detail Modal */}
                {selectedSeason && (
                  <SeasonDetailModal
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    leagueId={league.id}
                    leagueName={league.nome}
                    tipoPrincipal={league.tipo_principal}
                    year={selectedSeason}
                  />
                )}
              </section>
            )}

            {/* Premium CTA */}
            <PremiumCTA variant="inline" />

            {/* Times Participantes */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Times Participantes
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {league.teams.map((team) => (
                  <Link
                    key={team.id}
                    to={team.slug ? `/times/${team.slug}` : "#"}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <TeamBadge
                      name={team.nome}
                      primaryColor={team.cores?.primary}
                      secondaryColor={team.cores?.secondary}
                      size="sm"
                    />
                    <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                      {team.nome}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Próximos Jogos */}
            {league.upcomingMatches.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  Próximos Jogos
                </h2>
                <div className="space-y-3">
                  {league.upcomingMatches.slice(0, 5).map((match) => (
                    <Card key={match.id}>
                      <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={match.timeCasaSlug ? `/times/${match.timeCasaSlug}` : "#"}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {match.timeCasa}
                          </Link>
                          <span className="text-muted-foreground">vs</span>
                          <Link 
                            to={match.timeForaSlug ? `/times/${match.timeForaSlug}` : "#"}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {match.timeFora}
                          </Link>
                        </div>
                        <Badge variant="outline">
                          {new Date(match.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Resultados Recentes */}
            {league.recentMatches.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-primary" />
                  Resultados Recentes
                </h2>
                <div className="space-y-2">
                  {league.recentMatches.slice(0, 5).map((match) => (
                    <Card key={match.id}>
                      <CardContent className="py-3 flex items-center justify-between">
                        <span className="font-medium">{match.timeCasa}</span>
                        <span className="font-mono font-bold text-lg px-4">
                          {match.golsCasa} - {match.golsFora}
                        </span>
                        <span className="font-medium">{match.timeFora}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* AdSlot 2 - Before Related Content */}
            <AdSlot position="article-end" className="my-8" />

            {/* Séries e Conteúdos */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Newspaper className="w-6 h-6 text-primary" />
                Análises da {league.nome}
              </h2>
              
              {relatedNews && relatedNews.length > 0 ? (
                <div className="space-y-3">
                  {relatedNews.map((news) => (
                    <Link 
                      key={news.id} 
                      to={`/noticias/${news.slug}`}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      {news.imagem_url && (
                        <img 
                          src={news.imagem_url} 
                          alt="" 
                          className="w-20 h-14 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-2">
                          {news.titulo}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {news.data_publicacao && new Date(news.data_publicacao).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-muted-foreground">
                  <p>Conteúdos disponíveis para a {league.nome}:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Análises pré-jogo</li>
                    <li>Panorama das rodadas</li>
                    <li>Tendências da temporada</li>
                    <li>Séries sazonais (turno, returno, reta final)</li>
                  </ul>
                </div>
              )}

              <div className="mt-4">
                <Button variant="outline" asChild>
                  <Link to="/noticias">
                    Ver todas as análises
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </section>

            {/* Premium CTA Footer */}
            <PremiumCTA variant="footer" />

            {/* Legal Disclaimer */}
            <div className="mt-8 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              <p>
                <strong>Aviso:</strong> O Statball é uma plataforma de análise estatística de futebol. 
                Este conteúdo tem caráter informativo e não constitui recomendação de apostas. 
                Consulte nossos <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link> e{" "}
                <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
              </p>
            </div>
          </div>
        </div>
      </article>
    </Layout>
  );
}
