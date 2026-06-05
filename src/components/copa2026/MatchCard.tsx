import { Link } from "react-router-dom";
import { TeamFlag } from "./TeamCard";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MatchCard({ match }: { match: any }) {
  const d = match.match_date ? new Date(match.match_date) : null;
  const dateStr = d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  const statusVariant = match.status === "live" ? "destructive" : match.status === "finished" ? "secondary" : "outline";
  const statusLabel = match.status === "live" ? "AO VIVO" : match.status === "finished" ? "Encerrado" : "Agendado";
  return (
    <Link to={`/copa-2026/jogos/${match.id}`} className="block rounded-xl border border-border bg-card hover:border-primary/60 transition-all p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr}</span>
        <Badge variant={statusVariant} className="text-[10px]">{statusLabel}</Badge>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamFlag team={match.home} />
          <span className="font-medium truncate">{match.home?.name ?? "—"}</span>
        </div>
        <div className="px-2 font-bold text-lg tabular-nums">
          {match.status === "scheduled" ? "vs" : `${match.home_score ?? 0} - ${match.away_score ?? 0}`}
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
    </Link>
  );
}
