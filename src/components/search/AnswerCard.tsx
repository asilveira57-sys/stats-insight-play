import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Link as LinkIcon, Database, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import type { StructuredAnswer } from "@/hooks/useIntelligentSearch";
import { CompetitionBreakdown } from "./CompetitionBreakdown";
import { MatchesList } from "./MatchesList";

interface Props {
  data: StructuredAnswer;
  postSlug?: string | null;
}

function HeaderRow({ postSlug, title = "Resposta Statball", icon: Icon = Sparkles }: { postSlug?: string | null; title?: string; icon?: any }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
      {postSlug && (
        <Link to={`/pesquisa/${postSlug}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          <LinkIcon className="h-3 w-3" /> Página desta pergunta
        </Link>
      )}
    </div>
  );
}

export function AnswerCard({ data, postSlug }: Props) {
  if (data.kind === "team_stats") {
    const b = data.breakdown;
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-3"><HeaderRow postSlug={postSlug} /></CardHeader>
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

          {data.competitions.length > 0 && <CompetitionBreakdown competitions={data.competitions} />}
          {data.matches.length > 0 && <MatchesList matches={data.matches} totalMatches={data.total_matches} />}
        </CardContent>
      </Card>
    );
  }

  if (data.kind === "last_match") {
    const m = data.match;
    const placar = `${m.gols_casa ?? "?"} x ${m.gols_fora ?? "?"}`;
    const opp = m.is_home ? m.away_team : m.home_team;
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-3"><HeaderRow postSlug={postSlug} title="Último jogo" icon={Trophy} /></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-6 py-4 text-center">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">{m.home_team}</div>
              <div className="text-4xl font-bold text-primary">{m.gols_casa ?? "—"}</div>
            </div>
            <div className="text-muted-foreground text-xl">×</div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">{m.away_team}</div>
              <div className="text-4xl font-bold text-primary">{m.gols_fora ?? "—"}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            {m.date && <Badge variant="outline">{String(m.date).slice(0, 10)}</Badge>}
            {data.competition?.name && <Badge variant="secondary">{data.competition.name}</Badge>}
            {m.stage && <Badge variant="outline">{m.stage}</Badge>}
          </div>
          <p className="text-sm text-center">
            {data.team.slug ? (
              <Link to={`/times/${data.team.slug}`} className="text-primary hover:underline font-medium">{data.team.name}</Link>
            ) : (
              <span className="font-medium">{data.team.name}</span>
            )}{" "}
            {m.is_home ? "recebeu" : "visitou"} o <strong>{opp}</strong> — placar final <strong>{placar}</strong>.
          </p>
          {m.slug && (
            <div className="text-center">
              <Link to={`/partida/${m.slug}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <LinkIcon className="h-3 w-3" /> Ver detalhes da partida
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (data.kind === "standings") {
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-3"><HeaderRow postSlug={postSlug} title="Classificação" icon={Trophy} /></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-snug">{data.summary}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">Time</th>
                  <th className="py-2 text-right font-medium">Pts</th>
                  <th className="py-2 text-right font-medium">J</th>
                  <th className="py-2 text-right font-medium">V</th>
                  <th className="py-2 text-right font-medium">E</th>
                  <th className="py-2 text-right font-medium">D</th>
                  <th className="py-2 text-right font-medium">SG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.standings.slice(0, 20).map((row) => (
                  <tr key={row.out_team_id}>
                    <td className="py-2 text-muted-foreground">{row.out_pos}</td>
                    <td className="py-2 font-medium">
                      {row.out_team_slug ? (
                        <Link to={`/times/${row.out_team_slug}`} className="text-primary hover:underline">
                          {row.out_team_nome}
                        </Link>
                      ) : row.out_team_nome}
                    </td>
                    <td className="py-2 text-right font-semibold">{row.out_points}</td>
                    <td className="py-2 text-right">{row.out_played}</td>
                    <td className="py-2 text-right">{row.out_won}</td>
                    <td className="py-2 text-right">{row.out_drawn}</td>
                    <td className="py-2 text-right">{row.out_lost}</td>
                    <td className="py-2 text-right">{row.out_gd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Badge variant="outline">Fonte: {data.source}</Badge>
        </CardContent>
      </Card>
    );
  }

  if (data.kind === "competition_matches") {
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-3"><HeaderRow postSlug={postSlug} title="Jogos encontrados" icon={Trophy} /></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-snug">{data.summary}</p>
          {data.matches.length > 0 && <MatchesList matches={data.matches} totalMatches={data.total_matches} />}
          <Badge variant="outline">Fonte: {data.source}</Badge>
        </CardContent>
      </Card>
    );
  }

  if (data.kind === "external") {
    return (
      <Card className="border-yellow-500/40">
        <CardHeader className="pb-3"><HeaderRow postSlug={postSlug} title="Resposta Statball" icon={Database} /></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-base leading-relaxed whitespace-pre-wrap">{data.summary}</p>
          <p className="text-xs text-muted-foreground">{data.note}</p>
        </CardContent>
      </Card>
    );
  }

  // top_scorer
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3"><HeaderRow postSlug={postSlug} /></CardHeader>
      <CardContent>
        <p className="text-base leading-snug">{data.summary}</p>
      </CardContent>
    </Card>
  );
}
