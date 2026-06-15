import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Goal, Trophy, Info } from "lucide-react";
import { useCopa2026Artilharia } from "@/hooks/useCopa2026Artilharia";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Copa2026Artilharia() {
  const { data, isLoading } = useCopa2026Artilharia();
  const rows = data ?? [];
  const maxMatches = rows.reduce((m, r) => Math.max(m, r.team_matches_played), 0);

  return (
    <Layout>
      <Helmet>
        <title>Artilharia da Copa do Mundo 2026 — Statball</title>
        <meta
          name="description"
          content="Ranking de artilheiros da Copa do Mundo 2026 atualizado em tempo real: gols, pênaltis, jogos disputados pela seleção e média de gols por partida."
        />
        <link rel="canonical" href="https://www.statball.com.br/copa-2026/artilharia" />
      </Helmet>

      <section className="border-b border-border bg-gradient-to-br from-primary/15 via-background to-background">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-2">
            <Trophy className="w-4 h-4" /> Copa do Mundo 2026
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight flex items-center gap-3">
            <Goal className="w-8 h-8 text-primary" /> Artilharia
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Lista atualizada dos maiores goleadores da Copa. A coluna <strong>Jogos</strong> mostra
            quantas partidas a seleção já disputou — quem tem menos jogos pode subir no ranking
            quando entrar em campo de novo.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Info className="w-6 h-6 mx-auto mb-2" />
            Nenhum gol registrado ainda. A lista será preenchida assim que os jogos começarem.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-left w-12">#</th>
                    <th className="px-3 py-3 text-left">Jogador</th>
                    <th className="px-3 py-3 text-left">Seleção</th>
                    <th className="px-3 py-3 text-center">Gols</th>
                    <th className="px-3 py-3 text-center hidden sm:table-cell">Pênaltis</th>
                    <th className="px-3 py-3 text-center">Jogos</th>
                    <th className="px-3 py-3 text-center hidden md:table-cell">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const isLeader = i === 0;
                    const hasFewerGames = r.team_matches_played < maxMatches;
                    return (
                      <tr
                        key={`${r.team_id}-${r.player}`}
                        className="border-t border-border hover:bg-muted/30 transition"
                      >
                        <td className="px-3 py-3 font-bold text-muted-foreground">
                          {isLeader ? (
                            <span className="inline-flex items-center gap-1 text-primary">
                              <Trophy className="w-4 h-4" />1
                            </span>
                          ) : (
                            i + 1
                          )}
                        </td>
                        <td className="px-3 py-3 font-semibold">{r.player}</td>
                        <td className="px-3 py-3">
                          {r.team_slug ? (
                            <Link
                              to={`/copa-2026/selecoes/${r.team_slug}`}
                              className="inline-flex items-center gap-2 hover:text-primary"
                            >
                              {r.team_flag && (
                                <img src={r.team_flag} alt={r.team_name} className="w-5 h-5 object-contain" />
                              )}
                              <span>{r.team_name}</span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              {r.team_flag && (
                                <img src={r.team_flag} alt={r.team_name} className="w-5 h-5 object-contain" />
                              )}
                              {r.team_name}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-lg text-primary">{r.goals}</td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell text-muted-foreground">
                          {r.penalties || "—"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center gap-1">
                            {r.team_matches_played}
                            {hasFewerGames && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/50 text-amber-500">
                                -{maxMatches - r.team_matches_played}
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center hidden md:table-cell text-muted-foreground">
                          {r.goals_per_match.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <p className="text-xs text-muted-foreground mt-4 flex items-start gap-2">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          O número de jogos refere-se à seleção do atleta. O selo "−1" indica que a equipe tem um
          jogo a menos que o líder da tabela e ainda pode ultrapassar.
        </p>
      </div>
    </Layout>
  );
}
