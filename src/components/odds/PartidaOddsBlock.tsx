import { Badge } from "@/components/ui/badge";
import type { PartidaOdds } from "@/hooks/usePartidaOdds";

const fmt = (v: number | null) => (v == null ? "—" : v.toFixed(2));

/** Bloco compacto de odds 1 / X / 2 para cards de jogo. */
export function OddsMini({ odds }: { odds?: PartidaOdds | null }) {
  if (!odds || (odds.home_win == null && odds.draw == null && odds.away_win == null)) return null;
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="text-muted-foreground uppercase tracking-wide">
        {odds.is_pregame ? "Odds pré-jogo" : "Odds históricas"}
      </span>
      <span className="inline-flex gap-1 tabular-nums">
        <span className="rounded bg-muted px-1.5 py-0.5">1 {fmt(odds.home_win)}</span>
        <span className="rounded bg-muted px-1.5 py-0.5">X {fmt(odds.draw)}</span>
        <span className="rounded bg-muted px-1.5 py-0.5">2 {fmt(odds.away_win)}</span>
      </span>
    </div>
  );
}

/** Bloco detalhado de odds para a página da partida. */
export function PartidaOddsBlock({
  odds,
  homeName,
  awayName,
}: {
  odds?: PartidaOdds | null;
  homeName?: string;
  awayName?: string;
}) {
  if (!odds) return null;
  const rows = [
    { label: `Vitória ${homeName ?? "casa"}`, odd: odds.home_win, prob: odds.implied_prob_home },
    { label: "Empate", odd: odds.draw, prob: odds.implied_prob_draw },
    { label: `Vitória ${awayName ?? "fora"}`, odd: odds.away_win, prob: odds.implied_prob_away },
  ];
  const extras = [
    { label: "Mais de 2.5 gols", odd: odds.over_2_5 },
    { label: "Menos de 2.5 gols", odd: odds.under_2_5 },
    { label: "Ambas marcam: sim", odd: odds.btts_yes },
    { label: "Ambas marcam: não", odd: odds.btts_no },
  ].filter((e) => e.odd != null);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Referência de mercado</h3>
        <Badge variant="outline" className="text-[10px] uppercase">
          {odds.is_pregame ? "Pré-jogo" : "Histórica"}
        </Badge>
        <span className="text-xs text-muted-foreground">{odds.bookmaker}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-border/60 p-2">
            <p className="text-xs text-muted-foreground truncate">{r.label}</p>
            <p className="text-lg font-bold tabular-nums">{fmt(r.odd)}</p>
            {r.prob != null && (
              <p className="text-[10px] text-muted-foreground">Prob. implícita {r.prob.toFixed(1)}%</p>
            )}
          </div>
        ))}
      </div>
      {extras.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {extras.map((e) => (
            <Badge key={e.label} variant="secondary" className="text-[10px] tabular-nums">
              {e.label}: {fmt(e.odd!)}
            </Badge>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Dados de mercado exibidos apenas como referência estatística ao lado da análise do Statball. Não é
        recomendação de aposta.
      </p>
    </div>
  );
}
