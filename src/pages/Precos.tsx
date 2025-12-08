import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { 
  Check, 
  X, 
  Crown, 
  Zap, 
  Shield, 
  BarChart3,
  TrendingUp,
  Bell,
  Download,
  Headphones,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "para sempre",
    description: "Acesso básico às estatísticas e resultados",
    features: [
      { text: "Resultados em tempo real", included: true },
      { text: "Estatísticas básicas", included: true },
      { text: "Palpites diários limitados", included: true },
      { text: "Anúncios", included: true },
      { text: "Estatísticas avançadas (xG)", included: false },
      { text: "Simulador de campeonato", included: false },
      { text: "Alertas personalizados", included: false },
      { text: "Exportar dados", included: false },
      { text: "Suporte prioritário", included: false },
    ],
    cta: "Plano Atual",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Premium",
    price: "R$ 19,90",
    period: "/mês",
    description: "Acesso completo a todas as funcionalidades",
    features: [
      { text: "Resultados em tempo real", included: true },
      { text: "Estatísticas básicas", included: true },
      { text: "Palpites ilimitados", included: true },
      { text: "Sem anúncios", included: true },
      { text: "Estatísticas avançadas (xG)", included: true },
      { text: "Simulador de campeonato", included: true },
      { text: "Alertas personalizados", included: true },
      { text: "Exportar dados CSV", included: true },
      { text: "Suporte prioritário", included: true },
    ],
    cta: "Assinar Premium",
    variant: "premium" as const,
    popular: true,
  },
  {
    name: "Anual",
    price: "R$ 14,90",
    period: "/mês",
    description: "Economia de 25% no plano anual",
    originalPrice: "R$ 238,80",
    finalPrice: "R$ 178,80/ano",
    features: [
      { text: "Tudo do Premium", included: true },
      { text: "Economia de 25%", included: true },
      { text: "Acesso antecipado a novidades", included: true },
      { text: "Badge exclusivo", included: true },
      { text: "Resultados em tempo real", included: true },
      { text: "Estatísticas avançadas (xG)", included: true },
      { text: "Simulador de campeonato", included: true },
      { text: "Alertas personalizados", included: true },
      { text: "Suporte VIP", included: true },
    ],
    cta: "Assinar Anual",
    variant: "secondary" as const,
    popular: false,
  },
];

const features = [
  {
    icon: BarChart3,
    title: "Estatísticas Completas",
    description: "Acesso a métricas avançadas como xG, xGA, passes, posse e muito mais.",
  },
  {
    icon: TrendingUp,
    title: "Simulador de Campeonato",
    description: "Simule resultados e veja a previsão final da tabela baseada em milhares de cálculos.",
  },
  {
    icon: Bell,
    title: "Alertas Personalizados",
    description: "Receba notificações sobre seus times favoritos e palpites de alta confiança.",
  },
  {
    icon: Download,
    title: "Exportar Dados",
    description: "Baixe estatísticas e análises em formato CSV para suas próprias análises.",
  },
];

export default function Precos() {
  const { user } = useAuth();
  const { data: userPlan, isLoading: loadingPlan } = useUserPlan();

  const getButtonState = (planName: string) => {
    if (!user) {
      return { text: "Criar Conta", disabled: false, showLink: true };
    }
    
    if (loadingPlan) {
      return { text: "Carregando...", disabled: true, showLink: false };
    }

    if (planName === "Gratuito") {
      if (!userPlan?.isPremium) {
        return { text: "Plano Atual", disabled: true, showLink: false };
      }
      return { text: "Plano Gratuito", disabled: true, showLink: false };
    }

    if (userPlan?.isPremium) {
      return { text: "Plano Ativo", disabled: true, showLink: false };
    }

    return { text: planName === "Premium" ? "Assinar Premium" : "Assinar Anual", disabled: false, showLink: false };
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Planos</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Escolha o plano{" "}
            <span className="gradient-text">ideal para você</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Desbloqueie todo o potencial das análises estatísticas com o plano Premium
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "glass-card p-6 relative",
                plan.popular && "neon-border scale-105 z-10"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold">
                    Mais Popular
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
                  <p className="text-sm text-secondary mt-1">
                    {plan.finalPrice}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-secondary" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className={cn(
                      "text-sm",
                      !feature.included && "text-muted-foreground"
                    )}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {(() => {
                const btnState = getButtonState(plan.name);
                
                if (btnState.showLink) {
                  return (
                    <Link to="/auth" className="w-full">
                      <Button variant={plan.variant} className="w-full">
                        {plan.name === "Premium" && <Crown className="w-4 h-4" />}
                        {btnState.text}
                      </Button>
                    </Link>
                  );
                }

                return (
                  <Button
                    variant={plan.variant}
                    className="w-full"
                    disabled={btnState.disabled}
                  >
                    {loadingPlan && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {plan.name === "Premium" && !loadingPlan && <Crown className="w-4 h-4" />}
                    {btnState.text}
                  </Button>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
              O que está incluso no{" "}
              <span className="gradient-text">Premium</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => {
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

        {/* FAQ Preview */}
        <div className="max-w-3xl mx-auto mt-16 text-center">
          <div className="glass-card p-8">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">
              Garantia de 7 dias
            </h3>
            <p className="text-muted-foreground mb-4">
              Não ficou satisfeito? Devolvemos seu dinheiro em até 7 dias, sem perguntas.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-secondary" />
                Cancele quando quiser
              </span>
              <span className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-secondary" />
                Suporte 24/7
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
