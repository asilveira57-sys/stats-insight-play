import { Layout } from "@/components/layout/Layout";
import { MatchCard } from "@/components/cards/MatchCard";
import { LeagueCard } from "@/components/cards/LeagueCard";
import { PredictionCard } from "@/components/cards/PredictionCard";
import { NewsCard } from "@/components/cards/NewsCard";
import { Button } from "@/components/ui/button";
import { leagues, upcomingMatches, predictions, news } from "@/data/mockData";
import { 
  Zap, 
  TrendingUp, 
  Trophy, 
  ChevronRight, 
  Play, 
  BarChart3,
  Target,
  Crown
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
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

      {/* Video Showcase */}
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
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
              Análise Completa: El Clásico
            </h2>
            <p className="text-muted-foreground mb-4">
              Confira nossa análise estatística completa do confronto entre Real Madrid e Barcelona. 
              Dados históricos, tendências e probabilidades calculadas.
            </p>
            <Button variant="neon">
              Assistir Análise
              <ChevronRight className="w-4 h-4" />
            </Button>
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
              <p className="text-sm text-muted-foreground">Premier League - Rodada 17</p>
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
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-muted flex items-center justify-center">
                <img
                  src="https://crests.football-data.org/65.png"
                  alt="Manchester City"
                  className="w-20 h-20 md:w-28 md:h-28 object-contain"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-center">Manchester City</h3>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm font-medium">
                  52% Prob.
                </span>
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-4">
              <div className="text-5xl md:text-6xl font-display font-bold text-muted-foreground">VS</div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">14:30</p>
                <p className="text-sm text-muted-foreground">15 Dezembro</p>
              </div>
              <Link to="/palpites/1">
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
                  src="https://crests.football-data.org/64.png"
                  alt="Liverpool"
                  className="w-20 h-20 md:w-28 md:h-28 object-contain"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-center">Liverpool</h3>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                  28% Prob.
                </span>
              </div>
            </div>
          </div>
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
          {upcomingMatches.map((match) => (
            <MatchCard key={match.id} {...match} />
          ))}
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
          {leagues.map((league) => (
            <LeagueCard key={league.id} {...league} />
          ))}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <NewsCard {...news[0]} featured />
          </div>
          <div className="flex flex-col gap-4">
            {news.slice(1).map((item) => (
              <NewsCard key={item.id} {...item} />
            ))}
          </div>
        </div>
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
