import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  BarChart3,
  Brain,
  Cpu,
  Globe,
  History,
  LineChart,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  User,
  Zap,
} from "lucide-react";

const recursos = [
  {
    icon: Target,
    title: "Análises Pré-Jogo",
    desc: "Avaliações detalhadas baseadas em dados históricos, forma recente e estatísticas de confronto.",
  },
  {
    icon: LineChart,
    title: "Análises Pós-Jogo",
    desc: "Debriefing completo com métricas de desempenho, mapa de calor e estatísticas avançadas.",
  },
  {
    icon: History,
    title: "Estatísticas Históricas",
    desc: "Banco de dados robusto com resultados, gols, cartões e curiosidades de décadas passadas.",
  },
  {
    icon: BarChart3,
    title: "Desempenho de Clubes e Seleções",
    desc: "Dashboards interativos mostrando evolução de equipes ao longo de temporadas e competições.",
  },
  {
    icon: TrendingUp,
    title: "Comparativos entre Equipes",
    desc: "Ferramentas de comparação lado a lado e identificação de padrões em séries temporais.",
  },
  {
    icon: Zap,
    title: "Tendências Estatísticas",
    desc: "Identificação de padrões e movimentos em séries temporais de desempenho esportivo.",
  },
  {
    icon: Trophy,
    title: "Rankings",
    desc: "Classificações e listas baseadas em critérios estatísticos objetivos e atualizados.",
  },
  {
    icon: Brain,
    title: "Probabilidades",
    desc: "Cálculos e projeções matemáticas baseadas em modelos estatísticos aplicados ao futebol.",
  },
  {
    icon: Globe,
    title: "Acompanhamento de Competições",
    desc: "Cobertura contínua de ligas, campeonatos e torneios com dados atualizados.",
  },
  {
    icon: Newspaper,
    title: "Páginas Especiais de Clubes, Ligas e Campeonatos",
    desc: "Perfis dedicados com histórico, elencos, títulos e estatísticas consolidadas.",
  },
  {
    icon: Cpu,
    title: "Conteúdos Automatizados por Inteligência Artificial",
    desc: "Notícias, resumos e insights gerados automaticamente a partir de eventos e dados esportivos.",
  },
  {
    icon: Sparkles,
    title: "Análises Baseadas em Dados Históricos e Desempenho Recente",
    desc: "Interpretação cruzada entre histórico e momento atual para insights mais completos.",
  },
];

const compromissos = [
  "Transparência das informações",
  "Melhoria da qualidade editorial",
  "Clareza na apresentação dos dados",
  "Evolução constante da experiência do usuário",
  "Estabilidade técnica da plataforma",
  "Responsabilidade no uso de análises automatizadas",
];

const Sobre = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Sobre o Aleball
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Conheça a plataforma que está transformando a forma como fãs,
              pesquisadores e criadores de conteúdo consomem estatísticas de futebol.
            </p>
          </div>

          {/* Introdução */}
          <section className="bg-card rounded-xl p-6 md:p-8 border border-border mb-8">
            <p className="text-muted-foreground leading-relaxed mb-4">
              O Aleball é uma plataforma digital especializada em{" "}
              <strong className="text-foreground">
                análise esportiva, estatísticas de futebol, tendências,
                desempenho de equipes, comparativos históricos e conteúdos
                automatizados baseados em dados
              </strong>
              .
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Criado com foco em tecnologia, inteligência artificial e análise
              estatística, o projeto nasceu com a proposta de transformar grandes
              volumes de informações esportivas em conteúdo acessível, organizado e
              útil para fãs de futebol, pesquisadores, criadores de conteúdo, analistas
              esportivos e apaixonados por estatísticas.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              A plataforma reúne diversos tipos de conteúdo e recursos voltados ao
              universo do futebol, incluindo análises pré-jogo e pós-jogo,
              estatísticas históricas, desempenho de clubes e seleções, comparativos
              entre equipes, tendências estatísticas, rankings, probabilidades,
              acompanhamento de competições, páginas especiais de clubes, ligas e
              campeonatos, conteúdos automatizados por inteligência artificial e
              análises baseadas em dados históricos e desempenho recente.
            </p>
          </section>

          {/* Recursos */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              O que a plataforma reúne
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recursos.map((r) => (
                <div
                  key={r.title}
                  className="bg-card rounded-xl p-5 border border-border flex gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <r.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      {r.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {r.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sobre o Fundador */}
          <section className="bg-card rounded-xl p-6 md:p-8 border border-border mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Sobre o Fundador
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                O projeto foi desenvolvido por{" "}
                <strong className="text-foreground">Alexandre Silveira</strong>,
                fundador da{" "}
                <strong className="text-foreground">
                  Mlfacil Consultoria e Sistemas
                </strong>
                .
              </p>
              <p>
                Alexandre Silveira atua há anos nas áreas de tecnologia, automação,
                inteligência artificial, marketplaces, ecommerce, desenvolvimento de
                sistemas e plataformas digitais voltadas para produtividade, análise
                de dados e escalabilidade de operações online.
              </p>
              <p>
                Com experiência em desenvolvimento de soluções inteligentes e projetos
                digitais de grande volume de dados, Alexandre idealizou o Aleball como
                uma plataforma capaz de unir tecnologia, automação e informação esportiva
                em uma experiência moderna, rápida e transparente.
              </p>
            </div>
          </section>

          {/* Automação e IA */}
          <section className="bg-card rounded-xl p-6 md:p-8 border border-border mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              Automação e Inteligência Artificial
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Grande parte da estrutura do Aleball utiliza recursos automatizados
                para coleta, processamento, organização e apresentação de dados
                esportivos, permitindo a geração contínua de análises, tendências e
                conteúdos estatísticos em larga escala.
              </p>
              <p>
                A plataforma também utiliza inteligência artificial como apoio na
                estruturação de conteúdos, interpretação de dados, geração de insights
                e organização das informações apresentadas aos usuários.
              </p>
            </div>
          </section>

          {/* Compromissos */}
          <section className="bg-card rounded-xl p-6 md:p-8 border border-border mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Nossos Compromissos
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Mesmo com forte utilização de tecnologia e automação, o Aleball busca
              manter compromisso contínuo com:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {compromissos.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Disclaimer */}
          <section className="bg-card rounded-xl p-6 md:p-8 border border-border mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Independência e Transparência
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                O Aleball{" "}
                <strong className="text-foreground">
                  não possui vínculo oficial com clubes, federações, emissoras,
                  organizadores de competições ou plataformas de apostas
                </strong>
                , salvo quando explicitamente informado em páginas institucionais ou
                parcerias públicas oficiais.
              </p>
              <p>
                As informações disponibilizadas possuem caráter informativo, estatístico
                e recreativo, podendo sofrer atualizações, correções ou ajustes conforme
                alterações das fontes de dados utilizadas pela plataforma.
              </p>
            </div>
          </section>

          {/* Evolução contínua */}
          <section className="bg-card rounded-xl p-6 md:p-8 border border-border mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução Contínua
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              O projeto segue em constante evolução, com desenvolvimento contínuo de
              novos recursos, ferramentas, análises e melhorias técnicas, buscando
              ampliar cada vez mais a qualidade das informações disponibilizadas para
              toda a comunidade esportiva.
            </p>
          </section>

          {/* Links úteis */}
          <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border">
            <Link to="/" className="text-primary hover:underline">
              Início
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/precos" className="text-primary hover:underline">
              Planos e Preços
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/noticias" className="text-primary hover:underline">
              Notícias
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/termos" className="text-primary hover:underline">
              Termos de Uso
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Sobre;
