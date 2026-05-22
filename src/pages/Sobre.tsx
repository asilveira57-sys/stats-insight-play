import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  BarChart3,
  Brain,
  Globe,
  History,
  LineChart,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
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
    title: "Desempenho de Equipes",
    desc: "Dashboards interativos mostrando evolução de clubes ao longo de temporadas e competições.",
  },
  {
    icon: TrendingUp,
    title: "Comparativos e Tendências",
    desc: "Ferramentas de comparação lado a lado e identificação de padrões em séries temporais.",
  },
  {
    icon: Brain,
    title: "Conteúdo Automatizado por IA",
    desc: "Notícias, resumos e insights gerados automaticamente a partir de eventos em tempo real.",
  },
  {
    icon: Globe,
    title: "Páginas Especiais",
    desc: "Perfis dedicados de clubes, ligas e competições com histórico, elencos e títulos.",
  },
  {
    icon: Newspaper,
    title: "Conteúdo Editorial",
    desc: "Artigos, opiniões e análises de especialistas para complementar os dados brutos.",
  },
];

const Sobre = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Sobre o Statball
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Conheça a plataforma que está transformando a forma como fãs,
              pesquisadores e criadores de conteúdo consomem estatísticas de futebol.
            </p>
          </div>

          {/* Introdução */}
          <section className="bg-card rounded-xl p-6 md:p-8 border border-border mb-8">
            <p className="text-muted-foreground leading-relaxed mb-4">
              O Statball é uma plataforma dedicada à{" "}
              <strong className="text-foreground">
                análise esportiva, estatísticas de futebol, tendências, desempenho
                de equipes, comparativos históricos e conteúdo automatizado baseado
                em dados
              </strong>
              .
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nosso objetivo é transformar informações esportivas em conteúdo
              acessível, organizado e útil para fãs de futebol, pesquisadores,
              criadores de conteúdo e apaixonados por estatísticas.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              A plataforma segue em constante evolução, com novos recursos,
              análises e ferramentas sendo desenvolvidos continuamente para ampliar
              a qualidade das informações disponibilizadas aos usuários.
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
                Alexandre Silveira atua há anos com tecnologia, automação,
                inteligência artificial, marketplaces e desenvolvimento de
                plataformas digitais voltadas para análise de dados,
                produtividade e sistemas inteligentes.
              </p>
            </div>
          </section>

          {/* Missão */}
          <section className="bg-card rounded-xl p-6 md:p-8 border border-border mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Nossa Proposta
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              O Statball nasceu com a proposta de unir{" "}
              <strong className="text-foreground">
                tecnologia, estatística e automação
              </strong>{" "}
              para criar uma experiência moderna, rápida e transparente para toda
              a comunidade esportiva.
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
