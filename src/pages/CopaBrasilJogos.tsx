import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopaBrasilNav } from "@/components/copabrasil/CopaBrasilNav";
import { BrasileiraoMatchCard } from "@/components/brasileirao/BrasileiraoMatchCard";
import { useCopaBrasilOverview, useCopaBrasilRealtime, useCopaBrasilSeason } from "@/hooks/useCopaBrasil";
import { usePartidasOdds } from "@/hooks/usePartidaOdds";

type StatusFilter = "todos" | "scheduled" | "live" | "finished";

export default function CopaBrasilJogos() {
  useCopaBrasilRealtime();
  const [season] = useCopaBrasilSeason();
  const { matches, fases, isLoading } = useCopaBrasilOverview(season);
  const [fase, setFase] = useState<number | "todas">("todas");
  const [status, setStatus] = useState<StatusFilter>("todos");

  const effectiveFase = fase === "todas" ? null : fase;

  const filtered = useMemo(
    () =>
      matches.filter(
        (m) =>
          (effectiveFase == null || m.rodada === effectiveFase) &&
          (status === "todos" || m.status === status)
      ),
    [matches, effectiveFase, status]
  );

  const { data: oddsMap } = usePartidasOdds(filtered.map((m) => m.id));

  return (
    <Layout>
      <Helmet>
        <title>{`Jogos da Copa do Brasil ${season} — Fases e Resultados | Statball`}</title>
        <meta
          name="description"
          content={`Todos os jogos da Copa do Brasil ${season} fase por fase, com placar oficial, status ao vivo e palpite da IA em cada partida.`}
        />
        <link rel="canonical" href="https://www.statball.com.br/copa-do-brasil/jogos" />
      </Helmet>

      <CopaBrasilNav />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold mb-2">Jogos da Copa do Brasil {season}</h1>
          <p className="text-muted-foreground">
            Filtre por fase e situação. Cada card mostra o placar oficial e o palpite da IA registrado antes do jogo.
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
          {fases.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant={fase === "todas" ? "secondary" : "ghost"} onClick={() => setFase("todas")}>
                Todas as fases
              </Button>
              {fases.map((f) => (
                <Button key={f} size="sm" variant={fase === f ? "secondary" : "ghost"} onClick={() => setFase(f)}>
                  Fase {f}
                </Button>
              ))}
            </div>
          )}
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
              {effectiveFase != null && ` na fase ${effectiveFase}`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((m) => <BrasileiraoMatchCard key={m.id} match={m} odds={oddsMap?.get(m.id)} />)}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
