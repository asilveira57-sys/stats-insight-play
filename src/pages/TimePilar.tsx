import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useTeamBySlug, useTeamRelatedNews } from "@/hooks/useTeamPillar";
import { TeamPillarSEO } from "@/components/team/TeamPillarSEO";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { AdSlot } from "@/components/ads/AdSlot";
import { PremiumCTA } from "@/components/news/PremiumCTA";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Calendar, MapPin, Trophy, Users, ArrowRight, Newspaper 
} from "lucide-react";

function FormaBadge({ resultado }: { resultado: string }) {
  const colors = {
    V: "bg-green-500/20 text-green-400 border-green-500/30",
    E: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    D: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold border ${colors[resultado as keyof typeof colors] || ""}`}>
      {resultado}
    </span>
  );
}

function StatBox({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="text-center p-4 bg-muted/30 rounded-lg">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sublabel && <div className="text-xs text-muted-foreground/70">{sublabel}</div>}
    </div>
  );
}

export default function TimePilar() {
  const { slug } = useParams<{ slug: string }>();
  const { data: team, isLoading } = useTeamBySlug(slug || null);
  const { data: relatedNews } = useTeamRelatedNews(team?.nome || null);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="text-2xl font-display font-bold mb-2">Time não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            O time que você está procurando não existe ou foi removido.
          </p>
          <Button asChild>
            <Link to="/">Voltar à Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const pageUrl = `${window.location.origin}/times/${slug}`;
  const { stats } = team;

  return (
    <Layout>
      <TeamPillarSEO
        teamName={team.nome}
        leagueName={team.liga?.nome}
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
                  <Link to="/times">Times</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{team.nome}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Hero Section */}
        <section className="py-12 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Team Badge */}
              <TeamBadge
                name={team.nome}
                primaryColor={team.cores?.primary}
                secondaryColor={team.cores?.secondary}
                size="xl"
              />

              {/* Team Info */}
              <div className="text-center md:text-left flex-1">
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
                  {team.nome}
                </h1>
                {team.liga && (
                  <p className="text-lg text-muted-foreground mb-4">
                    Análise estatística completa na {team.liga.nome}
                  </p>
                )}
                {team.pais && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{team.pais}</span>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <StatBox label="Jogos" value={stats.jogos} />
                <StatBox label="Aproveitamento" value={`${stats.aproveitamento}%`} />
                <StatBox label="Vitórias" value={stats.vitorias} />
                <StatBox label="Saldo de Gols" value={stats.golsMarcados - stats.golsSofridos} />
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
                {team.pillar_content?.visao_geral ? (
                  <div dangerouslySetInnerHTML={{ __html: team.pillar_content.visao_geral }} />
                ) : (
                  <p className="text-muted-foreground">
                    O {team.nome} é um dos clubes que disputam {team.liga?.nome ? `a ${team.liga.nome}` : "competições de futebol"}. 
                    Com uma história marcante no futebol{team.pais ? ` ${team.pais.toLowerCase()}` : ""}, o clube busca 
                    consolidar sua posição entre as principais forças do campeonato. Acompanhe abaixo uma análise 
                    estatística detalhada do desempenho recente da equipe.
                  </p>
                )}
              </div>
            </section>

            {/* AdSlot 1 - After Overview */}
            <AdSlot position="article-intro" className="my-8" />

            {/* Estilo de Jogo */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Estilo de Jogo e Comportamento Estatístico
              </h2>
              <div className="prose prose-lg prose-invert max-w-none">
                {team.pillar_content?.estilo_jogo ? (
                  <div dangerouslySetInnerHTML={{ __html: team.pillar_content.estilo_jogo }} />
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Baseado nos dados disponíveis, o {team.nome} apresenta um perfil 
                      {stats.golsMarcados > stats.golsSofridos ? " ofensivo" : stats.golsMarcados < stats.golsSofridos ? " defensivo" : " equilibrado"} 
                      {" "}com média de {(stats.golsMarcados / Math.max(1, stats.jogos)).toFixed(2)} gols marcados por partida.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 not-prose">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-400">{stats.vitoriasCasa}</div>
                            <div className="text-sm text-muted-foreground">Vitórias em casa ({stats.jogosCasa} jogos)</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-blue-400">{stats.vitoriasFora}</div>
                            <div className="text-sm text-muted-foreground">Vitórias fora ({stats.jogosFora} jogos)</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Desempenho na Temporada */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                Desempenho na Temporada Atual
              </h2>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatBox label="Vitórias" value={stats.vitorias} sublabel={`${Math.round(stats.vitorias / Math.max(1, stats.jogos) * 100)}%`} />
                <StatBox label="Empates" value={stats.empates} sublabel={`${Math.round(stats.empates / Math.max(1, stats.jogos) * 100)}%`} />
                <StatBox label="Derrotas" value={stats.derrotas} sublabel={`${Math.round(stats.derrotas / Math.max(1, stats.jogos) * 100)}%`} />
                <StatBox label="Gols" value={`${stats.golsMarcados}:${stats.golsSofridos}`} sublabel="Marcados : Sofridos" />
              </div>

              {/* Form */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Forma Recente (Últimos 5 jogos)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {stats.forma.map((r, i) => (
                      <FormaBadge key={i} resultado={r} />
                    ))}
                    {stats.forma.length === 0 && (
                      <span className="text-muted-foreground">Sem jogos recentes</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {team.pillar_content?.desempenho_temporada && (
                <div className="prose prose-lg prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: team.pillar_content.desempenho_temporada }} />
                </div>
              )}
            </section>

            {/* Premium CTA */}
            <PremiumCTA variant="inline" />

            {/* Próximos Jogos */}
            {team.upcomingMatches.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  Próximos Jogos
                </h2>
                <div className="space-y-3">
                  {team.upcomingMatches.map((match) => (
                    <Card key={match.id}>
                      <CardContent className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={match.local === "casa" ? "default" : "secondary"}>
                            {match.local === "casa" ? "Casa" : "Fora"}
                          </Badge>
                          <span className="font-medium">{match.adversario}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(match.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Resultados Recentes */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4">Resultados Recentes</h2>
              <div className="space-y-2">
                {team.recentMatches.slice(0, 5).map((match) => (
                  <Card key={match.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FormaBadge resultado={match.resultado} />
                        <Badge variant={match.local === "casa" ? "outline" : "secondary"} className="text-xs">
                          {match.local === "casa" ? "C" : "F"}
                        </Badge>
                        <span>{match.adversario}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold">{match.placar}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(match.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* AdSlot 2 - Before Related Content */}
            <AdSlot position="article-end" className="my-8" />

            {/* Conteúdos Relacionados */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Newspaper className="w-6 h-6 text-primary" />
                Análises do {team.nome}
              </h2>
              
              {relatedNews && relatedNews.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {relatedNews.slice(0, 10).map((news) => (
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
                  <p className="text-xs text-muted-foreground mt-3">
                    Mostrando {Math.min(10, relatedNews.length)} de {relatedNews.length} análises
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Ainda não há análises publicadas sobre o {team.nome}. 
                  Confira em breve nossas análises pré-jogo e tendências.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {relatedNews && relatedNews.length > 10 && (
                  <Button variant="default" asChild>
                    <Link to={`/times/${slug}/analises`}>
                      Ver todas as análises do {team.nome}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                )}
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
