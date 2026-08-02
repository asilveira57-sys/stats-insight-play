export type Outcome = "casa" | "empate" | "fora";

export type AuditInput = {
  /** Placar previsto pela IA (registrado antes do jogo) */
  predHome: number | null | undefined;
  predAway: number | null | undefined;
  /** Placar oficial */
  realHome: number | null | undefined;
  realAway: number | null | undefined;
  /** Probabilidades da IA, quando existirem (0-1 ou 0-100) */
  probHome?: number | null;
  probDraw?: number | null;
  probAway?: number | null;
};

export type AuditMetrics = {
  total: number;
  hitResult: number;
  hitDoubleChance: number;
  wrong: number;
  hitExact: number;
  accResult: number;
  accDoubleChance: number;
  accWrong: number;
  accExact: number;
};

const outcomeFromScore = (h: number, a: number): Outcome =>
  h > a ? "casa" : h < a ? "fora" : "empate";

/** Ordena os resultados do mais provável ao menos provável, segundo a IA. */
export function rankOutcomes(i: AuditInput): Outcome[] {
  const probs: Array<[Outcome, number]> = [
    ["casa", i.probHome ?? -1],
    ["empate", i.probDraw ?? -1],
    ["fora", i.probAway ?? -1],
  ];
  const hasProbs = probs.some(([, v]) => v >= 0);

  if (i.predHome != null && i.predAway != null) {
    const primary = outcomeFromScore(i.predHome, i.predAway);
    const rest = (["casa", "empate", "fora"] as Outcome[]).filter((o) => o !== primary);
    if (hasProbs) {
      rest.sort(
        (a, b) =>
          (probs.find(([o]) => o === b)![1] ?? -1) - (probs.find(([o]) => o === a)![1] ?? -1)
      );
    } else if (primary === "empate") {
      // Sem probabilidades, o empate é acompanhado da vitória do mandante (fator casa)
      rest.sort((a) => (a === "casa" ? -1 : 1));
    } else {
      // Vitória prevista é acompanhada do empate
      rest.sort((a) => (a === "empate" ? -1 : 1));
    }
    return [primary, ...rest];
  }

  if (!hasProbs) return [];
  return probs.sort((a, b) => b[1] - a[1]).map(([o]) => o);
}

/**
 * Métricas de auditoria: acerto de resultado (1X2), cobertura de dupla chance,
 * erro real e placar exato. Só considera jogos com palpite e placar oficial.
 */
export function computeAuditMetrics(items: AuditInput[]): AuditMetrics {
  let total = 0;
  let hitResult = 0;
  let hitDoubleChance = 0;
  let hitExact = 0;

  for (const i of items) {
    if (i.realHome == null || i.realAway == null) continue;
    const ranked = rankOutcomes(i);
    if (!ranked.length) continue;
    total++;
    const real = outcomeFromScore(i.realHome, i.realAway);
    if (ranked[0] === real) hitResult++;
    if (ranked.slice(0, 2).includes(real)) hitDoubleChance++;
    if (i.predHome === i.realHome && i.predAway === i.realAway) hitExact++;
  }

  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const wrong = total - hitDoubleChance;

  return {
    total,
    hitResult,
    hitDoubleChance,
    wrong,
    hitExact,
    accResult: pct(hitResult),
    accDoubleChance: pct(hitDoubleChance),
    accWrong: pct(wrong),
    accExact: pct(hitExact),
  };
}
