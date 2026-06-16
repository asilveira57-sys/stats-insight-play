import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

export interface TopScorer {
  jogador: string;
  slug?: string | null;
  time?: string | null;
  gols: number;
  temporada?: string | null;
}

interface Props {
  rows: TopScorer[];
  leagueName?: string | null;
  year?: number | null;
  source?: string;
}

export function TopScorersTable({ rows, leagueName, year, source }: Props) {
  if (!rows || rows.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Artilheiros — {leagueName ?? "Liga"}{year ? ` · ${year}` : ""}
          </CardTitle>
          {source && (
            <Badge variant="outline" className="text-[10px] uppercase">
              fonte: {source === "artilharia_agregada" ? "interna" : source === "gols_partida" ? "eventos" : source}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {rows.slice(0, 10).map((r, i) => (
            <div key={`${r.jogador}-${i}`} className="flex items-center justify-between py-2 text-sm">
              <div className="flex items-center gap-3">
                <span className={`w-6 text-right tabular-nums font-mono ${i === 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <div>
                  <div className="font-medium">{r.jogador}</div>
                  {r.time && <div className="text-xs text-muted-foreground">{r.time}</div>}
                </div>
              </div>
              <Badge variant={i === 0 ? "default" : "secondary"} className="tabular-nums">
                {r.gols} gols
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
