import { Link } from "react-router-dom";
import { Trophy, ChevronRight } from "lucide-react";
import type { CompetitionRow } from "@/hooks/useIntelligentSearch";

interface Props {
  competitions: CompetitionRow[];
  /** When provided, each row links to /pesquisa/{parentSlug}/competicao/{ligaSlug} */
  parentSlug?: string;
}

export function CompetitionBreakdown({ competitions, parentSlug }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        Por competição
      </h3>
      <ul className="divide-y divide-border rounded-md border">
        {competitions.map((c) => {
          const href = c.slug
            ? parentSlug
              ? `/pesquisa/${parentSlug}/competicao/${c.slug}`
              : `/campeonatos/${c.slug}`
            : null;

          const inner = (
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/40 transition">
              <span className="truncate">{c.name}</span>
              <span className="flex items-center gap-2 text-muted-foreground tabular-nums whitespace-nowrap">
                {c.total} jogos · {c.w}V {c.d}E {c.l}D
                {href && <ChevronRight className="h-3 w-3 text-primary/70" />}
              </span>
            </div>
          );
          return (
            <li key={c.id}>
              {href ? <Link to={href} className="block">{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
