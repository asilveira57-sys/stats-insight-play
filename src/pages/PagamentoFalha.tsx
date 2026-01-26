import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function PagamentoFalha() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            
            <h1 className="text-2xl font-display font-bold mb-2">
              Pagamento não aprovado
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Infelizmente seu pagamento não foi aprovado. Isso pode acontecer por diversos motivos, como limite insuficiente ou dados incorretos.
            </p>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/precos">Tentar novamente</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Se o problema persistir, entre em contato conosco.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
