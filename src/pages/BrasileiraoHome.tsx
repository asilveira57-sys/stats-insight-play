import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Table2, Brain, Goal, Radio, Sparkles, Target } from "lucide-react";
import { BrasileiraoNav } from "@/components/brasileirao/BrasileiraoNav";
import { BrasileiraoMatchCard } from "@/components/brasileirao/BrasileiraoMatchCard";
import { AuditDashboard } from "@/components/audit/AuditDashboard";
import {
  useBrasileiraoOverview,
  useBrasileiraoRealtime,
  useBrasileiraoStandings,
  useBrasileiraoSeason,
} from "@/hooks/useBrasileirao";

export default function BrasileiraoHome() {
  useBrasileiraoRealtime();
  const [season] = useBrasileiraoSeason();
  const o = useBrasileiraoOverview(season);
  const { rows } = useBrasileiraoStandings(season);
  const top6 = rows.slice(0, 6);

  return (
    <Layout>
      <Helmet>
        <title>{`Brasileirão Série A ${season} — Jogos, Tabela e Palpites IA | Aleball`}</title>
        <meta
          name="description"
          content={`Cobertura completa do Campeonato Brasileiro Série A ${season}: jogos do dia, resultados oficiais, classificação atualizada, artilharia e palpites da IA comparados ao resultado real.`}
        />
        <link rel="canonical" href="https://www.aleball.com/brasileirao" />
      </Helmet>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative container mx-auto px-4 py-12 sm:py-14">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-3">
              <Trophy className="w-4 h-4" /> Campeonato Brasileiro Série A
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">Brasileirão {season}</h1>
            <p className="text-muted-foreground text-lg mb-8">
              20 clubes · 38 rodadas · palpites da IA auditados contra o resultado oficial
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild><Link to="/brasileirao/jogos"><Calendar className="w-4 h-4 mr-2" />Ver jogos</Link></Button>
              <Button asChild variant="outline"><Link to="/brasileirao/classificacao"><Table2 className="w-4 h-4 mr-2" />Classificação</Link></Button>
              <Button asChild variant="outline"><Link to="/brasileirao/palpites-ia"><Brain className="w-4 h-4 mr-2" />Palpites IA</Link></Button>
              <Button asChild variant="outline"><Link to="/brasileirao/artilharia"><Goal className="w-4 h-4 mr-2" />Artilharia</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <BrasileiraoNav />

      <div className="container mx-auto px-4 py-10 space-y-12">
        <section className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Rodada atual" value={o.currentRodada ? `${o.currentRodada}ª` : "—"} />
            <Stat label="Jogos analisados pela IA" value={String(o.audit.total)} />
            <Stat label="Acerto de resultado" value={`${o.audit.accResult.toFixed(1)}%`} highlight />
            <Stat label="Dupla chance" value={`${o.audit.accDoubleChance.toFixed(1)}%`} />
          </div>
          <AuditDashboard metrics={o.audit} />
        </section>


        {o.live.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-destructive animate-pulse" /> Ao vivo agora
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {o.live.map((m) => <BrasileiraoMatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {o.todayMatches.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Jogos de hoje</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {o.todayMatches.map((m) => <BrasileiraoMatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {o.nextMatches.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Próximos jogos</h2>
              <Link to="/brasileirao/jogos" className="text-sm text-primary hover:underline">Ver todos →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {o.nextMatches.map((m) => <BrasileiraoMatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {o.lastResults.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Últimos resultados oficiais</h2>
              <Link to="/brasileirao/palpites-ia" className="text-sm text-primary hover:underline">IA x resultado real →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {o.lastResults.map((m) => <BrasileiraoMatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {top6.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Líderes da tabela</h2>
              <Link to="/brasileirao/classificacao" className="text-sm text-primary hover:underline">Tabela completa →</Link>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Time</th>
                    <th className="px-3 py-2">P</th>
                    <th className="px-3 py-2">J</th>
                    <th className="px-3 py-2">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {top6.map((r, i) => (
                    <tr key={r.team.id} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {r.team.slug ? <Link to={`/times/${r.team.slug}`} className="hover:text-primary">{r.team.nome}</Link> : r.team.nome}
                      </td>
                      <td className="px-3 py-2 text-center font-bold tabular-nums">{r.pontos}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{r.jogos}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{r.saldo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Como auditamos os palpites</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Cada palpite é gerado antes da bola rolar e comparado, jogo a jogo, com o resultado oficial já corrigido no banco
            do Aleball. Nada é reescrito depois do apito final.
          </p>
          <Button asChild size="sm" variant="outline"><Link to="/brasileirao/palpites-ia">Ver painel de acertos</Link></Button>
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
