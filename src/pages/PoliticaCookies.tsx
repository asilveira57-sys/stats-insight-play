import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  Cookie,
  Info,
  Settings,
  BarChart3,
  Puzzle,
  Megaphone,
  Globe,
  Shield,
  Lock,
  RefreshCw,
  Mail,
  UserCheck,
  Building2,
  ExternalLink,
} from "lucide-react";

const PoliticaCookies = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Cookie className="h-10 w-10 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Política de Cookies
              </h1>
            </div>
            <p className="text-muted-foreground">
              Como o Statball utiliza cookies e tecnologias semelhantes
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-foreground/90">
            {/* O que sao cookies */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                O que são cookies
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  Esta Política de Cookies explica como o Statball utiliza cookies e tecnologias semelhantes durante a navegação dos usuários em nossa plataforma.
                </p>
                <p className="leading-relaxed">
                  Cookies são pequenos arquivos armazenados no navegador ou dispositivo do usuário quando um site é acessado. Eles ajudam a melhorar a experiência de navegação, lembrar preferências, coletar informações estatísticas e oferecer funcionalidades importantes para o funcionamento da plataforma.
                </p>
                <p className="leading-relaxed">
                  O uso de cookies também auxilia na segurança, desempenho, análise de tráfego e personalização de conteúdo.
                </p>
              </div>
            </section>

            {/* Como utilizamos */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Como utilizamos os cookies
              </h2>
              <p className="text-muted-foreground mb-4">
                O Statball utiliza cookies para:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Manter o funcionamento correto do site</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Melhorar a experiência do usuário</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Analisar estatísticas de acesso e navegação</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Medir desempenho da plataforma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Identificar erros técnicos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Personalizar conteúdos e funcionalidades</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Armazenar preferências de navegação</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Melhorar segurança e proteção contra abusos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Exibir publicidade e conteúdos relevantes</span>
                </li>
              </ul>
            </section>

            {/* Tipos de cookies */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Tipos de cookies utilizados
              </h2>
              <div className="space-y-6">
                {/* Essenciais */}
                <div className="p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                    <Lock className="h-4 w-4 text-secondary" />
                    Cookies Essenciais
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    São necessários para o funcionamento básico da plataforma.
                  </p>
                  <p className="text-muted-foreground text-sm mb-2">Esses cookies permitem:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
                    <li>Carregamento correto das páginas</li>
                    <li>Funcionamento de formulários</li>
                    <li>Segurança da navegação</li>
                    <li>Gerenciamento de sessões</li>
                    <li>Estabilidade técnica do site</li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-3">
                    Sem esses cookies, algumas funcionalidades podem não operar corretamente.
                  </p>
                </div>

                {/* Desempenho */}
                <div className="p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                    <BarChart3 className="h-4 w-4 text-secondary" />
                    Cookies de Desempenho e Estatísticas
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Utilizados para entender como os usuários utilizam o Statball.
                  </p>
                  <p className="text-muted-foreground text-sm mb-2">Esses cookies ajudam a identificar:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
                    <li>Páginas mais acessadas</li>
                    <li>Tempo de navegação</li>
                    <li>Desempenho do site</li>
                    <li>Comportamento de uso</li>
                    <li>Erros técnicos</li>
                    <li>Métricas de audiência</li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-3">
                    As informações coletadas geralmente são agregadas e utilizadas para melhoria contínua da plataforma.
                  </p>
                </div>

                {/* Funcionalidade */}
                <div className="p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                    <Puzzle className="h-4 w-4 text-secondary" />
                    Cookies de Funcionalidade
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">Permitem lembrar preferências e configurações do usuário, como:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
                    <li>Idioma</li>
                    <li>Preferências de navegação</li>
                    <li>Configurações de interface</li>
                    <li>Funcionalidades personalizadas</li>
                  </ul>
                </div>

                {/* Publicidade */}
                <div className="p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                    <Megaphone className="h-4 w-4 text-secondary" />
                    Cookies de Publicidade
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    O Statball poderá utilizar cookies de publicidade para:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
                    <li>Exibição de anúncios</li>
                    <li>Personalização de campanhas</li>
                    <li>Medição de desempenho publicitário</li>
                    <li>Limitação de repetição de anúncios</li>
                    <li>Análise de relevância de conteúdo patrocinado</li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-3">
                    Esses cookies podem ser definidos por parceiros publicitários terceiros.
                  </p>
                </div>
              </div>
            </section>

            {/* Google AdSense */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Google AdSense e Cookies de Terceiros
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O Statball poderá utilizar serviços do Google AdSense e outras plataformas de publicidade.
                </p>
                <p>O Google e parceiros podem utilizar cookies para:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Personalizar anúncios</li>
                  <li>Medir desempenho publicitário</li>
                  <li>Entender interesses do usuário</li>
                  <li>Melhorar relevância dos anúncios exibidos</li>
                </ul>
                <p>
                  O Google pode utilizar o cookie DART para exibir anúncios com base nas visitas anteriores do usuário a este e outros sites da internet.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    Política de Privacidade do Google
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://adssettings.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    Configurações de anúncios Google
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </section>

            {/* Gerenciamento */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Gerenciamento de Cookies
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O usuário pode, a qualquer momento, aceitar, recusar, bloquear ou remover cookies diretamente nas configurações do navegador utilizado.
                </p>
                <p>
                  A desativação de determinados cookies pode afetar parcialmente a experiência de navegação e algumas funcionalidades do site.
                </p>
                <p className="font-medium text-foreground">Links úteis dos navegadores mais populares:</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 border border-border/40 text-sm text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    Google Chrome
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://support.mozilla.org/pt-BR/kb/cookies-informacao-armazenada-por-sites"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 border border-border/40 text-sm text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    Mozilla Firefox
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://support.microsoft.com/pt-br/microsoft-edge/excluir-cookies-no-microsoft-edge-63947406-40ac-c3b8-6b57-ba2e0ea90419"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 border border-border/40 text-sm text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    Microsoft Edge
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://support.apple.com/pt-br/guide/safari/sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 border border-border/40 text-sm text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    Safari
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </section>

            {/* Consentimento */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Consentimento
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Ao continuar utilizando o Statball, o usuário concorda com o uso de cookies conforme descrito nesta Política de Cookies.
                </p>
                <p>
                  O consentimento poderá ser atualizado, alterado ou revogado através das configurações do navegador ou do banner de consentimento exibido na plataforma.
                </p>
              </div>
            </section>

            {/* Seguranca */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Segurança e Privacidade
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O Statball busca utilizar cookies de maneira responsável, transparente e alinhada às boas práticas de privacidade e proteção de dados.
                </p>
                <p>
                  As informações coletadas seguem as diretrizes descritas em nossa{" "}
                  <Link to="/privacidade" className="text-primary hover:underline">
                    Política de Privacidade
                  </Link>{" "}
                  e em nossa página de{" "}
                  <Link to="/lgpd" className="text-primary hover:underline">
                    LGPD
                  </Link>.
                </p>
              </div>
            </section>

            {/* Alteracoes */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Alterações nesta Política
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Esta Política de Cookies poderá ser atualizada periodicamente para refletir:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Alterações legais</li>
                  <li>Melhorias técnicas</li>
                  <li>Novos serviços</li>
                  <li>Mudanças na plataforma</li>
                  <li>Atualização de parceiros tecnológicos</li>
                </ul>
                <p>Recomendamos consulta periódica desta página.</p>
              </div>
            </section>

            {/* Contato */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contato
              </h2>
              <p className="text-muted-foreground mb-4">
                Para dúvidas relacionadas a cookies, privacidade ou proteção de dados:
              </p>
              <div className="space-y-3">
                <a
                  href="mailto:contato@statball.com.br"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  <Mail className="w-4 h-4" />
                  contato@statball.com.br
                </a>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <UserCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Responsável</p>
                    <p className="text-muted-foreground text-sm">Alexandre Silveira</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <Building2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Empresa responsável</p>
                    <p className="text-muted-foreground text-sm">Mlfacil Consultoria e Sistemas</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PoliticaCookies;
