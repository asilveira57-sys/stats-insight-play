import { Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AIAnalysisBlock({ analysis }: { analysis: any }) {
  if (!analysis) return null;
  return (
    <article className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <header className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">{analysis.title ?? "Cobertura por IA"}</h3>
        </div>
        <Badge variant="outline" className="text-xs">{analysis.analysis_type}</Badge>
      </header>
      {analysis.has_enough_data === false && (
        <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-md p-2 mb-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Cobertura parcial: dados ainda incompletos para esta análise.</span>
        </div>
      )}
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-foreground/90">{analysis.content}</div>
      {analysis.predicted_home_score != null && (
        <div className="mt-3 text-sm">
          <span className="text-muted-foreground">Previsão editorial: </span>
          <strong className="text-primary">{analysis.predicted_home_score} x {analysis.predicted_away_score}</strong>
        </div>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground italic">Previsão editorial esportiva, sem relação com apostas.</p>
    </article>
  );
}
