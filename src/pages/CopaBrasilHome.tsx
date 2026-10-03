import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Brain, Goal, Radio, Sparkles, Target } from "lucide-react";
import { CopaBrasilNav } from "@/components/copabrasil/CopaBrasilNav";
import { BrasileiraoMatchCard } from "@/components/brasileirao/BrasileiraoMatchCard";
import { AuditDashboard } from "@/components/audit/AuditDashboard";
import { useCopaBrasilOverview, useCopaBrasilRealtime, useCopaBrasilSeason } from "@/hooks/useCopaBrasil";

export default function CopaBrasilHome() {
  useCopaBrasilRealtime();
  const [season] = useCopaBrasilSeason();
  const o = useCopaBrasilOverview(season);

  return (
    <Layout>
      <Helmet>
        <title>{`Copa do Brasil ${season} — Jogos, Fases e Palpites IA | Aleball`}</title>
        <meta
          name="description"
          content={`Cobertura completa da Copa do Brasil ${season}: jogos por fase, resultados oficiais, artilharia e palpites da IA auditados contra o resultado real.`}
        />
        <link rel="canonical" href="https://www.aleball.com/copa-do-brasil" />
      </Helmet>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-background to-background" />
        <div className="relative container mx-auto px-4 py-12 sm:py-14">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-3">
              <Trophy className="w-4 h-4" /> Copa do Brasil
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">Copa do Brasil {season}</h1>
            <p className="text-muted-foreground text-lg mb-8">
              Mata-mata nacional · {o.totalClubes || "—"} clubes na temporada · palpites da IA auditados contra o resultado oficial
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild><Link to="/copa-do-brasil/jogos"><Calendar className="w-4 h-4 mr-2" />Ver jogos</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-do-brasil/palpites-ia"><Brain className="w-4 h-4 mr-2" />Palpites IA</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-do-brasil/artilharia"><Goal className="w-4 h-4 mr-2" />Artilharia</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <CopaBrasilNav />

      <div className="container mx-auto px-4 py-10 space-y-12">
        <section className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Fases com jogos" value={String(o.fases.length || 0)} />
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
              <Link to="/copa-do-brasil/jogos" className="text-sm text-primary hover:underline">Ver todos →</Link>
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
              <Link to="/copa-do-brasil/palpites-ia" className="text-sm text-primary hover:underline">IA x resultado real →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {o.lastResults.map((m) => <BrasileiraoMatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border p-6 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Como auditamos os palpites</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Cada palpite da Copa do Brasil é gerado antes da bola rolar e comparado, jogo a jogo, com o resultado oficial já
            registrado no banco do Aleball. Nada é reescrito depois do apito final.
          </p>
          <Button asChild size="sm" variant="outline"><Link to="/copa-do-brasil/palpites-ia">Ver painel de acertos</Link></Button>
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
