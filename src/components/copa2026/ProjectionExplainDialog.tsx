import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { BracketProjectionRow } from "@/hooks/useBracketProjection";
import { Sparkles, AlertTriangle, Calculator, Trophy, BarChart3, Activity } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proj?: BracketProjectionRow;
};

function pct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

function sourceLabel(src?: string) {
  switch (src) {
    case "official": return "Resultado oficial (já encerrado)";
    case "ai_analysis": return "Análise IA da partida (tabela world_cup_2026_ai_analyses)";
    case "poisson_model": return "Modelo Poisson + Monte Carlo (Sprint 4) — histórico em Copas + ranking FIFA + forma recente";
    case "ranking_model": return "Modelo Elo/ranking FIFA";
    case "fifa_ranking_fallback": return "Modelo Elo/ranking FIFA (fallback)";
    default: return src ?? "—";
  }
}

export function ProjectionExplainDialog({ open, onOpenChange, proj }: Props) {
  if (!proj) return null;
  const basis = (proj.basis ?? {}) as any;
  const probs = basis.probs ?? { pHome: proj.prob_home, pDraw: proj.prob_draw, pAway: proj.prob_away };
  const lambdas = basis.lambdas;
  const features = basis.features;
  const topScores: { h: number; a: number; prob: number }[] = basis.top_scores ?? [];
  const isPoisson = basis.source === "poisson_model";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Como a IA chegou nesse placar
          </DialogTitle>
          <DialogDescription>
            Auditoria estatística completa — sem invenção, sem palpite. Tudo vem de tabelas reais.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do confronto */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
            {proj.phase.replace(/_/g, " ")} · {proj.slot_code}
          </div>
          <div className="grid grid-cols-3 items-center gap-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <TeamFlag team={proj.home_team ?? undefined} size="md" />
              <div className="text-sm font-medium truncate w-full">{proj.home_team?.name}</div>
              <div className="text-[10px] text-muted-foreground">FIFA #{features?.home?.rank ?? "—"}</div>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {proj.home_score} <span className="text-muted-foreground">×</span> {proj.away_score}
              {proj.went_to_penalties && (
                <div className="text-xs text-amber-500 font-normal">
                  pênaltis {proj.home_pens}–{proj.away_pens}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <TeamFlag team={proj.away_team ?? undefined} size="md" />
              <div className="text-sm font-medium truncate w-full">{proj.away_team?.name}</div>
              <div className="text-[10px] text-muted-foreground">FIFA #{features?.away?.rank ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Fonte */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Fonte da projeção
          </h3>
          <p className="text-sm">{sourceLabel(basis.source)}</p>
        </section>

        {/* Probabilidades */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Probabilidades calculadas
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/30 p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Vitória mandante</div>
              <div className="text-lg font-bold text-emerald-500">{pct(probs?.pHome)}</div>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Empate</div>
              <div className="text-lg font-bold text-amber-500">{pct(probs?.pDraw)}</div>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Vitória visitante</div>
              <div className="text-lg font-bold text-blue-500">{pct(probs?.pAway)}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Confiança no vencedor: <span className="uppercase font-bold">{proj.confidence}</span>{" "}
            (Alta ≥ 55%, Média ≥ 42%, abaixo disso Baixa).
          </p>
        </section>

        {/* Features (Sprint 4) */}
        {isPoisson && features && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary flex items-center gap-2">
              <Activity className="w-4 h-4" /> Features estatísticas usadas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(["home", "away"] as const).map((side) => {
                const f = features[side];
                const team = side === "home" ? proj.home_team : proj.away_team;
                if (!f) return null;
                return (
                  <div key={side} className="rounded-md bg-muted/30 p-2 text-xs space-y-1">
                    <div className="font-semibold truncate">{team?.name}</div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Ataque</span><span className="tabular-nums">{f.attack}×</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Defesa</span><span className="tabular-nums">{f.defense}×</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Hist. gols/jogo (Copa)</span><span className="tabular-nums">{f.hist_gf}/{f.hist_ga}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Forma (últ. jogos)</span><span className="tabular-nums">{f.form_pts} pts</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Amostra</span><span className="tabular-nums">{f.samples} jogos</span></div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Distribuição de placares */}
        {isPoisson && topScores.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Placares mais prováveis (top 6)
            </h3>
            <div className="space-y-1">
              {topScores.map((s, i) => {
                const isModal = i === 0;
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-12 tabular-nums font-mono ${isModal ? "font-bold text-primary" : ""}`}>
                      {s.h} × {s.a}
                    </div>
                    <div className="flex-1 h-2 rounded bg-muted/30 overflow-hidden">
                      <div className={`h-full ${isModal ? "bg-primary" : "bg-muted-foreground/60"}`} style={{ width: `${(s.prob * 100 * 4).toFixed(1)}%` }} />
                    </div>
                    <div className="w-14 text-right tabular-nums">{(s.prob * 100).toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              O placar exibido é o <strong>modal</strong> (mais provável) da distribuição Poisson — não é o esperado, é o mais frequente nas simulações.
            </p>
          </section>
        )}

        {/* Fórmulas */}
        {isPoisson && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Fórmulas usadas</h3>
            <div className="text-xs space-y-1.5 font-mono bg-muted/30 rounded-md p-3">
              <div>λHome = 1.35 · atkHome · defAway · 1.08 · formH = <span className="text-primary">{lambdas?.lH ?? "—"}</span></div>
              <div>λAway = 1.35 · atkAway · defHome · (1/1.08) · formA = <span className="text-primary">{lambdas?.lA ?? "—"}</span></div>
              <div>P(h, a) = Poisson(λHome, h) × Poisson(λAway, a)</div>
              <div className="text-muted-foreground">Monte Carlo: 3000 sorteios desses placares → probabilidades agregadas</div>
            </div>
          </section>
        )}

        {/* Pênaltis */}
        {proj.went_to_penalties && (
          <section className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Disputa de pênaltis</h3>
            <p className="text-xs text-muted-foreground">
              Como o placar modal foi empate, decidimos por Bernoulli enviesada (60/40 máx) usando a diferença de ranking.
              Na agregada do Monte Carlo, os pênaltis são sorteados a cada uma das 3000 simulações.
            </p>
          </section>
        )}

        {/* Limitações honestas */}
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
          <h3 className="text-sm font-bold uppercase tracking-wide text-amber-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Limitações honestas
          </h3>
          <ul className="text-xs space-y-1 list-disc pl-4">
            <li>Histórico vem de <code>world_cup_2026_team_history</code> — só Copas do Mundo, não Eliminatórias/amistosos.</li>
            <li>Forma recente é só dos jogos da Copa 2026 já realizados; antes do torneio, não há sinal.</li>
            <li>Ainda não consideramos lesões, escalações nem viagens — entram em sprints futuros.</li>
            <li>Ranking FIFA vem do fallback Nov/2025 quando o campo no banco está vazio.</li>
          </ul>
        </section>

        {/* Raw basis para auditoria */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver JSON bruto (auditoria técnica)
          </summary>
          <pre className="mt-2 p-2 bg-muted/30 rounded text-[10px] overflow-x-auto">
{JSON.stringify({ basis, prob_home: proj.prob_home, prob_draw: proj.prob_draw, prob_away: proj.prob_away }, null, 2)}
          </pre>
        </details>
      </DialogContent>
    </Dialog>
  );
}
