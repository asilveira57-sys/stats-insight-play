import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { Brain, Check, X, Radio, Calendar } from "lucide-react";
import { OddsMini } from "@/components/odds/PartidaOddsBlock";
import type { PartidaOdds } from "@/hooks/usePartidaOdds";
import { predictedOutcome, realOutcome, resultHit, scoreHit, type BRMatch } from "@/hooks/useBrasileirao";


function fmtDate(iso: string, hora: string | null) {
  const d = new Date(hora ? `${iso.slice(0, 10)}T${hora}` : iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confBadge(c: number | null | undefined) {
  if (c == null) return null;
  const v = c <= 1 ? c * 100 : c;
  if (v >= 70) return { label: "Confiança alta", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };
  if (v >= 40) return { label: "Confiança média", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
  return { label: "Confiança baixa", className: "bg-muted text-muted-foreground" };
}

const outcomeLabel = (o: string | null) => (o === "casa" ? "Casa" : o === "fora" ? "Fora" : o === "empate" ? "Empate" : "—");

export function BrasileiraoMatchCard({ match, odds }: { match: BRMatch; odds?: PartidaOdds | null }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const p = match.palpite;
  const hasScorePred = p && p.placar_casa_estimado != null && p.placar_fora_estimado != null;
  const conf = confBadge(p?.confianca);
  const hit = isFinished && p ? resultHit(match) : null;
  const exact = isFinished && p ? scoreHit(match) : false;

  const href = match.slug ? `/partida/${match.slug}` : null;

  const inner = (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors h-full flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {fmtDate(match.data, match.hora)}
          {match.rodada != null && <span className="ml-1">· {match.rodada}ª rodada</span>}
        </span>
        {isLive ? (
          <Badge variant="destructive" className="animate-pulse inline-flex items-center gap-1">
            <Radio className="w-3 h-3" /> AO VIVO
          </Badge>
        ) : (
          <Badge variant={isFinished ? "secondary" : "outline"}>{isFinished ? "Encerrado" : "Agendado"}</Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamBadge
            name={match.time_casa?.nome ?? "?"}
            primaryColor={match.time_casa?.cores?.primary}
            secondaryColor={match.time_casa?.cores?.secondary}
            size="sm"
          />
          <span className="font-medium truncate">{match.time_casa?.nome ?? "—"}</span>
        </div>
        <div className="text-xl font-bold tabular-nums px-2 whitespace-nowrap">
          {isFinished || isLive ? `${match.gols_casa ?? 0} - ${match.gols_fora ?? 0}` : "vs"}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-medium truncate text-right">{match.time_fora?.nome ?? "—"}</span>
          <TeamBadge
            name={match.time_fora?.nome ?? "?"}
            primaryColor={match.time_fora?.cores?.primary}
            secondaryColor={match.time_fora?.cores?.secondary}
            size="sm"
          />
        </div>
      </div>

      {odds && <OddsMini odds={odds} />}

      <div className="mt-auto rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1.5">

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <Brain className="w-3.5 h-3.5" /> Palpite da IA
          </span>
          {hasScorePred ? (
            <span className="font-bold tabular-nums">
              {p!.placar_casa_estimado} - {p!.placar_fora_estimado}
            </span>
          ) : (
            <span className="text-muted-foreground">sem palpite</span>
          )}
        </div>
        {p && (
          <div className="flex flex-wrap items-center gap-1.5">
            {conf && <Badge variant="outline" className={conf.className}>{conf.label}</Badge>}
            <Badge variant="outline">Tendência: {outcomeLabel(predictedOutcome(p))}</Badge>
            {isFinished && (
              <Badge
                variant="outline"
                className={hit ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}
              >
                {hit ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                {exact ? "Placar exato" : hit ? "Resultado certo" : "Errou"}
              </Badge>
            )}
            {isFinished && <Badge variant="outline">Oficial: {outcomeLabel(realOutcome(match))}</Badge>}
          </div>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link to={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}
