import { Sparkles, AlertTriangle } from "lucide-react";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { ensureHtml } from "@/lib/markdownToHtml";

const proseClasses = `prose prose-sm dark:prose-invert max-w-none text-foreground/90
  [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-foreground
  [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground
  [&_p]:mb-3 [&_p]:leading-relaxed
  [&_ul]:my-3 [&_ul]:pl-5 [&_ul>li]:mb-1
  [&_strong]:text-foreground [&_strong]:font-semibold
  [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_table]:text-xs
  [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold
  [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5
  [&_hr]:my-5 [&_hr]:border-border`;

export function AIAnalysisBlock({ analysis }: { analysis: any }) {
  if (!analysis) return null;
  const html = DOMPurify.sanitize(ensureHtml(analysis.content ?? ""));
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
      <div className={proseClasses} dangerouslySetInnerHTML={{ __html: html }} />
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
