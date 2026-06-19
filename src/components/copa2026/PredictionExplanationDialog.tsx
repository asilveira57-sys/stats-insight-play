import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2 } from "lucide-react";
import { usePredictionExplanation } from "@/hooks/usePredictionExplanation";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const FACTOR_LABELS: Record<string, string> = {
  elo: "Elo Rating",
  fifa: "Ranking FIFA",
  recent_form: "Forma recente",
  goals_for: "Gols marcados",
  goals_against: "Gols sofridos",
  home_advantage: "Mando de campo",
  absences: "Desfalques",
  h2h: "Histórico (H2H)",
};

export function PredictionExplanationDialog({ matchId, source = "wc2026" }: { matchId: string; source?: "wc2026" | "partidas" }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = usePredictionExplanation(matchId);
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await supabase.functions.invoke("explain-prediction", { body: { match_id: matchId, source } });
      await qc.invalidateQueries({ queryKey: ["prediction-explanation", matchId] });
    } finally {
      setGenerating(false);
    }
  };

  const weights = data?.weights ?? {};
  const entries = Object.entries(weights).sort((a, b) => Number(b[1]) - Number(a[1]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1">
          <Sparkles className="w-3 h-3" /> Por que essa previsão?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Por que essa previsão?</DialogTitle>
          <DialogDescription>Pesos auditáveis usados pelo modelo Statball AI.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Carregando…</div>
        ) : !data ? (
          <div className="py-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Esta previsão ainda não tem explicação registrada.</p>
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Gerando…</> : "Gerar explicação"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem pesos registrados.</p>
            ) : entries.map(([key, value]) => {
              const pct = Math.round(Number(value) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{FACTOR_LABELS[key] ?? key}</span>
                    <span className="tabular-nums text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
            {data.rationale && (
              <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground italic">
                {data.rationale}
              </div>
            )}
            <div className="pt-2 text-[10px] text-muted-foreground text-right">Modelo: {data.model_version}</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
