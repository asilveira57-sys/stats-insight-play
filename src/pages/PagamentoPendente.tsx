import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

export default function PagamentoPendente() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card className="border-yellow-500/30">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
            
            <h1 className="text-2xl font-display font-bold mb-2">
              Pagamento Pendente
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Seu pagamento está sendo processado. Isso pode levar alguns minutos para pagamentos via Pix ou até 3 dias úteis para boleto.
            </p>

            <div className="p-4 rounded-lg bg-muted border mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4" />
                <span className="font-medium text-sm">Aguardando confirmação</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Assim que confirmarmos o pagamento, seu acesso será liberado automaticamente.
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/minha-assinatura">Verificar status</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
