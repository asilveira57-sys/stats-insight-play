import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, Award, Sparkles, RefreshCw, AlertTriangle, Dices } from "lucide-react";
import { useBracketProjection, type BracketProjectionRow } from "@/hooks/useBracketProjection";
import { useMonteCarloResults } from "@/hooks/useMonteCarloResults";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PHASE_LABEL: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "32 avos",
  round_of_16: "Oitavas",
  quarter_final: "Quartas",
  semi_final: "Semifinal",
  third_place: "Disputa do 3º lugar",
  final: "Final",
};

function TeamFlag({ team, size = 40 }: { team: BracketProjectionRow["home_team"]; size?: number }) {
  if (!team) return <div className="rounded-full bg-muted" style={{ width: size, height: size }} />;
  return team.flag_url ? (
    <img src={team.flag_url} alt={team.name} className="rounded-full object-cover border border-border" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-muted flex items-center justify-center text-xs font-bold" style={{ width: size, height: size }}>
      {team.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function Copa2026Projecao() {
  const { rows, loading, generatedAt, regenerate } = useBracketProjection("live");
  const { rows: mcRows, loading: mcLoading } = useMonteCarloResults("live");

  const { champion, runnerUp, third, fourth, finalRow, thirdRow, titleProbs, zebras } = useMemo(() => {
    const finalRow = rows.find((r) => r.phase === "final") || null;
    const thirdRow = rows.find((r) => r.phase === "third_place") || null;

    const champion = finalRow?.winner_team || null;
    const runnerUp =
      finalRow && finalRow.winner_team_id
        ? finalRow.winner_team_id === finalRow.home_team_id
          ? finalRow.away_team
          : finalRow.home_team
        : null;
    const third = thirdRow?.winner_team || null;
    const fourth =
      thirdRow && thirdRow.winner_team_id
        ? thirdRow.winner_team_id === thirdRow.home_team_id
          ? thirdRow.away_team
          : thirdRow.home_team
        : null;

    // Title probabilities: based on how deep each team goes in projection
    const phaseWeight: Record<string, number> = {
      group: 5,
      round_of_32: 15,
      round_of_16: 30,
      quarter_final: 50,
      semi_final: 70,
      final: 85,
    };
    const scoreByTeam = new Map<string, { team: any; score: number }>();
    rows.forEach((r) => {
      [r.home_team, r.away_team].forEach((t) => {
        if (!t) return;
        const w = phaseWeight[r.phase] ?? 0;
        const prev = scoreByTeam.get(t.id)?.score ?? 0;
        if (w > prev) scoreByTeam.set(t.id, { team: t, score: w });
      });
    });
    if (champion) scoreByTeam.set(champion.id, { team: champion, score: 100 });
    if (runnerUp) scoreByTeam.set(runnerUp.id, { team: runnerUp, score: Math.max(scoreByTeam.get(runnerUp.id)?.score ?? 0, 92) });

    const titleProbs = Array.from(scoreByTeam.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Zebras: teams reaching far with low confidence
    const zebras = rows
      .filter((r) => ["quarter_final", "semi_final", "final"].includes(r.phase) && r.confidence === "baixa")
      .slice(0, 5);

    return { champion, runnerUp, third, fourth, finalRow, thirdRow, titleProbs, zebras };
  }, [rows]);

  return (
    <Layout>
      <Helmet>
        <title>Projeção Oficial Copa 2026 | Statball</title>
        <meta name="description" content="Projeção automatizada do chaveamento completo da Copa do Mundo 2026: campeão, vice, semifinalistas e probabilidades de título." />
        <link rel="canonical" href="https://www.statball.com.br/copa-2026/projecao" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/copa-2026" className="hover:text-primary">Copa 2026</Link>
            <span>/</span>
            <span>Projeção Oficial</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                Projeção Oficial Statball
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Simulação completa do chaveamento usando IA, ranking FIFA, Elo e histórico de Copas. Atualiza após cada jogo encerrado.
              </p>
              {generatedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Última atualização: {format(new Date(generatedAt), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={regenerate} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Recalcular
            </Button>
          </div>
        </header>

        {loading && rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Carregando projeção...</div>
        ) : (
          <>
            {/* Pódio */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-transparent md:col-span-2 lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-yellow-500">
                    <Trophy className="h-5 w-5" /> Campeão
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <TeamFlag team={champion} size={64} />
                  <div>
                    <div className="text-2xl font-bold">{champion?.name ?? "A definir"}</div>
                    {finalRow && (
                      <div className="text-sm text-muted-foreground">
                        Final: {finalRow.home_team?.name} {finalRow.home_score} x {finalRow.away_score} {finalRow.away_team?.name}
                        {finalRow.went_to_penalties && (
                          <span className="ml-1">(pen {finalRow.home_pens}-{finalRow.away_pens})</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-400/40">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-slate-400">
                    <Medal className="h-5 w-5" /> Vice
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <TeamFlag team={runnerUp} size={48} />
                  <div className="text-xl font-semibold">{runnerUp?.name ?? "—"}</div>
                </CardContent>
              </Card>

              <Card className="border-orange-500/40">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-orange-500">
                    <Award className="h-5 w-5" /> 3º lugar
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <TeamFlag team={third} size={48} />
                  <div className="text-xl font-semibold">{third?.name ?? "—"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    4º lugar
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <TeamFlag team={fourth} size={48} />
                  <div className="text-xl font-semibold">{fourth?.name ?? "—"}</div>
                </CardContent>
              </Card>
            </section>

            {/* Monte Carlo — probabilidades reais por fase */}
            <section>
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dices className="h-5 w-5 text-primary" />
                    Probabilidade de Título — Monte Carlo
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Resultado de <strong>{mcRows[0]?.simulations ?? 3000} simulações</strong> do torneio completo. Cada placar é sorteado por distribuição de Poisson usando histórico em Copas + ranking FIFA + forma recente.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mcLoading && mcRows.length === 0 && (
                    <p className="text-sm text-muted-foreground">Calculando simulações...</p>
                  )}
                  {mcRows.slice(0, 16).map((r, i) => (
                    <div key={r.team_id} className="grid grid-cols-12 items-center gap-2 text-sm py-1">
                      <span className="text-xs text-muted-foreground col-span-1">{i + 1}</span>
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <TeamFlag team={r.team as any} size={24} />
                        <span className="font-medium truncate">{r.team?.name ?? "—"}</span>
                      </div>
                      <div className="col-span-5">
                        <Progress value={r.p_champion * 100} className="h-2" />
                      </div>
                      <span className="col-span-1 text-right font-semibold tabular-nums">
                        {(r.p_champion * 100).toFixed(1)}%
                      </span>
                      <span className="col-span-2 text-right text-[10px] text-muted-foreground tabular-nums">
                        final {(r.p_final * 100).toFixed(0)}% · semi {(r.p_semi * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                  {!mcLoading && mcRows.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Sem dados de Monte Carlo ainda. Clique em "Recalcular" no topo da página.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Cenário modal (chaveamento único mais provável) */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Cenário Modal (chaveamento único mais provável)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quão fundo cada time vai usando placares <em>modais</em> (Poisson) — pode divergir do Monte Carlo porque ignora variância.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {titleProbs.map((t, i) => (
                    <div key={t.team.id} className="flex items-center gap-3">
                      <span className="text-xs w-5 text-muted-foreground">{i + 1}</span>
                      <TeamFlag team={t.team} size={28} />
                      <span className="font-medium w-32 truncate">{t.team.name}</span>
                      <Progress value={t.score} className="flex-1" />
                      <span className="text-sm font-semibold w-12 text-right">{t.score}%</span>
                    </div>
                  ))}
                  {titleProbs.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sem dados disponíveis.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Zebras */}
            {zebras.length > 0 && (
              <section>
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Confrontos imprevisíveis (zebras possíveis)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {zebras.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                          <TeamFlag team={r.home_team} size={28} />
                          <span className="font-medium">{r.home_team?.name}</span>
                          <span className="text-muted-foreground">x</span>
                          <span className="font-medium">{r.away_team?.name}</span>
                          <TeamFlag team={r.away_team} size={28} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{PHASE_LABEL[r.phase]}</Badge>
                          <Badge variant="secondary">Confiança baixa</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            )}

            <div className="flex justify-center">
              <Button asChild size="lg">
                <Link to="/copa-2026/chaveamento">Ver chaveamento completo</Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
              Esta projeção é gerada automaticamente e atualizada após cada jogo. Confira nossa{" "}
              <Link to="/transparencia-ia" className="underline">página de transparência</Link> para entender a metodologia.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
