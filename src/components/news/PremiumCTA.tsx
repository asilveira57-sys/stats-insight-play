import { Link } from "react-router-dom";
import { Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumCTAProps {
  variant?: "inline" | "footer" | "subtle" | "prominent";
  message?: string;
}

export function PremiumCTA({ variant = "inline", message }: PremiumCTAProps) {
  if (variant === "prominent") {
    return (
      <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/15 via-card to-green-500/10 border border-primary/30">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-display font-bold mb-2">
              Clube Statball Premium
            </h3>
            <p className="text-muted-foreground">
              {message || "Acesse análises ainda mais detalhadas, estatísticas avançadas e dados exclusivos. Experiência sem anúncios e recursos premium."}
            </p>
          </div>
          <Button asChild size="lg" className="flex-shrink-0">
            <Link to="/precos">
              Conhecer Planos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "subtle") {
    return (
      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">
            {message || "Membros do Clube Statball acompanham análises completas e sem anúncios."}
          </p>
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to="/precos">
              Ver planos
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div className="my-10 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-primary/20">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-display font-bold mb-2">
              Clube Statball Premium
            </h3>
            <p className="text-muted-foreground">
              {message || "Acesse análises ainda mais detalhadas, estatísticas avançadas e dados exclusivos de todos os confrontos. Experiência sem anúncios e recursos premium."}
            </p>
          </div>
          <Button asChild size="lg" className="flex-shrink-0">
            <Link to="/precos">
              Conhecer Planos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-8 p-6 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-3">
            <strong className="text-foreground">Quer análises ainda mais detalhadas?</strong>{" "}
            {message || "Usuários do Clube Statball Premium acessam estatísticas avançadas, dados exclusivos e análises complementares de cada confronto."}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/precos">
              Ver planos Premium
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
