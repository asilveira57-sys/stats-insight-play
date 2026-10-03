import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { BrasileiraoNav } from "@/components/brasileirao/BrasileiraoNav";
import { useBrasileiraoArtilharia, useBrasileiraoSeason } from "@/hooks/useBrasileirao";

export default function BrasileiraoArtilharia() {
  const [season] = useBrasileiraoSeason();
  const { data, isLoading } = useBrasileiraoArtilharia(season);
  const rows = data ?? [];

  return (
    <Layout>
      <Helmet>
        <title>{`Artilharia do Brasileirão ${season} — Goleadores | Aleball`}</title>
        <meta
          name="description"
          content={`Artilheiros do Campeonato Brasileiro Série A ${season} com gols e pênaltis convertidos, apurados a partir dos eventos oficiais das partidas.`}
        />
        <link rel="canonical" href="https://www.aleball.com/brasileirao/artilharia" />
      </Helmet>

      <BrasileiraoNav />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold mb-2">Artilharia do Brasileirão {season}</h1>
          <p className="text-muted-foreground">
            Ranking construído a partir dos gols registrados jogo a jogo no banco do Aleball — sem estimativas.
          </p>
        </header>

        <h2 className="text-lg font-semibold">Goleadores da temporada</h2>
        {isLoading ? (
          <Skeleton className="h-80" />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">Nenhum gol registrado nesta temporada.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Jogador</th>
                  <th className="text-left px-3 py-2">Time</th>
                  <th className="px-3 py-2">Gols</th>
                  <th className="px-3 py-2">Pênaltis</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.jogador}-${i}`} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{r.jogador}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.time?.nome ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-bold tabular-nums">{r.gols}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{r.penaltis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
