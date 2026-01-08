import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { 
  Check, 
  X, 
  Crown, 
  Shield, 
  BarChart3,
  TrendingUp,
  Bell,
  Download,
  Sparkles,
  Eye,
  CreditCard,
  RefreshCcw,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const plans = [
  {
    id: "free",
    name: "Gratuito",
    price: "R$ 0",
    period: "para sempre",
    description: "Acesso essencial às estatísticas e resultados, com exibição de anúncios para manter a plataforma gratuita.",
    highlight: null,
    features: [
      { text: "Resultados em tempo real", included: true },
      { text: "Estatísticas básicas", included: true },
      { text: "Palpites diários limitados", included: true },
      { text: "Confrontos históricos", included: true },
    ],
    limitations: [
      "Exibição de anúncios",
      "Sem estatísticas avançadas (xG, xGA)",
      "Sem exportação de dados",
      "Sem alertas personalizados",
    ],
    cta: "Continuar Gratuito",
    variant: "outline" as const,
    popular: false,
  },
  {
    id: "premium_monthly",
    name: "Premium Mensal",
    price: "R$ 19,90",
    period: "/mês",
    description: "Experiência completa sem interrupções. Acesso total às análises com profundidade e controle.",
    highlight: "Sem anúncios",
    features: [
      { text: "Navegação sem anúncios", included: true, emphasis: true },
      { text: "Estatísticas avançadas (xG, xGA, tendências)", included: true },
      { text: "Palpites ilimitados", included: true },
      { text: "Simulador de campeonato", included: true },
      { text: "Alertas personalizados", included: true },
      { text: "Exportação de dados CSV", included: true },
      { text: "Suporte prioritário", included: true },
    ],
    limitations: [],
    cta: "Assinar Premium",
    variant: "premium" as const,
    popular: true,
  },
  {
    id: "premium_yearly",
    name: "Premium Anual",
    price: "R$ 14,90",
    period: "/mês",
    description: "Melhor custo-benefício. Economize ao se comprometer por um ano.",
    highlight: "Economia de 25%",
    originalPrice: "R$ 238,80",
    finalPrice: "R$ 178,80/ano",
    features: [
      { text: "Tudo do Premium Mensal", included: true, emphasis: true },
      { text: "Economia de R$ 60 por ano", included: true },
      { text: "Acesso antecipado a novidades", included: true },
      { text: "Navegação sem anúncios", included: true },
      { text: "Estatísticas avançadas completas", included: true },
      { text: "Palpites e simulações ilimitados", included: true },
      { text: "Suporte VIP", included: true },
    ],
    limitations: [],
    cta: "Assinar Anual",
    variant: "secondary" as const,
    popular: false,
  },
];

const premiumFeatures = [
  {
    icon: Eye,
    title: "Sem Anúncios",
    description: "Navegue pela plataforma sem nenhuma interrupção ou distração visual.",
  },
  {
    icon: BarChart3,
    title: "Estatísticas Avançadas",
    description: "Acesse métricas como xG, xGA, tendências de desempenho e análises detalhadas.",
  },
  {
    icon: TrendingUp,
    title: "Simulador de Campeonato",
    description: "Simule resultados e veja projeções de tabela baseadas em cálculos estatísticos.",
  },
  {
    icon: Bell,
    title: "Alertas Personalizados",
    description: "Receba notificações sobre seus times favoritos e análises de alta confiança.",
  },
  {
    icon: Download,
    title: "Exportar Dados",
    description: "Baixe estatísticas em formato CSV para suas próprias análises e estudos.",
  },
  {
    icon: Sparkles,
    title: "Acesso Antecipado",
    description: "Seja o primeiro a testar novas funcionalidades antes do lançamento público.",
  },
];

export default function Precos() {
  const { user } = useAuth();
  const { data: userPlan, isLoading: loadingPlan } = useUserPlan();

  const getButtonState = (planId: string) => {
    if (!user) {
      return { text: "Criar Conta para Assinar", disabled: false, showLink: true };
    }
    
    if (loadingPlan) {
      return { text: "Carregando...", disabled: true, showLink: false };
    }

    if (planId === "free") {
      if (!userPlan?.isPremium) {
        return { text: "Plano Atual", disabled: true, showLink: false };
      }
      return { text: "Plano Gratuito", disabled: true, showLink: false };
    }

    if (userPlan?.isPremium) {
      return { text: "Plano Ativo", disabled: true, showLink: false };
    }

    return { 
      text: planId === "premium_monthly" ? "Assinar Premium" : "Assinar Anual", 
      disabled: false, 
      showLink: false 
    };
  };

  return (
    <Layout>
      {/* Esta página NÃO exibe anúncios */}
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Planos</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Escolha como você quer{" "}
            <span className="gradient-text">usar o Statball</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Comece gratuitamente ou desbloqueie a experiência completa sem anúncios e com recursos avançados.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "glass-card p-6 relative flex flex-col",
                plan.popular && "neon-border md:scale-105 z-10"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold whitespace-nowrap">
                    Mais Popular
                  </span>
                </div>
              )}

              {plan.highlight && !plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-bold border border-secondary/30 whitespace-nowrap">
                    {plan.highlight}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-display font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-display font-bold gradient-text">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                {plan.finalPrice && (
                  <div className="mt-1">
                    <span className="text-sm text-muted-foreground line-through mr-2">
                      {plan.originalPrice}
                    </span>
                    <span className="text-sm text-secondary font-medium">
                      {plan.finalPrice}
                    </span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-4 flex-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      feature.emphasis ? "bg-primary/20" : "bg-secondary/20"
                    )}>
                      <Check className={cn(
                        "w-3 h-3",
                        feature.emphasis ? "text-primary" : "text-secondary"
                      )} />
                    </div>
                    <span className={cn(
                      "text-sm",
                      feature.emphasis && "font-medium text-foreground"
                    )}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Limitations (only for free plan) */}
              {plan.limitations.length > 0 && (
                <div className="border-t border-border/50 pt-4 mb-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Limitações:</p>
                  <ul className="space-y-2">
                    {plan.limitations.map((limitation, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <X className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(() => {
                const btnState = getButtonState(plan.id);
                
                if (btnState.showLink) {
                  return (
                    <Link to="/auth" className="w-full mt-auto">
                      <Button variant={plan.variant} className="w-full">
                        {plan.id !== "free" && <Crown className="w-4 h-4" />}
                        {btnState.text}
                      </Button>
                    </Link>
                  );
                }

                return (
                  <Button
                    variant={plan.variant}
                    className="w-full mt-auto"
                    disabled={btnState.disabled}
                  >
                    {loadingPlan && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {plan.id !== "free" && !loadingPlan && !btnState.disabled && <Crown className="w-4 h-4" />}
                    {btnState.text}
                  </Button>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Como funcionam os planos */}
        <div className="max-w-3xl mx-auto mb-16">
          <Card className="glass-card border-border/50">
            <CardContent className="p-6 md:p-8">
              <h3 className="text-lg font-display font-bold mb-4 text-center">
                Como funcionam os planos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O plano <strong className="text-foreground">Gratuito</strong> é sustentado por anúncios discretos
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Os planos <strong className="text-foreground">Premium</strong> não exibem anúncios
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                    <RefreshCcw className="w-5 h-5 text-secondary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Você pode <strong className="text-foreground">trocar ou cancelar</strong> o plano quando quiser
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
              O que você ganha com o{" "}
              <span className="gradient-text">Premium</span>
            </h2>
            <p className="text-muted-foreground">
              Recursos exclusivos para quem quer análises mais profundas e sem interrupções.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {premiumFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="glass-card p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Garantia e Confiança */}
        <div className="max-w-3xl mx-auto">
          <Card className="glass-card border-primary/20">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">
                Garantia de 7 dias
              </h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Não ficou satisfeito? Devolvemos seu dinheiro em até 7 dias, sem perguntas e sem burocracia.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Check className="w-4 h-4 text-secondary" />
                  Cancelamento simples
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="w-4 h-4 text-secondary" />
                  Pagamento seguro
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4 h-4 text-secondary" />
                  Transparência total
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
