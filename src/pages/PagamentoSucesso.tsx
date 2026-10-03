import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

export default function PagamentoSucesso() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate subscription queries to refresh status
    queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
    queryClient.invalidateQueries({ queryKey: ["payment-history"] });
    queryClient.invalidateQueries({ queryKey: ["user-plan"] });
  }, [queryClient]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card className="border-green-500/30">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            
            <h1 className="text-2xl font-display font-bold mb-2">
              Pagamento Aprovado!
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Seu pagamento foi processado com sucesso. Você agora tem acesso completo ao Aleball Premium.
            </p>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 mb-6">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Crown className="w-5 h-5" />
                <span className="font-semibold">Bem-vindo ao Premium!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Aproveite estatísticas avançadas, navegação sem anúncios e muito mais.
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/">Começar a usar</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/minha-assinatura">Ver minha assinatura</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
