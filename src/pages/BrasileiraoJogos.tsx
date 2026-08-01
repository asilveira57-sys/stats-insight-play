import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BrasileiraoNav } from "@/components/brasileirao/BrasileiraoNav";
import { BrasileiraoMatchCard } from "@/components/brasileirao/BrasileiraoMatchCard";
import { useBrasileiraoOverview, useBrasileiraoRealtime, BRASILEIRAO_SEASON } from "@/hooks/useBrasileirao";

type StatusFilter = "todos" | "scheduled" | "live" | "finished";

export default function BrasileiraoJogos() {
  useBrasileiraoRealtime();
  const { matches, rodadas, currentRodada, isLoading } = useBrasileiraoOverview();
  const [rodada, setRodada] = useState<number | "todas">("todas");
  const [status, setStatus] = useState<StatusFilter>("todos");

  const effectiveRodada = rodada === "todas" ? null : rodada;

  const filtered = useMemo(
    () =>
      matches.filter(
        (m) =>
          (effectiveRodada == null || m.rodada === effectiveRodada) &&
          (status === "todos" || m.status === status)
      ),
    [matches, effectiveRodada, status]
  );

  return (
    <Layout>
      <Helmet>
        <title>Jogos do Brasileirão {BRASILEIRAO_SEASON} — Tabela de Rodadas | Statball</title>
        <meta
          name="description"
          content={`Todos os jogos do Campeonato Brasileiro Série A ${BRASILEIRAO_SEASON} rodada por rodada, com placar oficial, status ao vivo e palpite da IA em cada partida.`}
        />
        <link rel="canonical" href="https://www.statball.com.br/brasileirao/jogos" />
      </Helmet>

      <BrasileiraoNav />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold mb-2">Jogos do Brasileirão {BRASILEIRAO_SEASON}</h1>
          <p className="text-muted-foreground">
            Filtre por rodada e situação. Cada card mostra o placar oficial e o palpite da IA registrado antes do jogo.
          </p>
        </header>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["todos", "live", "scheduled", "finished"] as StatusFilter[]).map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
                {s === "todos" ? "Todos" : s === "live" ? "Ao vivo" : s === "scheduled" ? "Agendados" : "Encerrados"}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant={rodada === "todas" ? "secondary" : "ghost"} onClick={() => setRodada("todas")}>
              Todas
            </Button>
            {currentRodada != null && (
              <Button size="sm" variant={rodada === currentRodada ? "secondary" : "ghost"} onClick={() => setRodada(currentRodada)}>
                Rodada atual
              </Button>
            )}
            {rodadas.map((r) => (
              <Button key={r} size="sm" variant={rodada === r ? "secondary" : "ghost"} onClick={() => setRodada(r)}>
                {r}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">Nenhum jogo encontrado com esses filtros.</p>
        ) : (
          <>
            <h2 className="text-lg font-semibold">
              {filtered.length} {filtered.length === 1 ? "jogo" : "jogos"}
              {effectiveRodada != null && ` na ${effectiveRodada}ª rodada`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((m) => <BrasileiraoMatchCard key={m.id} match={m} />)}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
