import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar,
  Trophy,
  TrendingUp,
  Bot,
  Users,
  ArrowRight,
  Home,
  ChevronRight as ChevronRightIcon,
  FileText,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { AdSlot } from "@/components/ads/AdSlot";
import { PremiumCTA } from "@/components/news/PremiumCTA";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface WeeklyArticle {
  id: string;
  titulo: string;
  resumo: string | null;
  slug: string | null;
  imagem_url: string | null;
  data_publicacao: string | null;
}

function extractWeekInfo(slug: string): { week: number; year: number; league: string } | null {
  const match = slug.match(/validacao-semana-(\d+)-temporada-(\d+)-(.+)/);
  if (match) {
    return {
      week: parseInt(match[1]),
      year: parseInt(match[2]),
      league: match[3].replace(/-/g, ' ')
    };
  }
  return null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default function ValidacaoSemanal() {
  const { data: weeklyArticles, isLoading } = useQuery({
    queryKey: ['weekly-validation-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('noticias')
        .select('id, titulo, resumo, slug, imagem_url, data_publicacao')
        .like('slug', 'validacao-semana-%')
        .eq('publicada', true)
        .order('data_publicacao', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WeeklyArticle[];
    }
  });

  // Group articles by year
  const groupedByYear = useMemo(() => {
    if (!weeklyArticles) return {};
    
    const groups: Record<number, WeeklyArticle[]> = {};
    
    weeklyArticles.forEach(article => {
      if (!article.slug) return;
      const info = extractWeekInfo(article.slug);
      if (info) {
        if (!groups[info.year]) {
          groups[info.year] = [];
        }
        groups[info.year].push(article);
      }
    });
    
    return groups;
  }, [weeklyArticles]);

  const years = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a);

  return (
    <Layout>
      <title>Série Semanal de Validação — IA x Humanos | Statball</title>
      <meta name="description" content="Acompanhe a série semanal de validação de previsões do Statball. Comparamos IA e leitura humana com resultados reais a cada rodada." />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
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
              <ChevronRightIcon className="w-4 h-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Validação Semanal</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-green-500/20">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                Série Semanal de Validação
              </h1>
              <p className="text-muted-foreground mt-1">
                Boletim recorrente: IA x Humanos a cada rodada
              </p>
            </div>
          </div>
        </div>

        {/* Intro Section */}
        <Card className="bg-gradient-to-br from-primary/5 to-green-500/5 border-primary/20 mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-3">O que é a Série Semanal?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A cada semana esportiva, publicamos um boletim de validação que resume e analisa 
              as previsões realizadas, comparando o desempenho da <strong>Inteligência Artificial</strong> 
              com os palpites da <strong>comunidade de usuários</strong>.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Esses artigos funcionam como um diário de transparência: mostramos onde acertamos, 
              onde erramos, e o que aprendemos para as próximas rodadas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary">
                <FileText className="w-3 h-3 mr-1" />
                Publicação semanal
              </Badge>
              <Badge variant="secondary">
                <BarChart3 className="w-3 h-3 mr-1" />
                Dados reais
              </Badge>
              <Badge variant="secondary">
                <TrendingUp className="w-3 h-3 mr-1" />
                Aprendizado contínuo
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Ad Slot 1 */}
        <AdSlot position="article-intro" className="mb-8" />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{weeklyArticles?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Validações semanais</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 text-center">
              <Bot className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">IA</p>
              <p className="text-sm text-muted-foreground">Modelo estatístico</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">Humanos</p>
              <p className="text-sm text-muted-foreground">Palpites da comunidade</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">vs</p>
              <p className="text-sm text-muted-foreground">Comparação direta</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="mb-8">
          <PremiumCTA 
            variant="subtle"
            message="Membros do Clube Statball acompanham validações completas e sem anúncios."
          />
        </div>

        {/* Articles List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : years.length === 0 ? (
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma validação semanal ainda</h3>
              <p className="text-muted-foreground">
                As validações semanais serão publicadas automaticamente após cada rodada. 
                Enquanto isso, confira o{' '}
                <Link to="/ranking/ia-vs-humanos" className="text-primary hover:underline">
                  ranking histórico
                </Link>.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {years.map(year => (
              <div key={year}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Temporada {year}
                </h2>
                <div className="grid gap-4">
                  {groupedByYear[year].map(article => {
                    const weekInfo = article.slug ? extractWeekInfo(article.slug) : null;
                    
                    return (
                      <Link 
                        key={article.id} 
                        to={`/noticias/${article.slug}`}
                        className="block"
                      >
                        <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {article.imagem_url && (
                                <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                                  <img 
                                    src={article.imagem_url} 
                                    alt={article.titulo}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {weekInfo && (
                                    <>
                                      <Badge variant="secondary" className="text-xs">
                                        Semana {weekInfo.week}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {weekInfo.league}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                                <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">
                                  {article.titulo}
                                </h3>
                                {article.resumo && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {article.resumo}
                                  </p>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                  {article.data_publicacao && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(article.data_publicacao)}
                                    </span>
                                  )}
                                  <span className="text-xs text-primary flex items-center gap-1">
                                    Ler análise <ArrowRight className="w-3 h-3" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ad Slot 2 */}
        <AdSlot position="article-mid" className="my-8" />

        {/* Related Content */}
        <Card className="bg-card/50 border-border/50 mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Conteúdos Relacionados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Link 
                to="/performance/previsoes"
                className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <BarChart3 className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-sm">Performance de Previsões</p>
                <p className="text-xs text-muted-foreground">Metodologia e resultados</p>
              </Link>
              <Link 
                to="/ranking/ia-vs-humanos"
                className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Trophy className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-sm">Ranking IA vs Humanos</p>
                <p className="text-xs text-muted-foreground">Histórico completo</p>
              </Link>
              <Link 
                to="/noticias"
                className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <FileText className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-sm">Todas as Notícias</p>
                <p className="text-xs text-muted-foreground">Validações individuais</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Final CTA */}
        <div className="mt-8">
          <PremiumCTA 
            variant="prominent"
            message="O acesso Premium libera análises aprofundadas por campeonato e período, sem anúncios."
          />
        </div>
      </div>
    </Layout>
  );
}
