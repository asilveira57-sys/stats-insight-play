import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Calendar,
  Target,
  Zap,
  Trophy,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  Shield
} from "lucide-react";

export default function Index() {
  return (
    <Layout>
      {/* HERO SECTION - Sem anúncios */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Statball — Inteligência em Estatísticas de Futebol
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Plataforma que organiza dados, estatísticas e análises de futebol em um único lugar, 
              com foco em leitura de jogo e contexto histórico.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl" className="text-lg">
                <Link to="/resultados">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Explorar Estatísticas
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="text-lg">
                <a href="#como-funciona">
                  Como funciona
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* O QUE O STATBALL FAZ */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
              O que o Statball faz
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Transformamos dados brutos em informações úteis para quem quer entender futebol além do placar.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card border-border/50 hover:border-primary/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Centraliza dados de futebol</h3>
                <p className="text-muted-foreground text-sm">
                  Reúne informações de múltiplas competições em uma única plataforma organizada.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50 hover:border-primary/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Organiza estatísticas por contexto</h3>
                <p className="text-muted-foreground text-sm">
                  Apresenta números com significado, não apenas dados soltos sem interpretação.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50 hover:border-primary/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Facilita comparação de desempenho</h3>
                <p className="text-muted-foreground text-sm">
                  Compare times, jogadores e confrontos históricos de forma simples e visual.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50 hover:border-primary/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Mostra tendências e históricos</h3>
                <p className="text-muted-foreground text-sm">
                  Identifique padrões e evolução de desempenho ao longo do tempo.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* COMO USAR NA PRÁTICA */}
      <section id="como-funciona" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Como usar o Statball na prática
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Aproveite a plataforma em diferentes momentos da sua experiência com futebol.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="relative">
              <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                1
              </div>
              <Card className="glass-card h-full ml-4">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-lg">Antes do jogo</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Consulte o histórico de confrontos, forma recente dos times e estatísticas 
                    relevantes para ter contexto antes da partida começar.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="relative">
              <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                2
              </div>
              <Card className="glass-card h-full ml-4">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-lg">Durante o jogo</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Acompanhe estatísticas em tempo real e compare o desempenho das equipes 
                    enquanto a partida acontece.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="relative">
              <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                3
              </div>
              <Card className="glass-card h-full ml-4">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-lg">Depois do jogo</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Analise os resultados, veja como as previsões se comportaram e 
                    acompanhe a evolução nas tabelas e rankings.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ADSENSE PLACEHOLDER - Após seção de conteúdo */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* 
            ÁREA RESERVADA PARA GOOGLE ADSENSE
            - Banner display responsivo
            - Visualmente integrado ao layout
            - ID: adsense-home-mid
            - Inserir código do AdSense aqui após aprovação
          */}
          <div 
            id="adsense-home-mid"
            className="w-full max-w-4xl mx-auto h-24 bg-muted/30 rounded-lg border border-border/30 flex items-center justify-center"
            aria-label="Espaço publicitário"
          >
            <span className="text-muted-foreground/50 text-sm">Publicidade</span>
          </div>
        </div>
      </section>

      {/* O QUE VOCÊ ENCONTRA */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
              O que você encontra na plataforma
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Recursos pensados para quem quer ir além do básico.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Link to="/resultados" className="group">
              <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Jogos do dia</h3>
                      <p className="text-muted-foreground text-sm">
                        Acompanhe partidas de hoje com horários, placares e estatísticas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/estatisticas" className="group">
              <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Estatísticas</h3>
                      <p className="text-muted-foreground text-sm">
                        Dados detalhados de times, jogadores e competições.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/confrontos" className="group">
              <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Confrontos</h3>
                      <p className="text-muted-foreground text-sm">
                        Histórico de duelos entre seleções e times.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/ranking-selecoes" className="group">
              <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Rankings</h3>
                      <p className="text-muted-foreground text-sm">
                        Classificações por desempenho, aproveitamento e performance.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/palpites" className="group">
              <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Palpites baseados em dados</h3>
                      <p className="text-muted-foreground text-sm">
                        Análises matemáticas e probabilísticas para cada partida.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/artilheiros" className="group">
              <Card className="glass-card h-full border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Artilheiros</h3>
                      <p className="text-muted-foreground text-sm">
                        Maiores goleadores por competição e período.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* PARA QUEM É */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Para quem é o Statball
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma plataforma para quem quer entender futebol de forma mais profunda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Entusiastas de futebol</h3>
                    <p className="text-muted-foreground">
                      Para quem acompanha o esporte com paixão e quer mais contexto além do placar final.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Pessoas que gostam de análise estatística</h3>
                    <p className="text-muted-foreground">
                      Para quem prefere dados e números ao invés de palpites baseados em achismo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Criadores de conteúdo esportivo</h3>
                    <p className="text-muted-foreground">
                      Para quem produz análises, podcasts ou vídeos e precisa de dados confiáveis.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Analistas e estudiosos do esporte</h3>
                    <p className="text-muted-foreground">
                      Para profissionais e pesquisadores que buscam informações organizadas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* PREMIUM PREVIEW */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
                Gratuito e Premium
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Comece gratuitamente e evolua quando precisar de mais.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="glass-card border-border/50">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Gratuito</h3>
                    <p className="text-muted-foreground text-sm">Com anúncios discretos</p>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      <span>Acesso a estatísticas básicas</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      <span>Resultados e placares</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      <span>Rankings e classificações</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      <span>Confrontos históricos</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass-card border-primary/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                  Em breve
                </div>
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Premium</h3>
                    <p className="text-muted-foreground text-sm">Sem anúncios, mais recursos</p>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm">
                      <Shield className="h-5 w-5 text-primary shrink-0" />
                      <span>Navegação sem anúncios</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <Shield className="h-5 w-5 text-primary shrink-0" />
                      <span>Recursos avançados de análise</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <Shield className="h-5 w-5 text-primary shrink-0" />
                      <span>Histórico completo de dados</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <Shield className="h-5 w-5 text-primary shrink-0" />
                      <span>Simulador de campeonatos</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-6">
              Analise futebol com dados, não com achismo.
            </h2>
            <p className="text-muted-foreground text-lg mb-10">
              Comece a explorar estatísticas de forma inteligente e organizada.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl" className="text-lg">
                <Link to="/auth">
                  Criar conta
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="text-lg">
                <Link to="/resultados">
                  Explorar agora
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
