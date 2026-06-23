import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { BracketProjectionRow } from "@/hooks/useBracketProjection";
import { Sparkles, AlertTriangle, Calculator, Trophy } from "lucide-react";

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
    case "ranking_model": return "Modelo Elo/ranking FIFA (sem análise IA disponível)";
    case "fifa_ranking_fallback": return "Modelo Elo/ranking FIFA (fallback)";
    default: return src ?? "—";
  }
}

export function ProjectionExplainDialog({ open, onOpenChange, proj }: Props) {
  if (!proj) return null;
  const basis = (proj.basis ?? {}) as any;
  const probs = basis.probs ?? { pHome: proj.prob_home, pDraw: proj.prob_draw, pAway: proj.prob_away };
  const homeRank = basis.home_fifa ?? "—";
  const awayRank = basis.away_fifa ?? "—";
  const diff =
    probs?.pHome != null && probs?.pAway != null
      ? Number(probs.pHome) - Number(probs.pAway)
      : null;
  const lambdaHome = diff != null ? (1.45 + diff * 1.9).toFixed(2) : "—";
  const lambdaAway = diff != null ? (1.45 - diff * 1.9).toFixed(2) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Como a IA chegou nesse placar
          </DialogTitle>
          <DialogDescription>
            Auditoria estatística completa — sem invenção, sem palpite. Apenas Elo + ranking FIFA.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do confronto */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
            {proj.phase.replaceAll("_", " ")} · {proj.slot_code}
          </div>
          <div className="grid grid-cols-3 items-center gap-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <TeamFlag team={proj.home_team ?? undefined} size="md" />
              <div className="text-sm font-medium truncate w-full">{proj.home_team?.name}</div>
              <div className="text-[10px] text-muted-foreground">FIFA #{homeRank}</div>
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
              <div className="text-[10px] text-muted-foreground">FIFA #{awayRank}</div>
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
            (máx entre vitória/derrota — Alta ≥ 55%, Média ≥ 42%, abaixo disso Baixa).
          </p>
        </section>

        {/* Fórmulas */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Fórmulas usadas</h3>
          <div className="text-xs space-y-1.5 font-mono bg-muted/30 rounded-md p-3">
            <div>strength = 1000 − rank × 4</div>
            <div>diff = strengthHome − strengthAway</div>
            <div>pHome = 1 / (1 + 10^(−diff/400))  <span className="text-muted-foreground">// Elo padrão</span></div>
            <div>pDraw = 0.18 + closeness × 0.12  <span className="text-muted-foreground">// + empate se ranks próximos</span></div>
            <div>λHome = 1.45 + (pHome−pAway) × 1.9 = <span className="text-primary">{lambdaHome}</span></div>
            <div>λAway = 1.45 − (pHome−pAway) × 1.9 = <span className="text-primary">{lambdaAway}</span></div>
            <div className="text-muted-foreground">placar = round(λ); empate → desempate por ranking superior</div>
          </div>
        </section>

        {/* Pênaltis */}
        {proj.went_to_penalties && (
          <section className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Disputa de pênaltis</h3>
            <p className="text-xs text-muted-foreground">
              O modelo só vai aos pênaltis quando o placar projetado é empate em fase eliminatória. O vencedor é o time
              de melhor ranking FIFA (4×3). Esse é o ponto mais fraco do modelo atual e será substituído por simulação
              Monte Carlo na Sprint 4.
            </p>
          </section>
        )}

        {/* Limitações honestas */}
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
          <h3 className="text-sm font-bold uppercase tracking-wide text-amber-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Limitações deste modelo (versão atual)
          </h3>
          <ul className="text-xs space-y-1 list-disc pl-4">
            <li>Usa <strong>somente</strong> o ranking FIFA das seleções — não consulta média de gols, H2H histórico, últimos 5 jogos, lesões nem escalações.</li>
            <li>Quando o ranking FIFA está vazio no banco, usa uma tabela de <em>fallback</em> Nov/2025 (aproximação).</li>
            <li>Empates eliminatórios são decididos por ranking, não por simulação real de pênaltis.</li>
            <li>Não incorpora ainda os dados de forma recente da API-Football/Football-Data — isso entra na Sprint 4 (Monte Carlo + features avançadas).</li>
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
