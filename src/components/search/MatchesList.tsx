import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchRow } from "@/hooks/useIntelligentSearch";

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    const hasTime = /T|\s\d{2}:\d{2}/.test(d);
    const dt = new Date(hasTime ? d : `${d}T12:00:00Z`);
    if (Number.isNaN(dt.getTime())) return d.slice(0, 10);
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
        {visible.map((m) => {
          const detailPath = m.slug ? `/partida/${m.slug}` : m.detail_path ?? (m.liga_nome === "Copa do Mundo FIFA 2026" ? `/copa-2026/jogos/${m.id}` : null);
          const score = (
            <>
              <span className="tabular-nums text-xs text-muted-foreground w-20 shrink-0">{formatDate(m.data)}</span>
              <span className="truncate">
                {m.home_team}
                <span className="mx-1 font-semibold tabular-nums">{m.gols_casa ?? "-"}x{m.gols_fora ?? "-"}</span>
                {m.away_team}
              </span>
            </>
          );
          const meta = (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap inline-flex items-center gap-1">
              {m.liga_nome}
              {detailPath && <ChevronRight className="h-3 w-3 text-primary/70" />}
            </span>
          );
          const row = (
            <div className="px-3 py-2 text-sm flex items-center justify-between gap-3 hover:bg-muted/40 transition">
              <div className="flex items-center gap-2 min-w-0 flex-1">{score}</div>
              {meta}
            </div>
          );
          return (
            <li key={m.id}>
              {detailPath ? (
                <Link to={detailPath} className="block" aria-label={`Ver resumo de ${m.home_team} ${m.gols_casa ?? "-"}x${m.gols_fora ?? "-"} ${m.away_team}`}>
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
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
