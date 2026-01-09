import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BookOpen, 
  BarChart3, 
  CheckCircle2, 
  TrendingUp, 
  Library,
  Brain,
  Shield,
  Users,
  Sparkles,
  ArrowRight,
  Trophy,
  FileText,
  Target
} from "lucide-react";

export default function Index() {
  return (
    <Layout>
      {/* BLOCO 1 — HERO */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold font-display mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent leading-tight">
              Statball — a maior biblioteca de dados e análises do futebol mundial
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Uma plataforma que organiza dados reais, valida análises e acompanha a evolução do futebol jogo após jogo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl" className="text-lg">
                <Link to="/campeonatos">
                  <Library className="mr-2 h-5 w-5" />
                  Explorar a biblioteca
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="text-lg">
                <Link to="/precos">
                  Conhecer o Clube Statball
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 2 — O QUE É O STATBALL */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display mb-8 text-center">
              O que é o Statball
            </h2>
            <div className="prose prose-lg prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
              <p className="text-lg md:text-xl">
                O Statball é uma <strong className="text-foreground">biblioteca viva de futebol</strong>. Uma plataforma que reúne, organiza e atualiza dados de partidas, campeonatos e times de todo o mundo — do passado ao presente, jogo após jogo.
              </p>
              <p>
                Mais do que um banco de dados, o Statball é um <strong className="text-foreground">registro histórico</strong> que cresce continuamente. Cada partida disputada é integrada à base, enriquecendo o histórico de confrontos, desempenhos e tendências de cada equipe.
              </p>
              <p>
                Aqui, você encontra informações organizadas por <strong className="text-foreground">campeonatos, times e temporadas</strong> — prontas para consulta, comparação e análise. Uma estrutura feita para quem quer entender o futebol com profundidade, contexto e consistência.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 3 — COMO O STATBALL FUNCIONA */}
      <section id="como-funciona" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display mb-8 text-center">
              Como o Statball funciona
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              O sistema opera em três etapas contínuas, garantindo que a base de conhecimento esteja sempre atualizada e confiável.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Coleta e organização</h3>
                  <p className="text-muted-foreground">
                    Dados de partidas, resultados e estatísticas são coletados de fontes confiáveis e estruturados em um banco de dados unificado.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Análise estatística</h3>
                  <p className="text-muted-foreground">
                    Os números são processados com contexto histórico: forma recente, confrontos diretos, desempenho por competição e tendências.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Validação contínua</h3>
                  <p className="text-muted-foreground">
                    Após cada partida, o resultado real é comparado com as análises anteriores, registrando acertos, ajustes e aprendizados.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 4 — VALIDAÇÃO E EVOLUÇÃO */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-secondary" />
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display">
                Validação e evolução
              </h2>
            </div>
            
            <div className="prose prose-lg prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
              <p className="text-lg md:text-xl">
                O Statball não apenas analisa — ele <strong className="text-foreground">valida</strong>. Cada análise feita antes de uma partida é confrontada com o resultado real assim que o jogo termina.
              </p>
              <p>
                Esse processo contínuo de <strong className="text-foreground">comparação entre expectativa e realidade</strong> gera um histórico transparente: o que foi previsto, o que aconteceu, e o que pode ser aprendido com a diferença.
              </p>
              <p>
                Ao longo do tempo, é possível acompanhar a <strong className="text-foreground">evolução das análises</strong>, identificar padrões de acerto e entender em quais contextos os modelos funcionam melhor — ou onde há espaço para refinamento.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
              <div className="text-center p-6 rounded-xl bg-card/50 border border-border/30">
                <div className="text-3xl font-bold font-display text-primary mb-2">100%</div>
                <p className="text-muted-foreground text-sm">Transparência nos resultados</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-card/50 border border-border/30">
                <div className="text-3xl font-bold font-display text-secondary mb-2">24h</div>
                <p className="text-muted-foreground text-sm">Validação pós-jogo</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-card/50 border border-border/30">
                <div className="text-3xl font-bold font-display text-accent mb-2">∞</div>
                <p className="text-muted-foreground text-sm">Histórico preservado</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 5 — BIBLIOTECA DE CONTEÚDO */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Library className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display mb-4">
                Biblioteca de conteúdo
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Uma estrutura organizada para explorar o futebol em profundidade, do geral ao específico.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link to="/campeonatos" className="group">
                <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <Trophy className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      Páginas pilares por campeonato
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Visão completa de cada competição: histórico, times participantes, estatísticas e análises.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/times" className="group">
                <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <Users className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      Páginas pilares por time
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Perfil detalhado de cada equipe: desempenho, confrontos, tendências e evolução.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/palpites" className="group">
                <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <FileText className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      Análises pré e pós-jogo
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Contexto estatístico antes da partida e validação após o resultado.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/ranking-selecoes" className="group">
                <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <BarChart3 className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      Rankings históricos
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Classificações por desempenho, aproveitamento e indicadores de performance.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/validacao-semanal" className="group">
                <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <CheckCircle2 className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      Validação semanal
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Comparativo entre análises e resultados reais a cada rodada.
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/performance" className="group">
                <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <TrendingUp className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      Evolução semanal
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Acompanhamento da performance das análises ao longo do tempo.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 6 — TECNOLOGIA COM PROPÓSITO */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center">
                <Brain className="h-7 w-7 text-accent" />
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display">
                Tecnologia com propósito
              </h2>
            </div>
            
            <div className="prose prose-lg prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
              <p className="text-lg md:text-xl">
                O Statball utiliza <strong className="text-foreground">inteligência artificial</strong> como ferramenta de apoio — não como oráculo. A IA ajuda a processar grandes volumes de dados, identificar padrões e gerar análises contextualizadas.
              </p>
              <p>
                Mas o resultado final sempre passa por uma <strong className="text-foreground">camada de curadoria e contexto humano</strong>. Números sozinhos não contam a história completa do futebol — é preciso entender circunstâncias, histórico e nuances de cada confronto.
              </p>
              <p>
                Essa combinação de <strong className="text-foreground">dados, tecnologia e leitura crítica</strong> é o que diferencia o Statball de simples agregadores de estatísticas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 7 — RESPONSABILIDADE */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="glass-card border-primary/20 bg-primary/5">
              <CardContent className="p-8 md:p-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold font-display">
                    Compromisso com responsabilidade
                  </h2>
                </div>
                
                <div className="prose prose-lg prose-invert max-w-none text-muted-foreground leading-relaxed space-y-4">
                  <p className="text-lg">
                    O Statball <strong className="text-foreground">não é uma plataforma de apostas</strong>. Não incentivamos, intermediamos ou oferecemos qualquer tipo de serviço relacionado a jogos de azar.
                  </p>
                  <p>
                    Não fazemos promessas de ganho financeiro. O que entregamos é <strong className="text-foreground">informação, análise e contexto</strong> — ferramentas para quem quer entender o futebol de forma mais profunda e fundamentada.
                  </p>
                  <p>
                    A interpretação e o uso dessas informações são de responsabilidade exclusiva de cada usuário.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* BLOCO 8 — PARA QUEM É O STATBALL */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display mb-8 text-center">
              Para quem é o Statball
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Uma plataforma para quem valoriza conhecimento, contexto e profundidade.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Quem gosta de futebol e quer entender o jogo</h3>
                      <p className="text-muted-foreground">
                        Para quem acompanha o esporte com paixão e busca ir além do placar, entendendo o contexto de cada partida.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                      <BarChart3 className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Quem valoriza dados e histórico</h3>
                      <p className="text-muted-foreground">
                        Para quem prefere decisões baseadas em informação, não em achismo ou intuição sem fundamento.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Target className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Analistas e pesquisadores</h3>
                      <p className="text-muted-foreground">
                        Para profissionais que precisam de dados organizados, confiáveis e com histórico acessível.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Criadores de conteúdo</h3>
                      <p className="text-muted-foreground">
                        Para quem produz análises, vídeos ou artigos e precisa de fontes sólidas para embasar seu trabalho.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 9 — ACESSO GRATUITO E PREMIUM */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display mb-8">
              Acesso gratuito e Premium
            </h2>
            
            <div className="prose prose-lg prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6 text-left md:text-center mb-12">
              <p className="text-lg md:text-xl">
                A <strong className="text-foreground">biblioteca pública do Statball é gratuita</strong>. Você pode explorar campeonatos, times, resultados e análises sem custo.
              </p>
              <p>
                Para quem deseja ir além, o <strong className="text-foreground">Clube Statball</strong> oferece acesso Premium com recursos avançados: análises mais profundas, validações detalhadas, simuladores e uma experiência sem anúncios.
              </p>
              <p>
                O Premium libera <strong className="text-foreground">profundidade</strong>, não bloqueia o conteúdo base. A biblioteca continua acessível para todos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl" variant="premium" className="text-lg">
                <Link to="/precos">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Conhecer o Clube Statball
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="text-lg">
                <Link to="/campeonatos">
                  Explorar gratuitamente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 10 — FECHAMENTO INSTITUCIONAL */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-card/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-8">
              <Library className="h-10 w-10 text-primary" />
            </div>
            <p className="text-xl md:text-2xl lg:text-3xl font-display text-foreground leading-relaxed mb-4">
              Statball é registro, análise e evolução.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              A maior biblioteca de futebol do mundo, construída jogo após jogo.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
