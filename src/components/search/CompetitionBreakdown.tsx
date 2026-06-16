import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import type { CompetitionRow } from "@/hooks/useIntelligentSearch";

export function CompetitionBreakdown({ competitions }: { competitions: CompetitionRow[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        Por competição
      </h3>
      <ul className="divide-y divide-border rounded-md border">
        {competitions.map((c) => {
          const inner = (
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/40 transition">
              <span className="truncate">{c.name}</span>
              <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                {c.total} jogos · {c.w}V {c.d}E {c.l}D
              </span>
            </div>
          );
          return (
            <li key={c.id}>
              {c.slug ? (
                <Link to={`/campeonatos/${c.slug}`} className="block">{inner}</Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
