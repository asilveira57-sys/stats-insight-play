import { Link } from "react-router-dom";
import { TeamFlag } from "./TeamCard";
import { WC2026PalpiteButton } from "./WC2026PalpiteButton";
import { Calendar, MapPin, Radio, FileText, Brain, Check, X, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useConfidenceAccuracy, type ConfidenceBand } from "@/hooks/useConfidenceAccuracy";
import { AuditBadge } from "./AuditBadge";
import { PredictionExplanationDialog } from "./PredictionExplanationDialog";
import { MatchOddsBlock } from "./MatchOddsBlock";

function confidenceBand(c: number | null | undefined): ConfidenceBand | null {
  if (c == null) return null;
  // confidence_score chega como 0-1 (frontend) ou 0-100 (db)
  const v = c <= 1 ? c * 100 : c;
  if (v >= 70) return "alta";
  if (v >= 40) return "media";
  return "baixa";
}

function bandStyle(band: ConfidenceBand | null) {
  if (band === "alta") return { label: "Alta", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };
  if (band === "media") return { label: "Média", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
  if (band === "baixa") return { label: "Baixa", className: "bg-muted text-muted-foreground" };
  return { label: "—", className: "bg-muted text-muted-foreground" };
}

export function MatchCard({ match }: { match: any }) {
  const d = match.match_date ? new Date(match.match_date) : null;
  const dateStr = d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const statusVariant = isLive ? "destructive" : isFinished ? "secondary" : "outline";
  const statusLabel = isLive ? "AO VIVO" : isFinished ? "Encerrado" : "Agendado";

  const ai = match.ai_prediction;
  const hasAI = ai && ai.predicted_home_score != null && ai.predicted_away_score != null;
  const band = confidenceBand(ai?.confidence_score);
  const conf = bandStyle(band);
  const { data: accuracyData } = useConfidenceAccuracy("WC2026");
  const accForBand = band ? accuracyData?.byBand[band] : null;
  const historicAcc = accForBand && accForBand.total_matches >= 3 ? Math.round(accForBand.accuracy_winner) : null;

  // Avaliar acerto da IA quando partida finalizada
  let aiExact = false, aiResult = false;
  if (hasAI && isFinished && match.home_score != null && match.away_score != null) {
    aiExact = ai.predicted_home_score === match.home_score && ai.predicted_away_score === match.away_score;
    const realSign = Math.sign(match.home_score - match.away_score);
    const predSign = Math.sign(ai.predicted_home_score - ai.predicted_away_score);
    aiResult = realSign === predSign;
  }

  return (
    <div className={`rounded-xl border ${isLive ? "border-destructive/60 shadow-[0_0_20px_-5px_hsl(var(--destructive)/0.5)]" : "border-border"} bg-card hover:border-primary/60 transition-all p-4`}>
      <Link to={`/copa-2026/jogos/${match.id}`} className="block">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr}</span>
          <Badge variant={statusVariant} className={`text-[10px] ${isLive ? "animate-pulse" : ""}`}>
            {isLive && <CircleDot className="w-3 h-3 mr-1 inline" />}{statusLabel}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamFlag team={match.home} />
            <span className="font-medium truncate">{match.home?.name ?? "—"}</span>
          </div>
          <div className={`px-2 font-bold text-2xl tabular-nums ${isLive ? "text-destructive" : ""}`}>
            {match.status === "scheduled" ? (
              <span className="text-base text-muted-foreground">vs</span>
            ) : (
              <>{match.home_score ?? 0} <span className="text-muted-foreground">-</span> {match.away_score ?? 0}</>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="font-medium truncate text-right">{match.away?.name ?? "—"}</span>
            <TeamFlag team={match.away} />
          </div>
        </div>
        {(match.stadium || match.group_letter) && (
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            {match.group_letter && <span>Grupo {match.group_letter}</span>}
            {match.stadium && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{match.stadium}</span>}
          </div>
        )}

        {/* Palpite da IA — sempre visível quando existe */}
        {hasAI && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <Brain className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Palpite IA</span>
                <span className="font-bold tabular-nums text-sm">
                  {ai.predicted_home_score} - {ai.predicted_away_score}
                </span>
                <Badge variant="outline" className={`text-[10px] ${conf.className}`}>
                  {conf.label}{historicAcc != null && <span className="ml-1 opacity-80">· {historicAcc}%</span>}
                </Badge>
                <AuditBadge matchId={match.id} />
              </div>
              {isFinished && (
                aiExact ? (
                  <Badge className="text-[10px] bg-emerald-500/20 text-emerald-500 border-emerald-500/40"><Check className="w-3 h-3 mr-1" />Placar exato</Badge>
                ) : aiResult ? (
                  <Badge className="text-[10px] bg-amber-500/20 text-amber-500 border-amber-500/40"><Check className="w-3 h-3 mr-1" />Resultado</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground"><X className="w-3 h-3 mr-1" />Errou</Badge>
                )
              )}
            </div>
          </div>
        )}
      </Link>
      {hasAI && (
        <div className="mt-2 flex justify-start">
          <PredictionExplanationDialog matchId={match.id} source="wc2026" />
        </div>
      )}
      <MatchOddsBlock matchId={match.id} compact />
      <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
        {isLive ? (
          <Link to={`/copa-2026/jogos/${match.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Acompanhar jogo
          </Link>
        ) : isFinished ? (
          <Link to={`/copa-2026/jogos/${match.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <FileText className="w-3.5 h-3.5" /> Ver análise
          </Link>
        ) : (
          <WC2026PalpiteButton match={match} />
        )}
      </div>
    </div>
  );
}
