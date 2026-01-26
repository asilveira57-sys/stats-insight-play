import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  useUserSubscription, 
  usePaymentHistory, 
  useSubscriptionRecords,
  useCancelSubscription,
  useRequestRefund,
} from "@/hooks/usePayments";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Crown, 
  CreditCard, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Loader2,
  ReceiptText,
  Ban
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function MinhaAssinatura() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: subscription, isLoading: loadingSub } = useUserSubscription();
  const { data: payments, isLoading: loadingPayments } = usePaymentHistory();
  const { data: subscriptionRecords, isLoading: loadingRecords } = useSubscriptionRecords();
  const cancelSubscription = useCancelSubscription();
  const requestRefund = useRequestRefund();
  const [refundingPaymentId, setRefundingPaymentId] = useState<string | null>(null);

  if (!user) {
    navigate("/auth?redirect=/minha-assinatura");
    return null;
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      trial_active: { label: "Período de Teste", variant: "secondary", icon: Clock },
      active: { label: "Ativo", variant: "default", icon: CheckCircle },
      past_due: { label: "Pagamento Pendente", variant: "destructive", icon: AlertTriangle },
      canceled: { label: "Cancelado", variant: "outline", icon: XCircle },
      blocked: { label: "Bloqueado", variant: "destructive", icon: Ban },
      expired: { label: "Expirado", variant: "outline", icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.expired;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription.mutateAsync();
      toast({
        title: "Assinatura cancelada",
        description: "Você ainda terá acesso até o fim do período pago.",
      });
    } catch (error) {
      toast({
        title: "Erro ao cancelar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRequestRefund = async (paymentId: string) => {
    setRefundingPaymentId(paymentId);
    try {
      await requestRefund.mutateAsync({ payment_id: paymentId });
      toast({
        title: "Reembolso solicitado",
        description: "Seu reembolso será processado em breve.",
      });
    } catch (error) {
      toast({
        title: "Erro ao solicitar reembolso",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRefundingPaymentId(null);
    }
  };

  const isRefundable = (payment: any) => {
    if (payment.status !== "approved" || !payment.refundable_until) return false;
    return isFuture(new Date(payment.refundable_until));
  };

  const hasActiveRecurringSubscription = subscriptionRecords?.some(
    s => s.status === "authorized" || s.status === "pending"
  );

  if (loadingSub) {
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
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Crown className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Minha Assinatura</h1>
            <p className="text-muted-foreground">Gerencie seu plano e pagamentos</p>
          </div>
        </div>

        {/* Current Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status Atual</CardTitle>
              {subscription?.subscription_status && getStatusBadge(subscription.subscription_status)}
            </div>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Plano</p>
                    <p className="font-semibold capitalize">{subscription.tipo_plano}</p>
                  </div>
                  
                  {subscription.current_period_end && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        {isPast(new Date(subscription.current_period_end)) ? "Expirou em" : "Acesso até"}
                      </p>
                      <p className="font-semibold">
                        {format(new Date(subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(subscription.current_period_end), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Dias Creditados</p>
                    <p className="font-semibold">{subscription.total_days_credited || 0} dias</p>
                  </div>
                </div>

                {subscription.subscription_status === "trial_active" && subscription.trial_ends_at && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="flex items-center gap-2 text-primary">
                      <Clock className="w-5 h-5" />
                      <span className="font-medium">Período de teste</span>
                    </div>
                    <p className="text-sm mt-1">
                      Seu teste gratuito termina em{" "}
                      <strong>
                        {format(new Date(subscription.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}
                      </strong>
                      . Após isso, você precisará assinar para continuar usando.
                    </p>
                    <Button className="mt-3" onClick={() => navigate("/precos")}>
                      Ver Planos
                    </Button>
                  </div>
                )}

                {subscription.subscription_status === "past_due" && subscription.grace_until && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Período de tolerância</span>
                    </div>
                    <p className="text-sm mt-1">
                      Houve um problema com seu pagamento. Você tem até{" "}
                      <strong>
                        {format(new Date(subscription.grace_until), "dd/MM/yyyy", { locale: ptBR })}
                      </strong>
                      {" "}para regularizar.
                    </p>
                  </div>
                )}

                {subscription.subscription_status === "expired" && (
                  <div className="p-4 rounded-lg bg-muted border">
                    <p className="text-sm">
                      Seu acesso expirou. Renove para continuar usando todos os recursos.
                    </p>
                    <Button className="mt-3" onClick={() => navigate("/precos")}>
                      Renovar Agora
                    </Button>
                  </div>
                )}

                {/* Cancel subscription button */}
                {hasActiveRecurringSubscription && (
                  <div className="pt-4 border-t">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-destructive hover:text-destructive">
                          Cancelar Assinatura
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Você continuará tendo acesso até o fim do período atual. 
                            Após isso, sua conta voltará ao plano gratuito.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={cancelSubscription.isPending}
                          >
                            {cancelSubscription.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Confirmar Cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Você ainda não tem uma assinatura ativa.</p>
                <Button onClick={() => navigate("/precos")}>Ver Planos</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments" className="gap-2">
              <ReceiptText className="w-4 h-4" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              Assinaturas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
                <CardDescription>Seus pagamentos avulsos e recibos</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPayments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : payments && payments.length > 0 ? (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <CreditCard className="w-10 h-10 text-muted-foreground p-2 bg-muted rounded-lg" />
                          <div>
                            <p className="font-medium">{payment.plan?.name || "Pagamento"}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatPrice(payment.amount_cents)}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={payment.status === "approved" ? "default" : "secondary"}>
                              {payment.status === "approved" ? "Aprovado" : payment.status}
                            </Badge>
                            {isRefundable(payment) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-xs h-6">
                                    Reembolso
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Solicitar reembolso?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      O valor de {formatPrice(payment.amount_cents)} será devolvido 
                                      e os {payment.days_granted} dias serão removidos da sua conta.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRequestRefund(payment.id)}
                                      disabled={refundingPaymentId === payment.id}
                                    >
                                      {refundingPaymentId === payment.id && (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      )}
                                      Confirmar Reembolso
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum pagamento registrado.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assinaturas Recorrentes</CardTitle>
                <CardDescription>Suas assinaturas com renovação automática</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRecords ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : subscriptionRecords && subscriptionRecords.length > 0 ? (
                  <div className="space-y-4">
                    {subscriptionRecords.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <RefreshCcw className="w-10 h-10 text-muted-foreground p-2 bg-muted rounded-lg" />
                          <div>
                            <p className="font-medium">{sub.plan?.name || sub.reason || "Assinatura"}</p>
                            <p className="text-sm text-muted-foreground">
                              Criada em {format(new Date(sub.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            {sub.next_payment_date && sub.status === "authorized" && (
                              <p className="text-xs text-muted-foreground">
                                Próximo pagamento: {format(new Date(sub.next_payment_date), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={sub.status === "authorized" ? "default" : "secondary"}>
                          {sub.status === "authorized" ? "Ativa" : 
                           sub.status === "cancelled" ? "Cancelada" : sub.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma assinatura recorrente.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
