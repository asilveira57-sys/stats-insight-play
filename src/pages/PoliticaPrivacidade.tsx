import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Shield, Eye, Database, Cookie, Mail, UserCheck } from "lucide-react";

const PoliticaPrivacidade = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="h-10 w-10 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Política de Privacidade
              </h1>
            </div>
            <p className="text-muted-foreground">
              Última atualização: Janeiro de 2026
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-foreground/90">
            {/* Introdução */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Introdução
              </h2>
              <p className="leading-relaxed">
                O Statball ("nós", "nosso" ou "plataforma") valoriza a privacidade dos seus usuários. 
                Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos 
                suas informações pessoais quando você utiliza nossa plataforma de estatísticas de futebol.
              </p>
              <p className="leading-relaxed mt-4">
                Ao utilizar o Statball, você concorda com as práticas descritas nesta política. 
                Recomendamos a leitura completa deste documento.
              </p>
            </section>

            {/* Dados Coletados */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Dados que Coletamos
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Dados fornecidos por você:</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>Nome e endereço de e-mail ao criar uma conta</li>
                    <li>Preferências de times e competições</li>
                    <li>Palpites e análises que você registra na plataforma</li>
                    <li>Informações de pagamento (processadas pelo Stripe, não armazenadas por nós)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Dados coletados automaticamente:</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>Endereço IP e informações do navegador</li>
                    <li>Páginas visitadas e tempo de permanência</li>
                    <li>Dispositivo e sistema operacional</li>
                    <li>Dados de cookies e tecnologias similares</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Como Usamos */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Como Usamos Seus Dados
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Fornecer e melhorar nossos serviços de estatísticas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Personalizar sua experiência na plataforma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Processar assinaturas e pagamentos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Enviar comunicações sobre atualizações e novidades (com seu consentimento)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Exibir anúncios relevantes (plano gratuito)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Analisar uso da plataforma para melhorias</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Cumprir obrigações legais</span>
                </li>
              </ul>
            </section>

            {/* Cookies e Publicidade */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Cookie className="h-5 w-5 text-primary" />
                Cookies e Publicidade
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Utilizamos cookies e tecnologias similares para melhorar sua experiência, 
                  lembrar suas preferências e exibir conteúdo relevante.
                </p>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Google AdSense</h3>
                  <p>
                    O Statball utiliza o Google AdSense para exibir anúncios aos usuários do plano gratuito. 
                    O Google pode usar cookies para exibir anúncios baseados em visitas anteriores 
                    a este e outros sites. Você pode desativar a publicidade personalizada nas 
                    <a 
                      href="https://www.google.com/settings/ads" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      Configurações de Anúncios do Google
                    </a>.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Planos Premium</h3>
                  <p>
                    Usuários com planos Premium (Mensal ou Anual) não visualizam anúncios, 
                    portanto não estão sujeitos aos cookies de publicidade do AdSense.
                  </p>
                </div>
              </div>
            </section>

            {/* Compartilhamento */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Compartilhamento de Dados</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Não vendemos seus dados pessoais.</strong> 
                  Podemos compartilhar informações apenas nas seguintes situações:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Com prestadores de serviço (ex: processadores de pagamento, serviços de hospedagem)</li>
                  <li>Quando exigido por lei ou ordem judicial</li>
                  <li>Para proteger nossos direitos, segurança ou propriedade</li>
                  <li>Com seu consentimento explícito</li>
                </ul>
              </div>
            </section>

            {/* LGPD */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Seus Direitos (LGPD)</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Confirmar a existência de tratamento de seus dados</li>
                  <li>Acessar seus dados pessoais</li>
                  <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                  <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários</li>
                  <li>Solicitar portabilidade dos dados</li>
                  <li>Revogar consentimento a qualquer momento</li>
                  <li>Solicitar exclusão de dados pessoais</li>
                </ul>
                <p className="mt-4">
                  Para exercer esses direitos, entre em contato através do e-mail indicado abaixo.
                </p>
              </div>
            </section>

            {/* Segurança */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Segurança dos Dados</h2>
              <p className="text-muted-foreground">
                Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo 
                criptografia SSL/TLS, controle de acesso e monitoramento de segurança. 
                No entanto, nenhum sistema é 100% seguro, e não podemos garantir segurança absoluta.
              </p>
            </section>

            {/* Menores */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Menores de Idade</h2>
              <p className="text-muted-foreground">
                O Statball não é direcionado a menores de 18 anos. Não coletamos intencionalmente 
                dados de menores. Se tomarmos conhecimento de que coletamos dados de um menor, 
                tomaremos medidas para excluí-los.
              </p>
            </section>

            {/* Alterações */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">Alterações nesta Política</h2>
              <p className="text-muted-foreground">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre 
                alterações significativas através do site ou por e-mail. Recomendamos revisar 
                esta página regularmente.
              </p>
            </section>

            {/* Contato */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contato
              </h2>
              <p className="text-muted-foreground">
                Para dúvidas, solicitações ou reclamações sobre esta Política de Privacidade 
                ou sobre o tratamento de seus dados, entre em contato:
              </p>
              <p className="mt-4 text-primary font-medium">
                contato@statball.com.br
              </p>
            </section>

            {/* Links úteis */}
            <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border">
              <Link 
                to="/termos" 
                className="text-primary hover:underline"
              >
                Termos de Uso
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link 
                to="/precos" 
                className="text-primary hover:underline"
              >
                Planos e Preços
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link 
                to="/" 
                className="text-primary hover:underline"
              >
                Voltar ao Início
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PoliticaPrivacidade;
