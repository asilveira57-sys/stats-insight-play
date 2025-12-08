import { ChevronRight, Calendar, CalendarOff } from "lucide-react";
import { Link } from "react-router-dom";

interface LeagueCardProps {
  id: string;
  name: string;
  country: string;
  logo: string;
  matchCount?: number;
}

export function LeagueCard({ id, name, country, logo, matchCount }: LeagueCardProps) {
  const hasMatchesToday = matchCount !== undefined && matchCount > 0;
  
  return (
    <Link
      to={`/resultados?liga=${id}`}
      className={`glass-card p-4 flex items-center gap-4 hover-glow group transition-all duration-300 hover:border-primary/50 ${
        !hasMatchesToday && matchCount !== undefined ? 'opacity-70' : ''
      }`}
    >
      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
        <img
          src={logo}
          alt={name}
          className="w-10 h-10 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://via.placeholder.com/40";
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="text-xs text-muted-foreground">{country}</p>
        {matchCount !== undefined && (
          hasMatchesToday ? (
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {matchCount} jogos hoje
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CalendarOff className="w-3 h-3" />
              Sem jogos hoje
            </p>
          )
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
