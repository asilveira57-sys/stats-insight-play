import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdSlot } from "@/components/ads/AdSlot";
import { 
  Trophy, ChevronRight, Search, Globe, MapPin, 
  Star, TrendingUp, Calendar, Flag, Shield
} from "lucide-react";
import { useState } from "react";
import { useCampeonatos, type CategoriaLigas } from "@/hooks/useCampeonatos";
import { LeagueLogo } from "@/components/ui/LeagueLogo";

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'MapPin': MapPin,
  'Flag': Flag,
  'Trophy': Trophy,
  'Globe': Globe,
  'Star': Star,
};

function CategoriaSection({ categoria, getStats }: { 
  categoria: CategoriaLigas; 
  getStats: (ligaId: string) => { matches: number; teams: number };
}) {
  const IconComponent = iconMap[categoria.icon] || Globe;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <IconComponent className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">{categoria.nome}</h2>
        <Badge variant="outline" className="ml-2">
          {categoria.ligas.length} {categoria.ligas.length === 1 ? 'competição' : 'competições'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categoria.ligas.map((liga) => (
          <Link 
            key={liga.id} 
            to={`/campeonatos/${liga.slug || liga.id}`}
            className="group"
          >
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <LeagueLogo
                      logoUrl={liga.logo_url}
                      name={liga.nome}
                      country={liga.pais}
                      size="lg"
                      className="w-8 h-8"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {liga.nome}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {liga.estado ? `${liga.estado}, ` : ''}{liga.pais || 'Internacional'}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>

                {/* Stats */}
                {(() => {
                  const stats = getStats(liga.id);
                  const hasStats = stats.matches > 0 || stats.teams > 0;
                  const isHighPriority = liga.priority_score && liga.priority_score > 50;
                  
                  if (!hasStats && !isHighPriority) return null;
                  
                  return (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                      {stats.teams > 0 && (
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span>{stats.teams} times</span>
                        </div>
                      )}
                      {stats.matches > 0 && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{stats.matches} partidas</span>
                        </div>
                      )}
                      {isHighPriority && (
                        <div className="flex items-center gap-1 ml-auto text-secondary">
                          <TrendingUp className="w-3 h-3" />
                          <span>Destaque</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Campeonatos() {
  const [searchTerm, setSearchTerm] = useState("");
  const { categorias, totalLigas, isLoading, getStats } = useCampeonatos(searchTerm);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Campeonatos</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">Campeonatos</h1>
              <p className="text-muted-foreground">
                Explore estatísticas, análises e histórico de {totalLigas} competições
              </p>
            </div>
          </div>
        </div>

        {/* Intro Card */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <h2 className="font-semibold text-lg mb-2">Central de Competições</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Acesse páginas dedicadas para cada campeonato com estatísticas completas, 
                  classificações, artilheiros, histórico de confrontos e análises detalhadas.
                </p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="px-4">
                  <p className="text-2xl font-bold text-primary">{totalLigas}</p>
                  <p className="text-xs text-muted-foreground">Competições</p>
                </div>
                <div className="px-4 border-l border-border">
                  <p className="text-2xl font-bold text-secondary">{categorias.length}</p>
                  <p className="text-xs text-muted-foreground">Categorias</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campeonato, país ou estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>

        <AdSlot position="article-intro" />

        {/* Lista de Campeonatos por Categoria */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categorias.length > 0 ? (
          <div className="space-y-8">
            {categorias.map((categoria) => (
              <CategoriaSection 
                key={categoria.nome} 
                categoria={categoria} 
                getStats={getStats}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum campeonato encontrado</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm 
                  ? `Não encontramos resultados para "${searchTerm}"`
                  : "Nenhuma competição disponível no momento"
                }
              </p>
            </CardContent>
          </Card>
        )}

        <AdSlot position="article-end" />

        {/* Links Rápidos */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Destaques
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Link 
                to="/artilheiros" 
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <Trophy className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Artilheiros</p>
                  <p className="text-xs text-muted-foreground">Ranking de goleadores</p>
                </div>
              </Link>
              
              <Link 
                to="/resultados" 
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Jogos do Dia</p>
                  <p className="text-xs text-muted-foreground">Resultados e próximos</p>
                </div>
              </Link>
              
              <Link 
                to="/estatisticas" 
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Estatísticas</p>
                  <p className="text-xs text-muted-foreground">Dados detalhados</p>
                </div>
              </Link>
              
              <Link 
                to="/palpites" 
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <Star className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Palpites</p>
                  <p className="text-xs text-muted-foreground">Análises matemáticas</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* SEO Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold mb-4">Sobre as Competições</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            O Statball acompanha as principais competições de futebol do Brasil e do mundo.
            Desde os campeonatos estaduais até as grandes ligas europeias e torneios internacionais,
            oferecemos estatísticas completas, análises detalhadas e previsões baseadas em dados.
          </p>
          <div className="flex flex-wrap gap-2">
            {categorias.flatMap(c => c.ligas.slice(0, 3)).slice(0, 12).map(liga => (
              <Link 
                key={liga.id}
                to={`/campeonatos/${liga.slug || liga.id}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {liga.nome}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
