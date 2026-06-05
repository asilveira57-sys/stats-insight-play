import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { useWC2026Team } from "@/hooks/useCopa2026";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { MatchCard } from "@/components/copa2026/MatchCard";
import { Badge } from "@/components/ui/badge";

export default function Copa2026SelecaoDetalhe() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useWC2026Team(slug);

  if (isLoading) return <Layout><div className="container mx-auto px-4 py-8">Carregando...</div></Layout>;
  if (!data) return <Layout><div className="container mx-auto px-4 py-8">Seleção não encontrada.</div></Layout>;
  const { team, history, players, matches } = data;

  return (
    <Layout>
      <Helmet><title>{team.name} — Copa 2026 | Statball</title></Helmet>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="flex items-center gap-4">
          <TeamFlag team={team} size="lg" />
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {team.group_letter && <Badge variant="outline">Grupo {team.group_letter}</Badge>}
              <Badge>{team.status}</Badge>
              {team.coach_name && <span className="text-sm text-muted-foreground">Técnico: {team.coach_name}</span>}
            </div>
          </div>
        </header>

        {team.historical_summary && (
          <section>
            <h2 className="text-xl font-bold mb-2">Histórico em Copas</h2>
            <p className="text-muted-foreground">{team.historical_summary}</p>
            {team.best_campaign && <p className="text-sm mt-2">Melhor campanha: <strong>{team.best_campaign}</strong></p>}
            <p className="text-sm text-muted-foreground">Participações: {team.participations_count ?? 0}</p>
          </section>
        )}

        {history.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">Participações anteriores</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase">
                  <tr><th className="px-3 py-2 text-left">Ano</th><th className="text-left">Fase</th><th className="text-center">V</th><th className="text-center">E</th><th className="text-center">D</th><th className="text-center">GP</th><th className="text-center">GC</th></tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{h.year}</td>
                      <td>{h.stage_reached ?? "—"}</td>
                      <td className="text-center">{h.wins}</td>
                      <td className="text-center">{h.draws}</td>
                      <td className="text-center">{h.losses}</td>
                      <td className="text-center">{h.goals_for}</td>
                      <td className="text-center">{h.goals_against}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {players.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">Elenco convocado</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {players.map(p => (
                <div key={p.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">#{p.shirt_number ?? "—"} · {p.position ?? "—"}</div>
                  <div className="font-medium truncate">{p.name}</div>
                  {p.club && <div className="text-xs text-muted-foreground truncate">{p.club}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {matches.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">Jogos na Copa 2026</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
