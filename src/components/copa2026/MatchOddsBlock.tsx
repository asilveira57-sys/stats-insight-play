import { useMatchOdds } from "@/hooks/useMatchOdds";
import { Coins, TrendingUp } from "lucide-react";

interface Props {
  matchId: string;
  homeName?: string;
  awayName?: string;
  compact?: boolean;
}

function fmt(n: number | null | undefined) {
  return n && n > 1 ? n.toFixed(2) : "—";
}

export function MatchOddsBlock({ matchId, homeName, awayName, compact = false }: Props) {
  const { data: odds, isLoading } = useMatchOdds(matchId);

  if (isLoading) return null;
  if (!odds || (!odds.home_win && !odds.draw && !odds.away_win)) {
    return compact ? null : (
      <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground italic">
        Odds ainda não disponíveis para este jogo.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono mt-2">
        <div className="bg-muted/40 rounded px-1 py-0.5 text-center">
          <div className="text-[8px] uppercase text-muted-foreground">1</div>
          <div className="font-bold tabular-nums">{fmt(odds.home_win)}</div>
        </div>
        <div className="bg-muted/40 rounded px-1 py-0.5 text-center">
          <div className="text-[8px] uppercase text-muted-foreground">X</div>
          <div className="font-bold tabular-nums">{fmt(odds.draw)}</div>
        </div>
        <div className="bg-muted/40 rounded px-1 py-0.5 text-center">
          <div className="text-[8px] uppercase text-muted-foreground">2</div>
          <div className="font-bold tabular-nums">{fmt(odds.away_win)}</div>
        </div>
      </div>
    );
  }

  const topScores = Object.entries(odds.exact_scores ?? {})
    .filter(([, v]) => typeof v === "number" && v > 1)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 6);

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" /> Odds do mercado
        </h2>
        <span className="text-[10px] text-muted-foreground uppercase">
          Média de casas · API-Football · {new Date(odds.updated_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>

      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Resultado final (1X2)</div>
        <div className="grid grid-cols-3 gap-2">
          <OddCell label={homeName ?? "Mandante"} sub="1" odd={odds.home_win} prob={odds.implied_prob_home} />
          <OddCell label="Empate" sub="X" odd={odds.draw} prob={odds.implied_prob_draw} />
          <OddCell label={awayName ?? "Visitante"} sub="2" odd={odds.away_win} prob={odds.implied_prob_away} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Total de gols</div>
          <div className="grid grid-cols-2 gap-2">
            <OddCell label="Mais de 2.5" odd={odds.over_2_5} />
            <OddCell label="Menos de 2.5" odd={odds.under_2_5} />
          </div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Ambas marcam</div>
          <div className="grid grid-cols-2 gap-2">
            <OddCell label="Sim" odd={odds.btts_yes} />
            <OddCell label="Não" odd={odds.btts_no} />
          </div>
        </div>
      </div>

      {topScores.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Placares mais prováveis
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {topScores.map(([score, odd]) => (
              <div key={score} className="rounded border border-border bg-muted/30 px-2 py-1.5 text-center">
                <div className="font-bold tabular-nums">{score.replace("-", " x ")}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">{odd.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic">
        Odds informativas. Não constituem recomendação de aposta. Confira o regulamento de cada operador.
      </p>
    </section>
  );
}

function OddCell({ label, sub, odd, prob }: { label: string; sub?: string; odd: number | null; prob?: number | null }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
      <div className="text-[10px] uppercase text-muted-foreground truncate">{label}{sub ? ` · ${sub}` : ""}</div>
      <div className="text-lg font-bold tabular-nums">{fmt(odd)}</div>
      {prob != null && <div className="text-[10px] text-muted-foreground tabular-nums">{prob}%</div>}
    </div>
  );
}
