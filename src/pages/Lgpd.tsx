import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  Shield,
  UserCheck,
  Database,
  Cookie,
  Mail,
  Lock,
  Eye,
  Scale,
  Server,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  FileText,
  Building2,
} from "lucide-react";

const Lgpd = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="h-10 w-10 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                LGPD — Lei Geral de Proteção de Dados
              </h1>
            </div>
            <p className="text-muted-foreground">
              Compromisso com a Privacidade e Proteção de Dados
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-foreground/90">
            {/* Introdução */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Compromisso com a Privacidade
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                O Statball respeita a privacidade, a segurança e a proteção dos dados pessoais de todos os usuários da plataforma.
              </p>
              <p className="leading-relaxed text-muted-foreground mt-4">
                Esta página tem como objetivo explicar de forma transparente como os dados podem ser coletados, utilizados, armazenados e protegidos, em conformidade com a Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018).
              </p>
              <p className="leading-relaxed text-muted-foreground mt-4">
                O Statball busca adotar práticas responsáveis de tratamento de dados, priorizando:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-3">
                <li>Transparência</li>
                <li>Segurança</li>
                <li>Privacidade</li>
                <li>Controle do usuário sobre suas informações</li>
                <li>Uso ético de tecnologias digitais</li>
              </ul>
            </section>

            {/* Responsável */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Quem é o responsável pelo tratamento dos dados
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <UserCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Responsável pela plataforma</p>
                    <p>Alexandre Silveira</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <Building2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Empresa responsável</p>
                    <p>Mlfacil Consultoria e Sistemas</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Contato oficial para privacidade e proteção de dados</p>
                    <a href="mailto:contato@statball.com.br" className="text-primary hover:underline">
                      contato@statball.com.br
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Dados Coletados */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Quais dados podem ser coletados
              </h2>
              <p className="text-muted-foreground mb-4">
                Dependendo da navegação e interação do usuário, o Statball poderá coletar informações como:
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-secondary" />
                    Dados fornecidos diretamente pelo usuário
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>Nome</li>
                    <li>E-mail</li>
                    <li>Telefone</li>
                    <li>Mensagens enviadas pelo formulário de contato</li>
                    <li>Informações enviadas em solicitações de suporte ou comunicação institucional</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Server className="h-4 w-4 text-secondary" />
                    Dados coletados automaticamente
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>Endereço IP</li>
                    <li>Navegador utilizado</li>
                    <li>Dispositivo utilizado</li>
                    <li>Páginas acessadas</li>
                    <li>Tempo de navegação</li>
                    <li>Origem de tráfego</li>
                    <li>Cookies e identificadores de sessão</li>
                    <li>Dados estatísticos de uso da plataforma</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Finalidade */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Finalidade da coleta de dados
              </h2>
              <p className="text-muted-foreground mb-4">
                Os dados podem ser utilizados para:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Responder mensagens e solicitações</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Melhorar a experiência de navegação</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Realizar análises estatísticas internas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Proteger a segurança da plataforma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Identificar falhas técnicas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Prevenir atividades abusivas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Personalizar funcionalidades</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Cumprir obrigações legais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Medir audiência e desempenho do site</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Exibir anúncios relevantes através de plataformas parceiras</span>
                </li>
              </ul>
            </section>

            {/* Cookies */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Cookie className="h-5 w-5 text-primary" />
                Uso de Cookies
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O Statball utiliza cookies e tecnologias semelhantes para melhorar a experiência do usuário e compreender como a plataforma é utilizada.
                </p>
                <p>Os cookies podem ser utilizados para:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Funcionamento técnico do site</li>
                  <li>Autenticação</li>
                  <li>Métricas de navegação</li>
                  <li>Análise de tráfego</li>
                  <li>Personalização de conteúdo</li>
                  <li>Publicidade e monetização</li>
                </ul>
                <p>
                  O usuário pode gerenciar ou desativar cookies diretamente no navegador.
                </p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Algumas funcionalidades da plataforma podem apresentar limitações caso determinados cookies sejam desativados.
                  </p>
                </div>
              </div>
            </section>

            {/* Google AdSense */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Google AdSense e Publicidade
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O Statball poderá utilizar serviços de publicidade de terceiros, incluindo o Google AdSense.
                </p>
                <p>Esses parceiros podem utilizar cookies, identificadores e tecnologias similares para:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Personalização de anúncios</li>
                  <li>Medição de desempenho</li>
                  <li>Prevenção de fraudes</li>
                  <li>Análise de comportamento de navegação</li>
                </ul>
                <p>
                  O Google pode utilizar o cookie DART para exibir anúncios com base em visitas anteriores do usuário a este e outros sites da internet.
                </p>
                <p>
                  Mais informações:{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Política de Privacidade do Google
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </section>

            {/* Compartilhamento */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Compartilhamento de dados
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="font-medium text-foreground">
                  O Statball não comercializa dados pessoais de usuários.
                </p>
                <p>Informações poderão ser compartilhadas apenas:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Quando exigido por obrigação legal</li>
                  <li>Mediante ordem judicial</li>
                  <li>Para proteção dos direitos da plataforma</li>
                  <li>Com fornecedores técnicos essenciais para funcionamento do sistema</li>
                  <li>Com ferramentas de análise, hospedagem e segurança utilizadas pela plataforma</li>
                </ul>
              </div>
            </section>

            {/* Armazenamento e segurança */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Armazenamento e segurança
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O Statball busca utilizar medidas técnicas e organizacionais adequadas para proteger os dados contra:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Acesso não autorizado</li>
                  <li>Vazamentos</li>
                  <li>Perda</li>
                  <li>Alteração indevida</li>
                  <li>Destruição</li>
                  <li>Uso abusivo</li>
                </ul>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-surface-2/50 border border-border/40">
                  <AlertTriangle className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Apesar dos esforços contínuos de segurança, nenhum sistema online é completamente imune a riscos.
                  </p>
                </div>
              </div>
            </section>

            {/* Direitos do usuário */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Direitos do usuário
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>Nos termos da LGPD, o usuário poderá solicitar:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Confirmação da existência de tratamento de dados</li>
                  <li>Acesso aos dados armazenados</li>
                  <li>Correção de informações incompletas ou desatualizadas</li>
                  <li>Anonimização ou exclusão de dados</li>
                  <li>Revogação do consentimento</li>
                  <li>Informações sobre compartilhamento de dados</li>
                  <li>Portabilidade dos dados, quando aplicável</li>
                </ul>
                <div className="flex items-start gap-2 p-4 rounded-lg bg-primary/5 border border-primary/20 mt-4">
                  <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">As solicitações poderão ser realizadas através do e-mail:</p>
                    <a href="mailto:contato@statball.com.br" className="text-primary hover:underline font-medium">
                      contato@statball.com.br
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Retenção de dados */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-primary" />
                Retenção de dados
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>Os dados poderão ser armazenados pelo período necessário para:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Cumprimento de obrigações legais</li>
                  <li>Funcionamento da plataforma</li>
                  <li>Auditoria</li>
                  <li>Segurança</li>
                  <li>Melhoria contínua dos serviços</li>
                </ul>
                <p>Após esse período, os dados poderão ser excluídos ou anonimizados.</p>
              </div>
            </section>

            {/* Links externos */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Links externos
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O Statball pode conter links para sites externos de terceiros.
                </p>
                <p>
                  Não somos responsáveis pelas políticas, práticas ou conteúdos de plataformas externas acessadas através desses links.
                </p>
                <p>
                  Recomendamos que o usuário leia as políticas de privacidade de cada serviço acessado.
                </p>
              </div>
            </section>

            {/* Alterações */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Alterações nesta política
              </h2>
              <p className="text-muted-foreground">
                Esta página poderá ser atualizada periodicamente para refletir melhorias, mudanças legais, alterações técnicas ou evolução da plataforma.
              </p>
              <p className="text-muted-foreground mt-4">
                Recomendamos consulta periódica desta política.
              </p>
            </section>

            {/* Contato sobre Privacidade */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contato sobre Privacidade e LGPD
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Para dúvidas, solicitações ou assuntos relacionados à privacidade e proteção de dados:
                </p>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">E-mail de contato</p>
                    <a href="mailto:contato@statball.com.br" className="text-primary hover:underline">
                      contato@statball.com.br
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <UserCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Responsável</p>
                    <p>Alexandre Silveira</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-2/50 border border-border/40">
                  <Building2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Empresa responsável</p>
                    <p>Mlfacil Consultoria e Sistemas</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Links úteis */}
            <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border">
              <Link to="/privacidade" className="text-primary hover:underline inline-flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Política de Privacidade
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/termos" className="text-primary hover:underline inline-flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Termos de Uso
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/cookies" className="text-primary hover:underline inline-flex items-center gap-1">
                <Cookie className="w-4 h-4" />
                Política de Cookies
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/contato" className="text-primary hover:underline inline-flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Contato
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Lgpd;
