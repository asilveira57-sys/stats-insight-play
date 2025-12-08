import { Layout } from "@/components/layout/Layout";
import { MatchCard } from "@/components/cards/MatchCard";
import { LeagueCard } from "@/components/cards/LeagueCard";
import { PredictionCard } from "@/components/cards/PredictionCard";
import { NewsCard } from "@/components/cards/NewsCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { predictions } from "@/data/mockData";
import { useTodayMatchesFromDB, useLeagues, useMatchCountByLeague } from "@/hooks/useMatchesDB";
import { useFeaturedMatch } from "@/hooks/useFeaturedMatch";
import { useLatestNoticias } from "@/hooks/useNoticias";
import { 
  Zap, 
  TrendingUp, 
  Trophy, 
  ChevronRight, 
  Play, 
  BarChart3,
  Target,
  Crown,
  Flame
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  const { data: matches, isLoading: matchesLoading } = useTodayMatchesFromDB();
  const { data: leagues, isLoading: leaguesLoading } = useLeagues();
  const { data: matchCounts } = useMatchCountByLeague();
  const { data: featuredMatch, isLoading: featuredLoading } = useFeaturedMatch();
  const { data: noticias, isLoading: noticiasLoading } = useLatestNoticias(3);

  // Map leagues to league cards
  const leagueCards = leagues?.map((league) => ({
    id: league.codigo_api || league.id,
    name: league.nome,
    country: league.pais || '',
    logo: league.logo_url || '/placeholder.svg',
    matchCount: matchCounts?.[league.codigo_api || ''] || 0,
  })) || [];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-hero-pattern opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px]" />
        
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Palpites Matemáticos</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
              <span className="gradient-text">Estatísticas</span> e{" "}
              <span className="text-foreground">Análises</span>{" "}
              <span className="text-foreground">Inteligentes</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Resultados em tempo real, estatísticas detalhadas e previsões baseadas em análise matemática. 
              Tome decisões informadas com dados precisos.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/palpites">
                <Button variant="premium" size="xl">
                  <TrendingUp className="w-5 h-5" />
                  Ver Palpites
                </Button>
              </Link>
              <Link to="/resultados">
                <Button variant="outline" size="xl">
                  <BarChart3 className="w-5 h-5" />
                  Resultados
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Video Showcase / Featured Classic */}
      <section className="container mx-auto px-4 py-8">
        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 neon-border">
          <div className="w-full md:w-2/5 aspect-video rounded-xl bg-muted overflow-hidden relative group">
            <img 
              src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800"
              alt="Football highlight"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]">
                <Play className="w-6 h-6 text-primary-foreground ml-1" />
              </div>
            </div>
          </div>
          <div className="flex-1">
            <span className="text-primary text-sm font-medium mb-2 block">Em Destaque</span>
            {featuredLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : featuredMatch?.classicName ? (
              <>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
                  {featuredMatch.classicName}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {featuredMatch.homeTeam.name} x {featuredMatch.awayTeam.name} - {featuredMatch.league}.{" "}
                  Confira nossa análise estatística completa do confronto.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
                  Análise Estatística
                </h2>
                <p className="text-muted-foreground mb-4">
                  Confira nossas análises matemáticas das principais partidas. 
                  Dados históricos, tendências e probabilidades calculadas.
                </p>
              </>
            )}
            <Link to="/palpites">
              <Button variant="neon">
                Ver Análises
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Match */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Próximo Grande Jogo</h2>
              {featuredMatch && (
                <p className="text-sm text-muted-foreground">
                  {featuredMatch.league}
                  {featuredMatch.matchday && ` - Rodada ${featuredMatch.matchday}`}
                </p>
              )}
            </div>
          </div>
          <Link to="/resultados">
            <Button variant="ghost" size="sm">
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="glass-card p-8 neon-border">
          {featuredLoading ? (
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex-1 flex flex-col items-center gap-4">
                <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="flex-1 flex flex-col items-center gap-4">
                <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          ) : featuredMatch ? (
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Classic Name Badge */}
              {featuredMatch.classicName && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-medium flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  {featuredMatch.classicName}
                </div>
              )}
              
              {/* Home Team */}
              <div className="flex-1 flex flex-col items-center gap-4">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-muted flex items-center justify-center">
                  <img
                    src={featuredMatch.homeTeam.logo}
                    alt={featuredMatch.homeTeam.name}
                    className="w-20 h-20 md:w-28 md:h-28 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-center">{featuredMatch.homeTeam.name}</h3>
                {featuredMatch.prediction && (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm font-medium">
                      {Math.round(featuredMatch.prediction.probHome)}% Prob.
                    </span>
                  </div>
                )}
              </div>

              {/* VS */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-5xl md:text-6xl font-display font-bold text-muted-foreground">VS</div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{featuredMatch.time}</p>
                  <p className="text-sm text-muted-foreground">{featuredMatch.date}</p>
                </div>
                <Link to={`/palpites`}>
                  <Button variant="premium">
                    <Target className="w-4 h-4" />
                    Ver Palpite
                  </Button>
                </Link>
              </div>

              {/* Away Team */}
              <div className="flex-1 flex flex-col items-center gap-4">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-muted flex items-center justify-center">
                  <img
                    src={featuredMatch.awayTeam.logo}
                    alt={featuredMatch.awayTeam.name}
                    className="w-20 h-20 md:w-28 md:h-28 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-center">{featuredMatch.awayTeam.name}</h3>
                {featuredMatch.prediction && (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                      {Math.round(featuredMatch.prediction.probAway)}% Prob.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum jogo programado para os próximos dias
            </div>
          )}
        </div>
      </section>

      {/* Live & Recent Matches */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            </div>
            <h2 className="text-xl font-display font-bold">Ao Vivo & Recentes</h2>
          </div>
          <Link to="/resultados">
            <Button variant="ghost" size="sm">
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {matchesLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-4 space-y-4">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          ) : matches && matches.length > 0 ? (
            matches.slice(0, 4).map((match) => (
              <MatchCard key={match.id} {...match} />
            ))
          ) : (
            <p className="col-span-4 text-center text-muted-foreground py-8">
              Nenhuma partida encontrada para hoje
            </p>
          )}
        </div>
      </section>

      {/* Predictions */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Palpites em Destaque</h2>
              <p className="text-sm text-muted-foreground">Análises matemáticas para os próximos jogos</p>
            </div>
          </div>
          <Link to="/palpites">
            <Button variant="ghost" size="sm">
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictions.map((prediction) => (
            <PredictionCard key={prediction.id} {...prediction} />
          ))}
        </div>
      </section>

      {/* Leagues */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-xl font-display font-bold">Ligas Disponíveis</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaguesLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            leagueCards.map((league) => (
              <LeagueCard key={league.id} {...league} />
            ))
          )}
        </div>
      </section>

      {/* News */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-bold">Últimas Notícias</h2>
          </div>
          <Link to="/noticias">
            <Button variant="ghost" size="sm">
              Ver todas
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {noticiasLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="flex flex-col gap-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          </div>
        ) : noticias && noticias.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <NewsCard {...noticias[0]} featured />
            </div>
            <div className="flex flex-col gap-4">
              {noticias.slice(1).map((item) => (
                <NewsCard key={item.id} {...item} />
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 text-center text-muted-foreground">
            Nenhuma notícia publicada ainda
          </div>
        )}
      </section>

      {/* CTA Premium */}
      <section className="container mx-auto px-4 py-16">
        <div className="glass-card p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10" />
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-[100px]" />
          
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-6">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Plano Premium</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Desbloqueie Todo o Potencial
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Acesse estatísticas avançadas, simulador de campeonatos, alertas personalizados 
              e muito mais com o plano Premium.
            </p>
            
            <Link to="/precos">
              <Button variant="premium" size="xl">
                <Crown className="w-5 h-5" />
                Conhecer Planos
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
