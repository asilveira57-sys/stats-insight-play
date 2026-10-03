import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  usePlans, 
  useCreatePayment, 
  useCreateSubscription, 
  useHasActiveAccess,
  type Plan 
} from "@/hooks/usePayments";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Check, 
  Crown, 
  Shield, 
  CreditCard,
  RefreshCcw,
  Loader2,
  Zap,
  Clock,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Precos() {
  const { user } = useAuth();
  const { data: plans, isLoading: loadingPlans } = usePlans();
  const { hasAccess, isLoading: loadingAccess, isInTrial, periodEnd } = useHasActiveAccess();
  const createPayment = useCreatePayment();
  const createSubscription = useCreateSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "subscription");
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const subscriptionPlans = plans?.filter(p => p.type === "subscription_monthly") || [];
  const oneTimePlans = plans?.filter(p => p.type === "one_time_days").sort((a, b) => (a.days || 0) - (b.days || 0)) || [];

  const handlePurchase = async (plan: Plan) => {
    if (!user) {
      navigate(`/auth?redirect=/precos&tab=${activeTab}`);
      return;
    }

    if (hasAccess) {
      toast({
        title: "Você já tem acesso Premium",
        description: "Gerencie sua assinatura na página Minha Conta.",
      });
      return;
    }

    setProcessingPlanId(plan.id);

    try {
      let result;
      
      if (plan.type === "subscription_monthly") {
        result = await createSubscription.mutateAsync({ plan_id: plan.id });
      } else {
        result = await createPayment.mutateAsync({ plan_id: plan.id });
      }

      // Redirect to Mercado Pago checkout
      const checkoutUrl = result.init_point || result.sandbox_init_point;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Erro ao processar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getButtonState = (plan: Plan) => {
    if (!user) {
      return { text: "Criar Conta", disabled: false, loading: false };
    }
    
    if (loadingAccess) {
      return { text: "Carregando...", disabled: true, loading: true };
    }

    if (hasAccess) {
      return { text: "Plano Ativo", disabled: true, loading: false };
    }

    if (processingPlanId === plan.id) {
      return { text: "Processando...", disabled: true, loading: true };
    }

    return { 
      text: plan.type === "subscription_monthly" ? "Assinar" : "Comprar acesso", 
      disabled: false, 
      loading: false 
    };
  };

  if (loadingPlans) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Active Access Banner */}
        {!loadingAccess && hasAccess && user && (
          <div className="max-w-3xl mx-auto mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary/15 via-card to-secondary/15 border border-primary/30">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-display font-bold mb-1">
                  Você já tem acesso Premium! 🎉
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isInTrial 
                    ? "Seu período de teste está ativo. Aproveite todos os recursos premium!"
                    : "Seu plano está ativo. Aproveite todos os recursos premium!"}
                  {periodEnd && (
                    <span className="block mt-1 text-xs">
                      Acesso válido até: <strong className="text-foreground">{periodEnd.toLocaleDateString('pt-BR')}</strong>
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild size="sm">
                  <Link to="/palpites">
                    <Zap className="w-4 h-4 mr-2" />
                    Ir para Palpites
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/minha-assinatura">
                    Gerenciar Plano
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Planos Aleball</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Escolha como você quer{" "}
            <span className="gradient-text">usar o Aleball</span>
          </h1>
          <p className="text-muted-foreground">
            {hasAccess 
              ? "Você já possui acesso Premium. Veja abaixo os planos disponíveis para referência."
              : "Escolha entre assinatura com renovação automática ou acesso avulso sem renovação."}
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

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-8">
            <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto">
              Renovação automática. Cancelamento em até 14 dias. <strong className="text-foreground">Sem anúncios no Premium.</strong>
            </p>

            <div className="flex flex-wrap justify-center gap-6">
              {subscriptionPlans.map((plan) => {
                const btnState = getButtonState(plan);
                const isPopular = plan.highlight_label?.toLowerCase().includes("recomendado");
                
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative flex flex-col",
                      isPopular && "border-primary shadow-lg shadow-primary/20"
                    )}
                  >
                    {plan.highlight_label && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge variant="default" className="bg-gradient-to-r from-primary to-secondary">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {plan.highlight_label}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pt-8">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-bold gradient-text">
                          {formatPrice(plan.price_cents)}
                        </span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                      )}
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-3 mb-6 flex-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-secondary shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        variant={isPopular ? "default" : "outline"}
                        className="w-full"
                        disabled={btnState.disabled}
                        onClick={() => handlePurchase(plan)}
                      >
                        {btnState.loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {btnState.text}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        Renova automaticamente. Cancele quando quiser.
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* One-time Tab */}
          <TabsContent value="onetime" className="space-y-8">
            <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto">
              Pagamento único. <strong className="text-foreground">Não renova automaticamente.</strong> Acesso expira ao final do período.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {oneTimePlans.map((plan) => {
                const btnState = getButtonState(plan);
                const isPopular = plan.highlight_label?.toLowerCase().includes("vendido");

                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative flex flex-col",
                      isPopular && "border-primary shadow-lg shadow-primary/20"
                    )}
                  >
                    {plan.highlight_label && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge variant="default" className="bg-gradient-to-r from-primary to-secondary">
                          {plan.highlight_label}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pt-6 pb-2">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl font-bold gradient-text">
                          {formatPrice(plan.price_cents)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Válido por {plan.days} dias
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col pt-2">
                      <ul className="space-y-2 mb-4 flex-1">
                        {plan.features.slice(0, 4).map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-secondary shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3 border border-border/50">
                        <p className="text-xs text-center font-medium flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          Não renova automaticamente
                        </p>
                      </div>

                      <Button
                        variant={isPopular ? "default" : "outline"}
                        className="w-full"
                        disabled={btnState.disabled}
                        onClick={() => handlePurchase(plan)}
                      >
                        {btnState.loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {btnState.text}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Guarantee */}
        <div className="max-w-3xl mx-auto mt-12 mb-8">
          <Card className="border-primary/20">
            <CardContent className="p-6 md:p-8 text-center">
              <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">
                Garantia de 7 dias
              </h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-sm">
                Não ficou satisfeito? Devolvemos seu dinheiro em até 7 dias, sem perguntas.
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
                  Mercado Pago
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
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
