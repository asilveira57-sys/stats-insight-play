import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { BrasileiraoNav } from "@/components/brasileirao/BrasileiraoNav";
import { useBrasileiraoStandings, useBrasileiraoRealtime, BRASILEIRAO_SEASON } from "@/hooks/useBrasileirao";

const zone = (i: number) =>
  i < 4 ? "border-l-2 border-l-emerald-500" : i < 6 ? "border-l-2 border-l-sky-500" : i >= 16 ? "border-l-2 border-l-destructive" : "";

export default function BrasileiraoClassificacao() {
  useBrasileiraoRealtime();
  const { rows, isLoading } = useBrasileiraoStandings();

  return (
    <Layout>
      <Helmet>
        <title>Tabela do Brasileirão {BRASILEIRAO_SEASON} — Classificação Atualizada | Statball</title>
        <meta
          name="description"
          content={`Classificação do Campeonato Brasileiro Série A ${BRASILEIRAO_SEASON} calculada a partir dos resultados oficiais: pontos, vitórias, saldo de gols, aproveitamento e últimos 5 jogos.`}
        />
        <link rel="canonical" href="https://www.statball.com.br/brasileirao/classificacao" />
      </Helmet>

      <BrasileiraoNav />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold mb-2">Classificação do Brasileirão {BRASILEIRAO_SEASON}</h1>
          <p className="text-muted-foreground">
            Tabela recalculada em tempo real a partir das partidas encerradas registradas no banco do Statball.
          </p>
        </header>

        {isLoading ? (
          <Skeleton className="h-96" />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">Ainda não há partidas encerradas nesta temporada.</p>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Tabela completa</h2>
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Time</th>
                    <th className="px-2 py-2">P</th>
                    <th className="px-2 py-2">J</th>
                    <th className="px-2 py-2">V</th>
                    <th className="px-2 py-2">E</th>
                    <th className="px-2 py-2">D</th>
                    <th className="px-2 py-2">GP</th>
                    <th className="px-2 py-2">GC</th>
                    <th className="px-2 py-2">SG</th>
                    <th className="px-2 py-2">%</th>
                    <th className="px-2 py-2">Últimos 5</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.team.id} className={`border-t border-border ${zone(i)}`}>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">
                        {r.team.slug ? <Link to={`/times/${r.team.slug}`} className="hover:text-primary">{r.team.nome}</Link> : r.team.nome}
                      </td>
                      <td className="px-2 py-2 text-center font-bold tabular-nums">{r.pontos}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{r.jogos}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{r.vitorias}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{r.empates}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{r.derrotas}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{r.golsPro}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{r.golsContra}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{r.saldo}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{r.aproveitamento.toFixed(0)}%</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1 justify-center">
                          {r.form.map((f, k) => (
                            <span
                              key={k}
                              className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                                f === "V" ? "bg-emerald-500/20 text-emerald-500" : f === "E" ? "bg-muted text-muted-foreground" : "bg-destructive/20 text-destructive"
                              }`}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Verde: Libertadores (G4) · Azul: pré-Libertadores · Vermelho: zona de rebaixamento.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
