import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchRow } from "@/hooks/useIntelligentSearch";

function formatDate(d: string | null) {
  if (!d) return "—";
  // database stores UTC; show as Brasília (UTC-3) date-only
  try {
    const dt = new Date(d + "T12:00:00Z");
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
  } catch {
    return d.slice(0, 10);
  }
}

export function MatchesList({ matches, totalMatches }: { matches: MatchRow[]; totalMatches: number }) {
  const [shown, setShown] = useState(10);
  const visible = matches.slice(0, shown);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        Partidas {totalMatches > matches.length ? `(últimas ${matches.length} de ${totalMatches})` : `(${totalMatches})`}
      </h3>
      <ul className="divide-y divide-border rounded-md border">
        {visible.map((m) => (
          <li key={m.id} className="px-3 py-2 text-sm flex items-center justify-between gap-3 hover:bg-muted/40 transition">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="tabular-nums text-xs text-muted-foreground w-20 shrink-0">{formatDate(m.data)}</span>
              <span className="truncate">
                {m.home_team_slug ? (
                  <Link to={`/times/${m.home_team_slug}`} className="hover:underline">{m.home_team}</Link>
                ) : m.home_team}
                <span className="mx-1 font-semibold tabular-nums">{m.gols_casa ?? "-"}x{m.gols_fora ?? "-"}</span>
                {m.away_team_slug ? (
                  <Link to={`/times/${m.away_team_slug}`} className="hover:underline">{m.away_team}</Link>
                ) : m.away_team}
              </span>
            </div>
            {m.liga_slug && (
              <Link
                to={`/campeonatos/${m.liga_slug}`}
                className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-primary whitespace-nowrap"
              >
                {m.liga_nome}
              </Link>
            )}
          </li>
        ))}
      </ul>
      {shown < matches.length && (
        <div className="text-center mt-3">
          <Button variant="outline" size="sm" onClick={() => setShown((n) => n + 20)}>
            Ver mais
          </Button>
        </div>
      )}
    </div>
  );
}
