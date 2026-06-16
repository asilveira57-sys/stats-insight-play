import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { StructuredAnswer } from "@/hooks/useIntelligentSearch";
import { CompetitionBreakdown } from "./CompetitionBreakdown";
import { MatchesList } from "./MatchesList";

interface Props {
  data: StructuredAnswer;
  postSlug?: string | null;
}

export function AnswerCard({ data, postSlug }: Props) {
  if (data.kind === "team_stats") {
    const b = data.breakdown;
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Resposta Statball
            </CardTitle>
            {postSlug && (
              <Link
                to={`/pesquisa/${postSlug}`}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <LinkIcon className="h-3 w-3" /> Página desta pergunta
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-lg leading-snug">
            {data.team.slug ? (
              <Link to={`/times/${data.team.slug}`} className="font-semibold text-primary hover:underline">
                {data.team.name}
              </Link>
            ) : (
              <span className="font-semibold">{data.team.name}</span>
            )}{" "}
            disputou <strong>{b.total} partidas</strong>
            {data.year ? ` em ${data.year}` : ""}
            {data.scope === "home" ? " como mandante" : data.scope === "away" ? " como visitante" : ""}.
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{b.vitorias} V</Badge>
            <Badge variant="secondary">{b.empates} E</Badge>
            <Badge variant="destructive">{b.derrotas} D</Badge>
            <Badge variant="outline">{b.gols_pro} gols pró</Badge>
            <Badge variant="outline">{b.gols_contra} gols contra</Badge>
            <Badge variant="outline">
              {b.total > 0 ? (((b.vitorias * 3 + b.empates) / (b.total * 3)) * 100).toFixed(0) : 0}% aproveitamento
            </Badge>
          </div>

          {data.competitions.length > 0 && (
            <CompetitionBreakdown competitions={data.competitions} />
          )}

          {data.matches.length > 0 && (
            <MatchesList matches={data.matches} totalMatches={data.total_matches} />
          )}
        </CardContent>
      </Card>
    );
  }

  // top_scorer kind is rendered by TopScorersTable already; show a summary header here.
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Resposta Statball
          </CardTitle>
          {postSlug && (
            <Link to={`/pesquisa/${postSlug}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> Página desta pergunta
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-base leading-snug">{data.summary}</p>
      </CardContent>
    </Card>
  );
}
