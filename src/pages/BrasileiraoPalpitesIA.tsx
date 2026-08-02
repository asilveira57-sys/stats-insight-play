import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { BrasileiraoNav } from "@/components/brasileirao/BrasileiraoNav";
import { BrasileiraoMatchCard } from "@/components/brasileirao/BrasileiraoMatchCard";
import { useBrasileiraoOverview, useBrasileiraoRealtime, resultHit, scoreHit, BRASILEIRAO_SEASON } from "@/hooks/useBrasileirao";

export default function BrasileiraoPalpitesIA() {
  useBrasileiraoRealtime();
  const { matches, ia, isLoading } = useBrasileiraoOverview();

  const pending = matches.filter((m) => m.status !== "finished" && m.palpite).slice(0, 12);
  const audited = matches
    .filter((m) => m.status === "finished" && m.palpite && m.gols_casa != null)
    .slice()
    .reverse();

  return (
    <Layout>
      <Helmet>
        <title>{`Palpites da IA no Brasileirão ${BRASILEIRAO_SEASON} — Acertos Auditados | Statball`}</title>
        <meta
          name="description"
          content={`Palpites da IA do Statball para o Brasileirão Série A ${BRASILEIRAO_SEASON} comparados jogo a jogo com o resultado oficial: taxa de acerto de resultado e de placar exato.`}
        />
        <link rel="canonical" href="https://www.statball.com.br/brasileirao/palpites-ia" />
      </Helmet>

      <BrasileiraoNav />

      <div className="container mx-auto px-4 py-8 space-y-8">
        <header>
          <h1 className="text-3xl font-bold mb-2">Palpites da IA — Brasileirão {BRASILEIRAO_SEASON}</h1>
          <p className="text-muted-foreground">
            Todo palpite é registrado antes do jogo e confrontado com o placar oficial corrigido. Nenhum número é ajustado
            depois do apito final.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Jogos auditados" value={String(ia.total)} />
          <Stat label="Acertos de resultado" value={String(ia.hitResult)} />
          <Stat label="Taxa de resultado" value={`${ia.accResult.toFixed(1)}%`} highlight />
          <Stat label="Placar exato" value={`${ia.hitScore} (${ia.accScore.toFixed(1)}%)`} />
        </section>

        {pending.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Palpites em aberto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pending.map((m) => <BrasileiraoMatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold mb-4">Histórico auditado (IA x resultado oficial)</h2>
          {isLoading ? (
            <Skeleton className="h-72" />
          ) : audited.length === 0 ? (
            <p className="text-muted-foreground">Nenhum jogo encerrado com palpite nesta temporada.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Rodada</th>
                    <th className="text-left px-3 py-2">Partida</th>
                    <th className="px-3 py-2">Oficial</th>
                    <th className="px-3 py-2">Palpite IA</th>
                    <th className="px-3 py-2">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {audited.map((m) => {
                    const hit = resultHit(m);
                    const exact = scoreHit(m);
                    return (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{m.rodada ?? "—"}</td>
                        <td className="px-3 py-2">{m.time_casa?.nome} x {m.time_fora?.nome}</td>
                        <td className="px-3 py-2 text-center font-semibold tabular-nums">{m.gols_casa} - {m.gols_fora}</td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {m.palpite?.placar_casa_estimado ?? "—"} - {m.palpite?.placar_fora_estimado ?? "—"}
                        </td>
                        <td className={`px-3 py-2 text-center font-medium ${hit ? "text-emerald-500" : "text-destructive"}`}>
                          {exact ? "Placar exato" : hit ? "Acertou" : "Errou"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
