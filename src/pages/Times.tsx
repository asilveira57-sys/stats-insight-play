import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAllRecords } from "@/lib/supabaseHelpers";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdSlot } from "@/components/ads/AdSlot";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { 
  Shield, ChevronRight, Search, Globe, MapPin, 
  Star, TrendingUp, Users, Flag, Trophy, Calendar, Clock
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Time {
  id: string;
  nome: string;
  slug: string | null;
  pais: string | null;
  priority_score: number | null;
  cores: { primary?: string; secondary?: string } | null;
}

interface MatchCount {
  time_id: string;
  recent: number;
  upcoming: number;
}

// Mapeamento de países para regiões
const regionMap: Record<string, string> = {
  // América do Sul - português e inglês
  'Brasil': 'América do Sul',
  'Brazil': 'América do Sul',
  'Argentina': 'América do Sul',
  'Colômbia': 'América do Sul',
  'Colombia': 'América do Sul',
  'Chile': 'América do Sul',
  'Uruguai': 'América do Sul',
  'Uruguay': 'América do Sul',
  'Paraguai': 'América do Sul',
  'Paraguay': 'América do Sul',
  'Peru': 'América do Sul',
  'Equador': 'América do Sul',
  'Ecuador': 'América do Sul',
  'Bolívia': 'América do Sul',
  'Bolivia': 'América do Sul',
  'Venezuela': 'América do Sul',
  // América do Norte
  'México': 'América do Norte',
  'Mexico': 'América do Norte',
  'Estados Unidos': 'América do Norte',
  'United States': 'América do Norte',
  'USA': 'América do Norte',
  'Canadá': 'América do Norte',
  'Canada': 'América do Norte',
  // Europa - português e inglês
  'Inglaterra': 'Europa',
  'England': 'Europa',
  'Espanha': 'Europa',
  'Spain': 'Europa',
  'Alemanha': 'Europa',
  'Germany': 'Europa',
  'Itália': 'Europa',
  'Italy': 'Europa',
  'França': 'Europa',
  'France': 'Europa',
  'Portugal': 'Europa',
  'Holanda': 'Europa',
  'Netherlands': 'Europa',
  'Países Baixos': 'Europa',
  'Bélgica': 'Europa',
  'Belgium': 'Europa',
  'Rússia': 'Europa',
  'Russia': 'Europa',
  'Turquia': 'Europa',
  'Turkey': 'Europa',
  'Escócia': 'Europa',
  'Scotland': 'Europa',
  'Grécia': 'Europa',
  'Greece': 'Europa',
  'Suíça': 'Europa',
  'Switzerland': 'Europa',
  'Áustria': 'Europa',
  'Austria': 'Europa',
  'Ucrânia': 'Europa',
  'Ukraine': 'Europa',
  'Polônia': 'Europa',
  'Poland': 'Europa',
  'Croácia': 'Europa',
  'Croatia': 'Europa',
  'Sérvia': 'Europa',
  'Serbia': 'Europa',
  'Dinamarca': 'Europa',
  'Denmark': 'Europa',
  'Suécia': 'Europa',
  'Sweden': 'Europa',
  'Noruega': 'Europa',
  'Norway': 'Europa',
  'Finlândia': 'Europa',
  'Finland': 'Europa',
  'República Tcheca': 'Europa',
  'Czech Republic': 'Europa',
  'Romênia': 'Europa',
  'Romania': 'Europa',
  'Hungria': 'Europa',
  'Hungary': 'Europa',
};

const regionOrder = ['América do Sul', 'Europa', 'América do Norte', 'Outros'];

const regionIcons: Record<string, any> = {
  'América do Sul': Flag,
  'Europa': Globe,
  'América do Norte': MapPin,
  'Outros': Star,
};

export default function Times() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: times, isLoading } = useQuery({
    queryKey: ['times-hub'],
    queryFn: async () => {
      // Buscar TODOS os times sem limite usando paginação
      const data = await fetchAllRecords<Time>(
        'times',
        'id, nome, slug, pais, escudo_url, priority_score, cores',
        undefined,
        { column: 'priority_score', ascending: false }
      );
      return data;
    },
  });

  // Buscar contagem de partidas por time (TODOS os registros)
  const { data: matchCounts } = useQuery({
    queryKey: ['times-match-counts'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      // Buscar TODAS as partidas recentes (últimos 30 dias, finalizadas)
      const recentMatches = await fetchAllRecords<{ time_casa_id: string | null; time_fora_id: string | null }>(
        'partidas',
        'time_casa_id, time_fora_id',
        (query) => query
          .eq('status', 'finished')
          .gte('data', thirtyDaysAgo)
          .lte('data', today)
      );

      // Buscar TODAS as próximas partidas
      const upcomingMatches = await fetchAllRecords<{ time_casa_id: string | null; time_fora_id: string | null }>(
        'partidas',
        'time_casa_id, time_fora_id',
        (query) => query
          .eq('status', 'scheduled')
          .gte('data', today)
      );

      // Contar por time
      const counts = new Map<string, { recent: number; upcoming: number }>();

      recentMatches?.forEach(match => {
        if (match.time_casa_id) {
          const existing = counts.get(match.time_casa_id) || { recent: 0, upcoming: 0 };
          existing.recent++;
          counts.set(match.time_casa_id, existing);
        }
        if (match.time_fora_id) {
          const existing = counts.get(match.time_fora_id) || { recent: 0, upcoming: 0 };
          existing.recent++;
          counts.set(match.time_fora_id, existing);
        }
      });

      upcomingMatches?.forEach(match => {
        if (match.time_casa_id) {
          const existing = counts.get(match.time_casa_id) || { recent: 0, upcoming: 0 };
          existing.upcoming++;
          counts.set(match.time_casa_id, existing);
        }
        if (match.time_fora_id) {
          const existing = counts.get(match.time_fora_id) || { recent: 0, upcoming: 0 };
          existing.upcoming++;
          counts.set(match.time_fora_id, existing);
        }
      });

      return counts;
    },
  });

  const getMatchCount = (timeId: string) => {
    return matchCounts?.get(timeId) || { recent: 0, upcoming: 0 };
  };

  // Agrupar por região
  const groupedByRegion = useMemo(() => {
    if (!times) return {};

    const filtered = times.filter(time => 
      time.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (time.pais?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groups: Record<string, Time[]> = {};

    filtered.forEach(time => {
      const region = time.pais ? (regionMap[time.pais] || 'Outros') : 'Outros';
      if (!groups[region]) {
        groups[region] = [];
      }
      groups[region].push(time);
    });

    // Ordenar por regionOrder
    const orderedGroups: Record<string, Time[]> = {};
    regionOrder.forEach(region => {
      if (groups[region]) {
        orderedGroups[region] = groups[region];
      }
    });

    return orderedGroups;
  }, [times, searchTerm]);

  const totalTimes = times?.length || 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Times</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">Times</h1>
              <p className="text-muted-foreground">
                Explore estatísticas, análises e histórico de {totalTimes} clubes e seleções
              </p>
            </div>
          </div>
        </div>

        {/* Intro Card */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <h2 className="font-semibold text-lg mb-2">Central de Times</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Acesse páginas dedicadas para cada time com estatísticas completas, 
                  resultados recentes, próximos jogos, histórico de confrontos e análises 
                  detalhadas. Cada página pilar é atualizada automaticamente com os dados mais recentes.
                </p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="px-4">
                  <p className="text-2xl font-bold text-primary">{totalTimes}</p>
                  <p className="text-xs text-muted-foreground">Times</p>
                </div>
                <div className="px-4 border-l border-border">
                  <p className="text-2xl font-bold text-secondary">{Object.keys(groupedByRegion).length}</p>
                  <p className="text-xs text-muted-foreground">Regiões</p>
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
              placeholder="Buscar time ou país..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>

        <AdSlot position="article-intro" />

        {/* Lista de Times por Região */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg" />
                    <div className="flex-1">
                      <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.keys(groupedByRegion).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedByRegion).map(([region, timesRegion]) => {
              const RegionIcon = regionIcons[region] || Globe;
              
              return (
                <section key={region}>
                  <div className="flex items-center gap-2 mb-4">
                    <RegionIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">{region}</h2>
                    <Badge variant="outline" className="ml-2">
                      {timesRegion.length} {timesRegion.length === 1 ? 'time' : 'times'}
                    </Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {timesRegion.map((time) => (
                      <Link 
                        key={time.id} 
                        to={`/times/${time.slug || time.id}`}
                        className="group"
                      >
                        <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <TeamBadge 
                                name={time.nome} 
                                primaryColor={time.cores?.primary}
                                secondaryColor={time.cores?.secondary}
                                size="md"
                                className="flex-shrink-0"
                              />
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                  {time.nome}
                                </h3>
                                {time.pais && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {time.pais}
                                  </p>
                                )}
                              </div>

                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </div>

                            {/* Match counts */}
                            {(() => {
                              const counts = getMatchCount(time.id);
                              if (counts.recent === 0 && counts.upcoming === 0) return null;
                              
                              return (
                                <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                                  {counts.recent > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{counts.recent} recente{counts.recent !== 1 ? 's' : ''}</span>
                                    </div>
                                  )}
                                  {counts.upcoming > 0 && (
                                    <div className="flex items-center gap-1 text-primary">
                                      <Calendar className="w-3 h-3" />
                                      <span>{counts.upcoming} próximo{counts.upcoming !== 1 ? 's' : ''}</span>
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
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum time encontrado</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm 
                  ? `Não encontramos resultados para "${searchTerm}"`
                  : "Nenhum time disponível no momento"
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
              Explore mais
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Link 
                to="/ranking-selecoes" 
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <Flag className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Ranking Seleções</p>
                  <p className="text-xs text-muted-foreground">Performance nacional</p>
                </div>
              </Link>
              
              <Link 
                to="/confrontos" 
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Confrontos Diretos</p>
                  <p className="text-xs text-muted-foreground">Histórico entre times</p>
                </div>
              </Link>
              
              <Link 
                to="/campeonatos" 
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <Trophy className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Campeonatos</p>
                  <p className="text-xs text-muted-foreground">Competições disponíveis</p>
                </div>
              </Link>
              
              <Link 
                to="/resultados" 
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Jogos do Dia</p>
                  <p className="text-xs text-muted-foreground">Resultados e próximos</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* SEO Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-semibold mb-4">Sobre os Times</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-muted-foreground text-sm leading-relaxed">
              O Statball oferece cobertura completa dos principais clubes e seleções do mundo. 
              Cada página de time é uma central de informações com estatísticas atualizadas, 
              resultados recentes, próximos jogos, histórico de desempenho e análises matemáticas 
              exclusivas. Nossa cobertura prioriza o futebol brasileiro (clubes da Série A e B) 
              e as principais equipes europeias, além das seleções nacionais que disputam 
              competições internacionais como Copa do Mundo, Copa América e Eurocopa.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
