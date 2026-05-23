import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  FileText,
  Bot,
  ShieldAlert,
  RefreshCw,
  Unlink,
  AlertTriangle,
  UserCheck,
  TrendingUp,
} from "lucide-react";

const TransparenciaEditorial = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FileText className="h-10 w-10 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Transparência Editorial
              </h1>
            </div>
            <p className="text-muted-foreground">
              Compromisso com clareza, responsabilidade e confiança
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-foreground/90">
            {/* Introdução */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Nosso Compromisso
              </h2>
              <p className="leading-relaxed">
                O Statball acredita que transparência, clareza das informações e
                responsabilidade editorial são fundamentais para construir uma
                experiência confiável para os usuários da plataforma.
              </p>
              <p className="leading-relaxed mt-4">
                Nosso conteúdo é desenvolvido com apoio de tecnologias de
                automação, inteligência artificial, processamento estatístico e
                integração com diferentes bases de dados esportivos públicas e
                privadas. Parte das análises, comparativos, tendências, rankings
                e previsões pode ser gerada automaticamente por sistemas
                inteligentes desenvolvidos para interpretar dados históricos,
                desempenho de equipes, padrões estatísticos e informações
                relacionadas ao universo esportivo.
              </p>
            </section>

            {/* Limites da Tecnologia */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                Limites da Tecnologia
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                Mesmo utilizando tecnologia avançada para processamento das
                informações, o Statball entende que o futebol e o esporte em
                geral envolvem fatores imprevisíveis, subjetivos e variáveis
                que não podem ser totalmente determinados por algoritmos,
                estatísticas ou modelos matemáticos.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Nenhuma previsão publicada deve ser interpretada como garantia de resultado",
                  "Os conteúdos possuem finalidade exclusivamente informativa, estatística e recreativa",
                  "Análises automatizadas podem apresentar divergências temporárias",
                  "Estatísticas podem sofrer alterações após atualizações oficiais das competições",
                  "Horários, escalações, placares e eventos esportivos dependem das fontes externas integradas ao sistema",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Monitoramento e Precisão */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Monitoramento e Precisão
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                O Statball realiza monitoramento constante das informações
                disponibilizadas na plataforma, buscando manter a maior
                precisão possível nos dados apresentados. Ainda assim, podem
                ocorrer:
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Atrasos de atualização",
                  "Inconsistências temporárias",
                  "Divergências estatísticas",
                  "Falhas de sincronização",
                  "Indisponibilidade parcial de dados provenientes de APIs ou fornecedores externos",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Independência */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Unlink className="h-5 w-5 text-primary" />
                Independência Institucional
              </h2>
              <p className="leading-relaxed text-muted-foreground mb-4">
                A plataforma não possui vínculo oficial com:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Clubes",
                  "Federações",
                  "Confederações",
                  "Emissoras",
                  "Organizadores de campeonatos",
                  "Plataformas de apostas",
                  "Casas de apostas",
                  "Empresas esportivas",
                  "Marcas relacionadas ao futebol",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Salvo quando essa relação estiver explicitamente informada de
                forma pública e institucional.
              </p>
            </section>

            {/* Marcas e Direitos */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Marcas e Direitos</h2>
              <p className="leading-relaxed text-muted-foreground">
                As marcas, nomes de clubes, campeonatos e competições
                eventualmente mencionados pertencem aos seus respectivos
                proprietários e são utilizados apenas para fins informativos,
                editoriais e de identificação esportiva.
              </p>
            </section>

            {/* Jogo Responsável */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Jogo Responsável
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                O Statball reforça que não incentiva apostas irresponsáveis,
                jogos ilegais ou qualquer prática financeira baseada
                exclusivamente em previsões esportivas automatizadas.
              </p>
            </section>

            {/* Sobre o Fundador */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Sobre o Fundador
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                A plataforma foi idealizada e desenvolvida por{" "}
                <strong className="text-foreground">Alexandre Silveira</strong>,
                fundador da{" "}
                <strong className="text-foreground">
                  Mlfacil Consultoria e Sistemas
                </strong>
                , com foco em tecnologia, análise de dados, inteligência
                artificial e desenvolvimento de plataformas digitais escaláveis.
              </p>
            </section>

            {/* Compromisso Futuro */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Nosso Compromisso Contínuo
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                Nosso compromisso é continuar evoluindo continuamente a
                qualidade editorial, técnica e estatística do projeto, buscando
                oferecer uma experiência cada vez mais transparente, moderna e
                útil para toda a comunidade esportiva.
              </p>
            </section>

            {/* Links úteis */}
            <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border">
              <Link to="/termos" className="text-primary hover:underline">
                Termos de Uso
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/privacidade" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/sobre" className="text-primary hover:underline">
                Sobre o Statball
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/" className="text-primary hover:underline">
                Voltar ao Início
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TransparenciaEditorial;
