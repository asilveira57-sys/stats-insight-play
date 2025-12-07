import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  name: string;
  logo: string;
  score?: number;
}

export interface MatchCardProps {
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  time: string;
  league: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  matchday?: number;
  onClick?: () => void;
}

export function MatchCard({
  homeTeam,
  awayTeam,
  date,
  time,
  league,
  status,
  matchday,
  onClick,
}: MatchCardProps) {
  return (
    <div
      className="match-card cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="league-badge text-xs">
          {league}
        </span>
        {status === "live" && (
          <span className="live-indicator">AO VIVO</span>
        )}
        {status === "finished" && (
          <span className="text-xs text-muted-foreground">Encerrado</span>
        )}
        {status === "postponed" && (
          <span className="text-xs text-destructive">Adiado</span>
        )}
        {status === "cancelled" && (
          <span className="text-xs text-destructive">Cancelado</span>
        )}
        {status === "scheduled" && matchday && (
          <span className="text-xs text-muted-foreground">Rodada {matchday}</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-4">
        {/* Home Team */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <img
              src={homeTeam.logo}
              alt={homeTeam.name}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
              }}
            />
          </div>
          <span className="text-sm font-medium text-center line-clamp-1">
            {homeTeam.name}
          </span>
        </div>

        {/* Score / Time */}
        <div className="flex flex-col items-center gap-1">
          {status === "finished" || status === "live" ? (
            <div className="flex items-center gap-2">
              <span className={cn(
                "score-display",
                status === "live" && "neon-text"
              )}>
                {homeTeam.score}
              </span>
              <span className="text-muted-foreground">-</span>
              <span className={cn(
                "score-display",
                status === "live" && "neon-text"
              )}>
                {awayTeam.score}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-bold text-primary">{time}</span>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <img
              src={awayTeam.logo}
              alt={awayTeam.name}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
              }}
            />
          </div>
          <span className="text-sm font-medium text-center line-clamp-1">
            {awayTeam.name}
          </span>
        </div>
      </div>

      {/* Footer */}
      {status === "scheduled" && (
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {date}
          </span>
        </div>
      )}

      {/* Hover effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}
