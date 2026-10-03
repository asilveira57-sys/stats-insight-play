import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { FileText, AlertTriangle, CreditCard, Ban, Scale, RefreshCw } from "lucide-react";

const TermosUso = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FileText className="h-10 w-10 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Termos de Uso
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
              <h2 className="text-xl font-semibold mb-4">1. Aceitação dos Termos</h2>
              <p className="leading-relaxed text-muted-foreground">
                Ao acessar ou utilizar o Aleball ("plataforma", "serviço", "nós"), você concorda 
                em cumprir estes Termos de Uso. Se você não concordar com qualquer parte destes 
                termos, não utilize nossa plataforma.
              </p>
              <p className="leading-relaxed mt-4 text-muted-foreground">
                O Aleball reserva-se o direito de modificar estes termos a qualquer momento. 
                Alterações entrarão em vigor imediatamente após a publicação. O uso continuado 
                da plataforma constitui aceitação das alterações.
              </p>
            </section>

            {/* Descrição do Serviço */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">2. Descrição do Serviço</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O Aleball é uma <strong className="text-foreground">plataforma de estatísticas e análises de futebol</strong> que 
                  oferece:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Dados e estatísticas de partidas de futebol</li>
                  <li>Análises históricas e comparativas</li>
                  <li>Palpites baseados em modelos matemáticos</li>
                  <li>Ferramentas de acompanhamento de jogos</li>
                </ul>
              </div>
            </section>

            {/* Aviso Legal Importante */}
            <section className="bg-destructive/10 rounded-xl p-6 border border-destructive/30">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                3. Aviso Legal Importante
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="font-medium text-foreground">
                  O Aleball NÃO é uma plataforma de apostas.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Não oferecemos, promovemos ou facilitamos apostas esportivas</strong>
                  </li>
                  <li>
                    <strong>Não temos qualquer vínculo com casas de apostas</strong>
                  </li>
                  <li>
                    <strong>Não recebemos comissões ou afiliações de plataformas de apostas</strong>
                  </li>
                </ul>
                <p className="mt-4">
                  Os palpites e análises disponibilizados são baseados exclusivamente em 
                  <strong className="text-foreground"> modelos matemáticos e estatísticos</strong>, 
                  destinados apenas para fins informativos e educacionais.
                </p>
                <p className="mt-4 font-medium text-foreground">
                  O uso das informações para qualquer finalidade é de responsabilidade 
                  exclusiva do usuário.
                </p>
              </div>
            </section>

            {/* Planos e Assinaturas */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                4. Planos e Assinaturas
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Plano Gratuito</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Acesso às funcionalidades básicas</li>
                    <li>Exibição de anúncios (Google AdSense)</li>
                    <li>Limitações em recursos avançados</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Planos Premium</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Experiência sem anúncios</li>
                    <li>Acesso a estatísticas avançadas</li>
                    <li>Recursos exclusivos conforme descrito na página de planos</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Pagamentos e Cancelamento */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                5. Pagamentos e Cancelamento
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Cobrança</h3>
                  <p>
                    As assinaturas são cobradas de forma recorrente (mensal ou anual) na data 
                    de renovação. O processamento de pagamentos é realizado pelo Stripe, 
                    uma plataforma segura e certificada.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Garantia de 7 Dias</h3>
                  <p>
                    Oferecemos garantia de reembolso nos primeiros 7 dias após a contratação 
                    de qualquer plano Premium. Após esse período, não haverá reembolso proporcional.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Cancelamento</h3>
                  <p>
                    Você pode cancelar sua assinatura a qualquer momento através das configurações 
                    da sua conta. O acesso aos recursos Premium continua até o final do período 
                    já pago.
                  </p>
                </div>
              </div>
            </section>

            {/* Uso Aceitável */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Ban className="h-5 w-5 text-primary" />
                6. Uso Aceitável
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>Ao utilizar o Aleball, você concorda em NÃO:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Usar o serviço para fins ilegais ou não autorizados</li>
                  <li>Tentar acessar áreas restritas do sistema</li>
                  <li>Copiar, modificar ou distribuir nosso conteúdo sem autorização</li>
                  <li>Usar bots, scrapers ou ferramentas automatizadas</li>
                  <li>Compartilhar credenciais de acesso com terceiros</li>
                  <li>Interferir na operação normal da plataforma</li>
                  <li>Promover apostas ou gambling dentro da plataforma</li>
                </ul>
              </div>
            </section>

            {/* Propriedade Intelectual */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">7. Propriedade Intelectual</h2>
              <p className="text-muted-foreground">
                Todo o conteúdo do Aleball, incluindo mas não limitado a textos, gráficos, 
                logos, ícones, imagens, clipes de áudio, downloads digitais e compilações de dados, 
                é propriedade do Aleball ou de seus fornecedores de conteúdo e está protegido 
                por leis de direitos autorais.
              </p>
            </section>

            {/* Isenção de Responsabilidade */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                8. Isenção de Responsabilidade
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  O Aleball fornece informações e análises "como estão", sem garantias de 
                  qualquer tipo, expressas ou implícitas.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Não garantimos a precisão, completude ou atualidade das informações</li>
                  <li>Não nos responsabilizamos por decisões tomadas com base em nosso conteúdo</li>
                  <li>Não garantimos disponibilidade ininterrupta do serviço</li>
                  <li>Não nos responsabilizamos por perdas decorrentes do uso das informações</li>
                </ul>
                <p className="mt-4 font-medium text-foreground">
                  O uso de qualquer informação disponibilizada pelo Aleball é de inteira 
                  responsabilidade do usuário.
                </p>
              </div>
            </section>

            {/* Suspensão de Conta */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">9. Suspensão e Encerramento</h2>
              <p className="text-muted-foreground">
                Reservamo-nos o direito de suspender ou encerrar sua conta, sem aviso prévio, 
                caso você viole estes Termos de Uso ou se engaje em comportamento que consideremos 
                prejudicial à plataforma ou a outros usuários.
              </p>
            </section>

            {/* Lei Aplicável */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">10. Lei Aplicável</h2>
              <p className="text-muted-foreground">
                Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
                Qualquer disputa será resolvida nos tribunais competentes do Brasil.
              </p>
            </section>

            {/* Contato */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold mb-4">11. Contato</h2>
              <p className="text-muted-foreground">
                Para dúvidas sobre estes Termos de Uso, entre em contato:
              </p>
              <p className="mt-4 text-primary font-medium">
                contato@aleball.com
              </p>
            </section>

            {/* Links úteis */}
            <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border">
              <Link 
                to="/privacidade" 
                className="text-primary hover:underline"
              >
                Política de Privacidade
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

export default TermosUso;
