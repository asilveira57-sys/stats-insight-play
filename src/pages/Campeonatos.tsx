import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdSlot } from "@/components/ads/AdSlot";
import { 
  Trophy, ChevronRight, Search, Globe, MapPin, 
  Star, TrendingUp, Calendar, Flag, Shield, Users
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Liga {
  id: string;
  nome: string;
  slug: string | null;
  pais: string | null;
  logo_url: string | null;
  ativa: boolean | null;
  priority_score: number | null;
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
  'South America': 'América do Sul',
  'Sul-Americano': 'América do Sul',
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
  'Europe': 'Europa',
  // Internacional
  'Internacional': 'Internacional',
  'International': 'Internacional',
  'Mundial': 'Internacional',
  'World': 'Internacional',
};

const regionOrder = ['América do Sul', 'Europa', 'América do Norte', 'Internacional', 'Outros'];

const regionIcons: Record<string, any> = {
  'América do Sul': Flag,
  'Europa': Globe,
  'América do Norte': MapPin,
  'Internacional': Trophy,
  'Outros': Star,
};

export default function Campeonatos() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: ligas, isLoading } = useQuery({
    queryKey: ['campeonatos-hub'],
    queryFn: async () => {
      // Buscar TODAS as ligas ativas sem limite
      const data = await fetchAllRecords<Liga>(
        'ligas',
        'id, nome, slug, pais, logo_url, ativa, priority_score',
        (query) => query.eq('ativa', true),
        { column: 'priority_score', ascending: false }
      );
      return data;
    },
  });

  // Buscar contagem de partidas por liga (TODOS os registros)
  const { data: matchCounts } = useQuery({
    queryKey: ['campeonatos-match-counts'],
    queryFn: async () => {
      // Buscar TODAS as partidas sem limite
      const data = await fetchAllRecords<{ liga_id: string | null }>(
        'partidas',
        'liga_id'
      );

      const counts = new Map<string, number>();
      data.forEach(match => {
        if (match.liga_id) {
          counts.set(match.liga_id, (counts.get(match.liga_id) || 0) + 1);
        }
      });

      return counts;
    },
  });

  // Buscar contagem de times por liga (via TODAS as partidas)
  const { data: teamCounts } = useQuery({
    queryKey: ['campeonatos-team-counts'],
    queryFn: async () => {
      // Buscar TODAS as partidas sem limite
      const data = await fetchAllRecords<{ liga_id: string | null; time_casa_id: string | null; time_fora_id: string | null }>(
        'partidas',
        'liga_id, time_casa_id, time_fora_id'
      );

      const teamsByLiga = new Map<string, Set<string>>();
      data.forEach(match => {
        if (match.liga_id) {
          if (!teamsByLiga.has(match.liga_id)) {
            teamsByLiga.set(match.liga_id, new Set());
          }
          const teams = teamsByLiga.get(match.liga_id)!;
          if (match.time_casa_id) teams.add(match.time_casa_id);
          if (match.time_fora_id) teams.add(match.time_fora_id);
        }
      });

      const counts = new Map<string, number>();
      teamsByLiga.forEach((teams, ligaId) => {
        counts.set(ligaId, teams.size);
      });

      return counts;
    },
  });

  const getStats = (ligaId: string) => ({
    matches: matchCounts?.get(ligaId) || 0,
    teams: teamCounts?.get(ligaId) || 0,
  });

  // Agrupar por região
  const groupedByRegion = useMemo(() => {
    if (!ligas) return {};

    const filtered = ligas.filter(liga => 
      liga.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (liga.pais?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groups: Record<string, Liga[]> = {};

    filtered.forEach(liga => {
      const region = liga.pais ? (regionMap[liga.pais] || 'Outros') : 'Outros';
      if (!groups[region]) {
        groups[region] = [];
      }
      groups[region].push(liga);
    });

    // Ordenar por regionOrder
    const orderedGroups: Record<string, Liga[]> = {};
    regionOrder.forEach(region => {
      if (groups[region]) {
        orderedGroups[region] = groups[region];
      }
    });

    return orderedGroups;
  }, [ligas, searchTerm]);

  const totalLigas = ligas?.length || 0;

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
                  Cada página pilar é atualizada automaticamente com os dados mais recentes.
                </p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="px-4">
                  <p className="text-2xl font-bold text-primary">{totalLigas}</p>
                  <p className="text-xs text-muted-foreground">Competições</p>
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
              placeholder="Buscar campeonato ou país..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>

        <AdSlot position="article-intro" />

        {/* Lista de Campeonatos por Região */}
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
        ) : Object.keys(groupedByRegion).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedByRegion).map(([region, ligasRegion]) => {
              const RegionIcon = regionIcons[region] || Globe;
              
              return (
                <section key={region}>
                  <div className="flex items-center gap-2 mb-4">
                    <RegionIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">{region}</h2>
                    <Badge variant="outline" className="ml-2">
                      {ligasRegion.length} {ligasRegion.length === 1 ? 'competição' : 'competições'}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {ligasRegion.map((liga) => (
                      <Link 
                        key={liga.id} 
                        to={`/campeonatos/${liga.slug || liga.id}`}
                        className="group"
                      >
                        <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {liga.logo_url ? (
                                <img 
                                  src={liga.logo_url} 
                                  alt={liga.nome}
                                  className="w-10 h-10 object-contain"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                  <Trophy className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                  {liga.nome}
                                </h3>
                                {liga.pais && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {liga.pais}
                                  </p>
                                )}
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
            })}
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
          <h2 className="text-xl font-semibold mb-4">Sobre os Campeonatos</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-muted-foreground text-sm leading-relaxed">
              O Statball oferece cobertura completa das principais competições de futebol do mundo. 
              Cada página de campeonato é uma central de informações com classificações atualizadas, 
              estatísticas de times e jogadores, histórico de partidas e análises matemáticas exclusivas. 
              Nossa cobertura prioriza o futebol brasileiro (Brasileirão Série A e B, Copa do Brasil) 
              e as principais ligas europeias (Premier League, La Liga, Serie A, Bundesliga, Ligue 1), 
              além de competições internacionais como Copa do Mundo, Copa América e UEFA Champions League.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
