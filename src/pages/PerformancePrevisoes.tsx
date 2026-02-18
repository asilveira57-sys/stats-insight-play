import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Bot,
  Users,
  BarChart3,
  BookOpen,
  CheckCircle2,
  XCircle,
  Minus,
  ArrowRight,
  Sparkles,
  LineChart,
  Home,
  ChevronRight as ChevronRightIcon,
  Brain,
  Shield,
  Lightbulb,
  History,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
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

interface ComparisonData {
  id: string;
  partida_id: string;
  sistema_acertou_resultado: boolean | null;
  sistema_acertou_placar: boolean | null;
  total_usuarios_palpitaram: number | null;
  usuarios_acertaram_resultado: number | null;
  usuarios_acertaram_placar: number | null;
  created_at: string | null;
  partidas: {
    data: string;
    ligas: { nome: string; slug: string | null } | null;
  } | null;
}

interface ValidationArticle {
  id: string;
  titulo: string;
  slug: string | null;
  data_publicacao: string | null;
}

function MethodologyCard({ 
  icon, 
  title, 
  description,
  items
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  items: string[];
}) {
  return (
    <Card className="bg-card/50 border-border/50 h-full">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{description}</p>
            <ul className="space-y-1">
              {items.map((item, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AccuracyCriteriaCard({ 
  type, 
  icon, 
  title, 
  description,
  example
}: { 
  type: "success" | "partial" | "error";
  icon: React.ReactNode; 
  title: string; 
  description: string;
  example: string;
}) {
  const bgClass = type === "success" 
    ? "bg-green-500/10 border-green-500/30" 
    : type === "partial" 
    ? "bg-yellow-500/10 border-yellow-500/30"
    : "bg-red-500/10 border-red-500/30";
  
  return (
    <Card className={`${bgClass}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0">{icon}</div>
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground/70 mt-2 italic">{example}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerformancePrevisoes() {
  const { data: comparisons, isLoading } = useQuery({
    queryKey: ['performance-previsoes-data'],
    queryFn: async () => {
      const data = await fetchAllRecords<ComparisonData>(
        'comparativo_resultados',
        `id, partida_id, sistema_acertou_resultado, sistema_acertou_placar,
         total_usuarios_palpitaram, usuarios_acertaram_resultado, usuarios_acertaram_placar,
         created_at, partidas!inner(data, ligas!inner(nome, slug))`,
        undefined,
        { column: 'created_at', ascending: false }
      );
      return data;
    }
  });

  // Fetch recent validation articles
  const { data: validationArticles } = useQuery({
    queryKey: ['validation-articles-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('noticias')
        .select('id, titulo, slug, data_publicacao')
        .ilike('slug', '%-validacao-palpites')
        .eq('publicada', true)
        .order('data_publicacao', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as ValidationArticle[];
    }
  });

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!comparisons?.length) return null;
    
    const total = comparisons.length;
    const iaAcertosResultado = comparisons.filter(c => c.sistema_acertou_resultado).length;
    const iaAcertosPlacar = comparisons.filter(c => c.sistema_acertou_placar).length;
    
    let totalUsuariosPalpitaram = 0;
    let totalUsuariosAcertaramResultado = 0;
    let totalUsuariosAcertaramPlacar = 0;
    
    comparisons.forEach(c => {
      totalUsuariosPalpitaram += c.total_usuarios_palpitaram || 0;
      totalUsuariosAcertaramResultado += c.usuarios_acertaram_resultado || 0;
      totalUsuariosAcertaramPlacar += c.usuarios_acertaram_placar || 0;
    });
    
    const taxaUsuariosResultado = totalUsuariosPalpitaram > 0 
      ? (totalUsuariosAcertaramResultado / totalUsuariosPalpitaram) * 100 
      : 0;
    
    return {
      total,
      ia: {
        acertosResultado: iaAcertosResultado,
        acertosPlacar: iaAcertosPlacar,
        taxaResultado: (iaAcertosResultado / total) * 100,
        taxaPlacar: (iaAcertosPlacar / total) * 100,
      },
      humanos: {
        totalPalpites: totalUsuariosPalpitaram,
        acertosResultado: totalUsuariosAcertaramResultado,
        acertosPlacar: totalUsuariosAcertaramPlacar,
        taxaResultado: taxaUsuariosResultado,
        taxaPlacar: totalUsuariosPalpitaram > 0 
          ? (totalUsuariosAcertaramPlacar / totalUsuariosPalpitaram) * 100 
          : 0,
      }
    };
  }, [comparisons]);

  // Stats by campeonato
  const statsByCampeonato = useMemo(() => {
    if (!comparisons) return [];
    
    const campStats: Record<string, {
      nome: string;
      slug: string | null;
      total: number;
      iaAcertos: number;
      usuariosPalpites: number;
      usuariosAcertos: number;
    }> = {};
    
    comparisons.forEach(c => {
      const liga = c.partidas?.ligas;
      if (!liga?.nome) return;
      
      if (!campStats[liga.nome]) {
        campStats[liga.nome] = {
          nome: liga.nome,
          slug: liga.slug,
          total: 0,
          iaAcertos: 0,
          usuariosPalpites: 0,
          usuariosAcertos: 0,
        };
      }
      
      campStats[liga.nome].total++;
      if (c.sistema_acertou_resultado) campStats[liga.nome].iaAcertos++;
      campStats[liga.nome].usuariosPalpites += c.total_usuarios_palpitaram || 0;
      campStats[liga.nome].usuariosAcertos += c.usuarios_acertaram_resultado || 0;
    });
    
    return Object.values(campStats)
      .map(s => ({
        ...s,
        taxaIA: s.total > 0 ? (s.iaAcertos / s.total) * 100 : 0,
        taxaHumanos: s.usuariosPalpites > 0 ? (s.usuariosAcertos / s.usuariosPalpites) * 100 : 0,
      }))
      .filter(s => s.total >= 3)
      .sort((a, b) => b.total - a.total);
  }, [comparisons]);

  // Evolution over time (monthly)
  const evolutionData = useMemo(() => {
    if (!comparisons) return [];
    
    const monthlyStats: Record<string, { month: string; ia: number; iaTotal: number; humanos: number; humanosTotal: number }> = {};
    
    comparisons.forEach(c => {
      if (!c.partidas?.data) return;
      const date = new Date(c.partidas.data);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { month: monthLabel, ia: 0, iaTotal: 0, humanos: 0, humanosTotal: 0 };
      }
      
      monthlyStats[monthKey].iaTotal++;
      if (c.sistema_acertou_resultado) monthlyStats[monthKey].ia++;
      monthlyStats[monthKey].humanosTotal += c.total_usuarios_palpitaram || 0;
      monthlyStats[monthKey].humanos += c.usuarios_acertaram_resultado || 0;
    });
    
    return Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([_, data]) => ({
        month: data.month,
        IA: data.iaTotal > 0 ? Math.round((data.ia / data.iaTotal) * 100) : 0,
        Humanos: data.humanosTotal > 0 ? Math.round((data.humanos / data.humanosTotal) * 100) : 0,
      }));
  }, [comparisons]);

  // Chart data for comparison
  const chartData = useMemo(() => {
    return statsByCampeonato.slice(0, 6).map(s => ({
      campeonato: s.nome.length > 12 ? s.nome.slice(0, 12) + '...' : s.nome,
      fullName: s.nome,
      IA: Math.round(s.taxaIA),
      Humanos: Math.round(s.taxaHumanos),
      partidas: s.total,
    }));
  }, [statsByCampeonato]);

  return (
    <Layout>
      {/* SEO Meta */}
      <title>Performance de previsões no futebol: IA x Humanos | Statball</title>
      <meta name="description" content="Análise completa da performance de previsões de futebol. Compare o desempenho da Inteligência Artificial com palpites humanos. Metodologia transparente e dados históricos validados." />
      
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
              <BreadcrumbPage>Performance de Previsões</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-green-500/20">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                Performance de Previsões no Futebol
              </h1>
              <p className="text-muted-foreground mt-1">
                Análise transparente: IA x Leitura Humana
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Introduction */}
        <section className="mb-10">
          <Card className="bg-gradient-to-br from-primary/5 to-green-500/5 border-primary/20">
            <CardContent className="p-6 md:p-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Por que Analisamos Performance de Previsões?
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  No Statball, acreditamos que <strong>transparência é a base da credibilidade</strong>. 
                  Não basta gerar previsões — é fundamental validá-las, aprender com os erros e 
                  evoluir continuamente.
                </p>
                <p>
                  Esta página funciona como o <strong>hub central de performance</strong>, reunindo 
                  todos os dados sobre a eficácia das previsões geradas pela nossa Inteligência 
                  Artificial e pela leitura coletiva da comunidade de usuários.
                </p>
                <p>
                  Aqui você encontra a metodologia utilizada, os critérios de validação, 
                  resultados históricos consolidados e a evolução do desempenho ao longo do tempo.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 mt-6">
                <Badge variant="secondary">
                  <Brain className="w-3 h-3 mr-1" />
                  Análise baseada em dados
                </Badge>
                <Badge variant="secondary">
                  <Shield className="w-3 h-3 mr-1" />
                  Transparência total
                </Badge>
                <Badge variant="secondary">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Aprendizado contínuo
                </Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Ad Slot 1 - After Intro */}
        <AdSlot position="article-intro" className="mb-10" />

        {/* Section 2: Methodology */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Metodologia de Previsões
          </h2>
          <p className="text-muted-foreground mb-6">
            Entenda como cada tipo de previsão é gerado e validado no Statball.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <MethodologyCard
              icon={<Bot className="h-6 w-6 text-primary" />}
              title="Inteligência Artificial (IA)"
              description="Modelo matemático automatizado baseado em estatísticas históricas."
              items={[
                "Análise de últimos confrontos diretos",
                "Desempenho recente das equipes",
                "Fator mandante calculado",
                "Média de gols marcados e sofridos",
                "Modelo de Poisson para probabilidades"
              ]}
            />
            <MethodologyCard
              icon={<Users className="h-6 w-6 text-green-500" />}
              title="Palpite Campeão (Humanos)"
              description="Consenso coletivo da comunidade de usuários."
              items={[
                "Agregação de todos os palpites",
                "Análise do resultado mais votado",
                "Leitura contextual do momento",
                "Fatores qualitativos considerados",
                "Tendência coletiva identificada"
              ]}
            />
          </div>
          
          <Card className="mt-6 bg-muted/30 border-border/50">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Momento de Registro
              </h3>
              <p className="text-sm text-muted-foreground">
                Todas as previsões são <strong>registradas antes do início de cada partida</strong>. 
                Uma vez que o jogo começa, nenhuma alteração é permitida. Isso garante a integridade 
                e comparabilidade dos dados históricos.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Accuracy Criteria */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Critérios de Acerto
          </h2>
          <p className="text-muted-foreground mb-6">
            A validação das previsões segue critérios claros e objetivos, evitando interpretações ambíguas.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <AccuracyCriteriaCard
              type="success"
              icon={<CheckCircle2 className="h-6 w-6 text-green-500" />}
              title="Acerto Total"
              description="Previsão do resultado (vitória/empate/derrota) correta."
              example="Previu: Vitória do Flamengo | Real: Flamengo 2x1"
            />
            <AccuracyCriteriaCard
              type="partial"
              icon={<Minus className="h-6 w-6 text-yellow-500" />}
              title="Acerto de Placar"
              description="Previsão do placar exato correta (critério mais rigoroso)."
              example="Previu: 2x1 | Real: 2x1 ✓"
            />
            <AccuracyCriteriaCard
              type="error"
              icon={<XCircle className="h-6 w-6 text-red-500" />}
              title="Erro"
              description="Previsão do resultado incorreta."
              example="Previu: Empate | Real: Vitória da casa"
            />
          </div>
        </section>

        {/* Section 4: Consolidated Performance */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Performance Consolidada
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : overallStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* IA Stats */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Inteligência Artificial</CardTitle>
                    </div>
                    <CardDescription>Modelo estatístico automatizado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-3xl font-bold text-primary">
                          {overallStats.ia.taxaResultado.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Acertos de Resultado</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {overallStats.ia.acertosResultado} de {overallStats.total} jogos
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-3xl font-bold text-primary/70">
                          {overallStats.ia.taxaPlacar.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Placar Exato</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {overallStats.ia.acertosPlacar} acertos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Human Stats */}
                <Card className="bg-green-500/5 border-green-500/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-500" />
                      <CardTitle className="text-lg">Comunidade (Humanos)</CardTitle>
                    </div>
                    <CardDescription>Palpites coletivos dos usuários</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-3xl font-bold text-green-500">
                          {overallStats.humanos.taxaResultado.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Acertos de Resultado</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {overallStats.humanos.acertosResultado.toLocaleString()} de {overallStats.humanos.totalPalpites.toLocaleString()} palpites
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-background/50">
                        <p className="text-3xl font-bold text-green-500/70">
                          {overallStats.humanos.taxaPlacar.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Placar Exato</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {overallStats.humanos.acertosPlacar.toLocaleString()} acertos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-6">
                  <p className="text-muted-foreground">
                    Com base em <strong>{overallStats.total} partidas analisadas</strong>, 
                    o modelo de IA apresenta uma taxa de acerto de resultado de{' '}
                    <strong className="text-primary">{overallStats.ia.taxaResultado.toFixed(1)}%</strong>, 
                    enquanto a comunidade de usuários registra{' '}
                    <strong className="text-green-500">{overallStats.humanos.taxaResultado.toFixed(1)}%</strong>.
                    Esses dados são atualizados automaticamente após cada partida finalizada.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </section>

        {/* CTA 1 */}
        <div className="mb-10">
          <PremiumCTA 
            variant="subtle"
            message="Membros do Clube Statball acompanham análises completas e sem anúncios."
          />
        </div>

        {/* Section 5: Comparisons by Championship */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Comparativo por Campeonato
          </h2>
          
          {chartData.length > 0 && (
            <Card className="bg-card/50 border-border/50 mb-6">
              <CardContent className="p-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="campeonato" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                      <Legend />
                      <Bar dataKey="IA" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Humanos" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {statsByCampeonato.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statsByCampeonato.slice(0, 6).map(camp => (
                <Card key={camp.nome} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm truncate">{camp.nome}</h3>
                      <Badge variant="secondary" className="text-xs">{camp.total} jogos</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2 rounded bg-primary/10">
                        <p className="text-lg font-bold text-primary">{camp.taxaIA.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">IA</p>
                      </div>
                      <div className="p-2 rounded bg-green-500/10">
                        <p className="text-lg font-bold text-green-500">{camp.taxaHumanos.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Humanos</p>
                      </div>
                    </div>
                    {camp.slug && (
                      <Link 
                        to={`/campeonatos/${camp.slug}`}
                        className="text-xs text-primary hover:underline mt-3 inline-flex items-center gap-1"
                      >
                        Ver campeonato <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Ad Slot 2 - After comparisons */}
        <AdSlot position="article-mid" className="mb-10" />

        {/* Section 6: Evolution Over Time */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <LineChart className="h-6 w-6 text-primary" />
            Evolução ao Longo do Tempo
          </h2>
          
          {evolutionData.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorHumanos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="IA" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorIA)" />
                      <Area type="monotone" dataKey="Humanos" stroke="hsl(142.1 76.2% 36.3%)" fillOpacity={1} fill="url(#colorHumanos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Section 7: Historical Ranking Link */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Ranking Histórico Completo
          </h2>
          
          <Card className="bg-gradient-to-br from-primary/10 to-green-500/10 border-primary/30">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">IA vs Humanos: Ranking Detalhado</h3>
                  <p className="text-muted-foreground">
                    Explore o histórico completo de acertos, filtre por campeonato, período 
                    e veja a tabela detalhada de cada partida analisada.
                  </p>
                </div>
                <Button asChild className="shrink-0">
                  <Link to="/ranking/ia-vs-humanos">
                    Ver Ranking Completo
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 8: Recent Validations */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Validações Recentes
          </h2>
          
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              {validationArticles && validationArticles.length > 0 ? (
                <ul className="space-y-3">
                  {validationArticles.map(article => (
                    <li key={article.id}>
                      <Link 
                        to={`/noticias/${article.slug}`}
                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm">{article.titulo}</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Artigos de validação são publicados automaticamente após cada partida finalizada. 
                  Confira o <Link to="/noticias" className="text-primary hover:underline">feed de notícias</Link> para 
                  acompanhar as análises mais recentes.
                </p>
              )}
              
              <div className="mt-4 pt-4 border-t border-border">
                <Link 
                  to="/noticias"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Ver todas as notícias <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 9: Learnings */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Aprendizados e Evolução Contínua
          </h2>
          
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">O que os dados ensinam</h3>
                <p className="text-muted-foreground text-sm">
                  Cada resultado validado alimenta nosso entendimento sobre padrões do futebol. 
                  Identificamos em quais cenários a IA tem melhor desempenho (jogos com histórico 
                  consistente) e onde a leitura humana agrega valor (contextos atípicos, motivações 
                  especiais, fatores emocionais).
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Onde a IA evolui</h3>
                <p className="text-muted-foreground text-sm">
                  O modelo estatístico é refinado continuamente. Incorporamos novos fatores 
                  como desempenho recente, lesões de jogadores-chave e padrões de desempenho 
                  por competição. A transparência nos erros é o que permite essa evolução.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Complementaridade IA + Humanos</h3>
                <p className="text-muted-foreground text-sm">
                  Os dados mostram que IA e leitura humana não competem — se complementam. 
                  A IA oferece consistência estatística; os humanos trazem contexto e intuição. 
                  A combinação das duas perspectivas é o diferencial do Statball.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Final CTA */}
        <section className="mb-10">
          <PremiumCTA 
            variant="prominent"
            message="O acesso Premium libera leitura aprofundada da performance por campeonato, sem anúncios."
          />
        </section>

        {/* Internal Links */}
        <section>
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Conteúdos Relacionados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Link 
                  to="/ranking/ia-vs-humanos"
                  className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Trophy className="w-5 h-5 text-primary mb-2" />
                  <p className="font-medium text-sm">Ranking IA vs Humanos</p>
                  <p className="text-xs text-muted-foreground">Histórico completo de acertos</p>
                </Link>
                <Link 
                  to="/palpites"
                  className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Target className="w-5 h-5 text-primary mb-2" />
                  <p className="font-medium text-sm">Palpites da IA</p>
                  <p className="text-xs text-muted-foreground">Previsões para próximos jogos</p>
                </Link>
                <Link 
                  to="/noticias"
                  className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <BookOpen className="w-5 h-5 text-primary mb-2" />
                  <p className="font-medium text-sm">Notícias e Análises</p>
                  <p className="text-xs text-muted-foreground">Validações e artigos</p>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
