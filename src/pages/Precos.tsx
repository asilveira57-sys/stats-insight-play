import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { 
  Check, 
  X, 
  Crown, 
  Shield, 
  Eye,
  CreditCard,
  RefreshCcw,
  Loader2,
  Zap,
  Calendar,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";

// Planos de assinatura (renovação automática)
const subscriptionPlans = [
  {
    id: "sub_monthly",
    name: "Mensal",
    price: "R$ 19,90",
    period: "/mês",
    days: 30,
    priceId: "price_monthly_sub", // Stripe price_id
    features: [
      "Navegação sem anúncios",
      "Estatísticas avançadas",
      "Palpites ilimitados",
      "Exportação CSV",
    ],
    highlight: null,
    popular: false,
  },
  {
    id: "sub_quarterly",
    name: "Trimestral",
    price: "R$ 16,90",
    period: "/mês",
    days: 90,
    totalPrice: "R$ 50,70",
    savings: "15%",
    priceId: "price_quarterly_sub",
    features: [
      "Navegação sem anúncios",
      "Estatísticas avançadas",
      "Palpites ilimitados",
      "Exportação CSV",
    ],
    highlight: null,
    popular: false,
  },
  {
    id: "sub_semiannual",
    name: "Semestral",
    price: "R$ 14,90",
    period: "/mês",
    days: 180,
    totalPrice: "R$ 89,40",
    savings: "25%",
    priceId: "price_semiannual_sub",
    features: [
      "Navegação sem anúncios",
      "Estatísticas avançadas",
      "Palpites ilimitados",
      "Exportação CSV",
      "Alertas personalizados",
    ],
    highlight: "Equilíbrio",
    popular: false,
  },
  {
    id: "sub_yearly",
    name: "Anual",
    price: "R$ 12,90",
    period: "/mês",
    days: 365,
    totalPrice: "R$ 154,80",
    savings: "35%",
    priceId: "price_yearly_sub",
    features: [
      "Navegação sem anúncios",
      "Estatísticas avançadas",
      "Palpites ilimitados",
      "Exportação CSV",
      "Alertas personalizados",
      "Acesso antecipado a novidades",
    ],
    highlight: "Melhor custo-benefício",
    popular: true,
  },
];

// Planos avulsos (pagamento único)
const oneTimePlans = [
  {
    id: "once_30",
    name: "30 dias",
    price: "R$ 24,90",
    period: "",
    days: 30,
    priceId: "price_30_once",
    features: [
      "Navegação sem anúncios",
      "Estatísticas avançadas",
      "Palpites ilimitados",
    ],
    highlight: null,
    popular: false,
  },
  {
    id: "once_90",
    name: "90 dias",
    price: "R$ 59,90",
    period: "",
    days: 90,
    priceId: "price_90_once",
    features: [
      "Navegação sem anúncios",
      "Estatísticas avançadas",
      "Palpites ilimitados",
      "Exportação CSV",
    ],
    highlight: null,
    popular: false,
  },
  {
    id: "once_180",
    name: "180 dias",
    price: "R$ 99,90",
    period: "",
    days: 180,
    priceId: "price_180_once",
    features: [
      "Navegação sem anúncios",
      "Estatísticas avançadas",
      "Palpites ilimitados",
      "Exportação CSV",
      "Alertas personalizados",
    ],
    highlight: "Mais vendido",
    popular: true,
  },
  {
    id: "once_365",
    name: "365 dias",
    price: "R$ 179,90",
    period: "",
    days: 365,
    priceId: "price_365_once",
    features: [
      "Navegação sem anúncios",
      "Estatísticas avançadas",
      "Palpites ilimitados",
      "Exportação CSV",
      "Alertas personalizados",
      "Acesso antecipado a novidades",
    ],
    highlight: "Máxima economia",
    popular: false,
  },
];

export default function Precos() {
  const { user } = useAuth();
  const { data: userPlan, isLoading: loadingPlan } = useUserPlan();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("subscription");

  const handlePurchase = (plan: typeof subscriptionPlans[0] | typeof oneTimePlans[0], isSubscription: boolean) => {
    if (!user) {
      // Redireciona para login mantendo a aba selecionada
      navigate(`/auth?redirect=/precos&tab=${activeTab}`);
      return;
    }

    // TODO: Integrar com Stripe Checkout
    // isSubscription ? mode=subscription : mode=payment
    console.log("Checkout:", { plan, isSubscription, priceId: plan.priceId });
  };

  const getButtonState = (planId: string) => {
    if (!user) {
      return { text: "Criar Conta", disabled: false };
    }
    
    if (loadingPlan) {
      return { text: "Carregando...", disabled: true };
    }

    if (userPlan?.isPremium) {
      return { text: "Plano Ativo", disabled: true };
    }

    return { text: planId.startsWith("sub_") ? "Assinar" : "Comprar acesso", disabled: false };
  };

  return (
    <Layout>
      {/* Esta página NÃO exibe anúncios */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Planos Statball</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Escolha como você quer{" "}
            <span className="gradient-text">usar o Statball</span>
          </h1>
          <p className="text-muted-foreground">
            Escolha entre assinatura com renovação automática ou acesso avulso sem renovação.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 h-12">
            <TabsTrigger value="subscription" className="flex items-center gap-2 text-sm">
              <RefreshCcw className="w-4 h-4" />
              Assinatura
              <span className="hidden sm:inline text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                recomendado
              </span>
            </TabsTrigger>
            <TabsTrigger value="onetime" className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4" />
              Avulso
            </TabsTrigger>
          </TabsList>

          {/* Assinatura Tab */}
          <TabsContent value="subscription" className="space-y-8">
            <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto">
              Renovação automática. Cancelamento em até 14 dias. <strong className="text-foreground">Sem anúncios no Premium.</strong>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {subscriptionPlans.map((plan) => {
                const btnState = getButtonState(plan.id);
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "glass-card p-5 relative flex flex-col",
                      plan.popular && "neon-border ring-2 ring-primary/50"
                    )}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                          plan.popular 
                            ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground" 
                            : "bg-secondary/20 text-secondary border border-secondary/30"
                        )}>
                          {plan.highlight}
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4 pt-2">
                      <h3 className="text-lg font-display font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-display font-bold gradient-text">
                          {plan.price}
                        </span>
                        <span className="text-muted-foreground text-sm">{plan.period}</span>
                      </div>
                      {plan.totalPrice && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Total: {plan.totalPrice}
                        </p>
                      )}
                      {plan.savings && (
                        <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-xs font-medium">
                          Economize {plan.savings}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2 mb-4 flex-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-secondary shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={plan.popular ? "premium" : "outline"}
                      className="w-full"
                      disabled={btnState.disabled}
                      onClick={() => handlePurchase(plan, true)}
                    >
                      {loadingPlan && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {btnState.text}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Renova automaticamente. Cancele em até 14 dias.
                    </p>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Avulso Tab */}
          <TabsContent value="onetime" className="space-y-8">
            <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto">
              Pagamento único. <strong className="text-foreground">Não renova automaticamente.</strong> Acesso expira ao final do período. Cancelamento em até 14 dias.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {oneTimePlans.map((plan) => {
                const btnState = getButtonState(plan.id);
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "glass-card p-5 relative flex flex-col",
                      plan.popular && "neon-border ring-2 ring-primary/50"
                    )}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                          plan.popular 
                            ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground" 
                            : "bg-secondary/20 text-secondary border border-secondary/30"
                        )}>
                          {plan.highlight}
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4 pt-2">
                      <h3 className="text-lg font-display font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-display font-bold gradient-text">
                          {plan.price}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Válido por {plan.days} dias
                      </div>
                    </div>

                    <ul className="space-y-2 mb-4 flex-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-secondary shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Aviso obrigatório de não renovação */}
                    <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3 border border-border/50">
                      <p className="text-xs text-center font-medium text-foreground flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Não renova automaticamente
                      </p>
                    </div>

                    <Button
                      variant={plan.popular ? "premium" : "outline"}
                      className="w-full"
                      disabled={btnState.disabled}
                      onClick={() => handlePurchase(plan, false)}
                    >
                      {loadingPlan && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {btnState.text}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Pagamento único. Não renova. Cancele em até 14 dias.
                    </p>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Qual escolher? */}
        <div className="max-w-3xl mx-auto mt-12 mb-12">
          <Card className="glass-card border-border/50">
            <CardContent className="p-6">
              <h3 className="text-lg font-display font-bold mb-6 text-center">
                Qual escolher?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <RefreshCcw className="w-4 h-4" />
                    Assinatura
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-secondary" />
                      Melhor custo-benefício
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-secondary" />
                      Renovação automática
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-secondary" />
                      Ideal para uso contínuo
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Zap className="w-4 h-4" />
                    Avulso
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-secondary" />
                      Mais flexível
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-secondary" />
                      Sem renovação automática
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-secondary" />
                      Ideal para testar por um período
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Garantia e Confiança */}
        <div className="max-w-3xl mx-auto mb-8">
          <Card className="glass-card border-primary/20">
            <CardContent className="p-6 md:p-8 text-center">
              <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">
                Garantia de 14 dias
              </h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-sm">
                Não ficou satisfeito? Devolvemos seu dinheiro em até 14 dias, sem perguntas e sem burocracia.
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

        {/* Rodapé legal */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>Cancelamento em até 14 dias</p>
          <p>
            <Link to="/termos" className="hover:text-foreground underline">Termos de uso</Link>
            {" | "}
            <Link to="/privacidade" className="hover:text-foreground underline">Política de privacidade</Link>
          </p>
          <p className="mt-4 text-muted-foreground/70">
            Plataforma de estatísticas e análises esportivas. Não é serviço de apostas.
          </p>
        </div>
      </div>
    </Layout>
  );
}
