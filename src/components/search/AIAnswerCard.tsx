import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertCircle, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { AIAnswer, SearchEntity } from "@/hooks/useIntelligentSearch";
import { Link } from "react-router-dom";

interface Props {
  answer: AIAnswer;
  sources?: SearchEntity[];
}

export function AIAnswerCard({ answer, sources = [] }: Props) {
  const hasData = answer.has_enough_data;
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Resposta da IA Statball
          </CardTitle>
          <Badge variant={hasData ? "default" : "destructive"} className="text-[10px]">
            {hasData ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" />Dados confirmados</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" />Dados insuficientes</>
            )}
            {hasData && answer.confidence ? ` · ${Math.round(answer.confidence)}%` : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{answer.answer}</ReactMarkdown>
        </div>
        {answer.explanation && (
          <p className="text-xs text-muted-foreground border-l-2 border-primary/50 pl-3 italic">
            {answer.explanation}
          </p>
        )}
        {sources.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Fontes consultadas:</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s, i) => (
                <Link
                  key={i}
                  to={
                    s.type === "team" ? `/times` :
                    s.type === "league" ? `/campeonatos` :
                    `/pesquisa?q=${encodeURIComponent(s.name)}`
                  }
                >
                  <Badge variant="outline" className="text-[10px] hover:bg-muted cursor-pointer">
                    {s.type === "team" ? "Time" : s.type === "league" ? "Liga" : "Jogador"}: {s.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
        {!hasData && (
          <p className="text-xs text-muted-foreground">
            A IA Statball nunca inventa dados. Quando o banco interno não tem informação suficiente, ela informa explicitamente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
