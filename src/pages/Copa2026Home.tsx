import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { CountdownTimer } from "@/components/copa2026/CountdownTimer";
import { GroupsTable } from "@/components/copa2026/GroupsTable";
import { MatchCard } from "@/components/copa2026/MatchCard";
import { useWC2026Overview } from "@/hooks/useCopa2026";
import { Link } from "react-router-dom";
import { Trophy, Users, Calendar, Newspaper, Sparkles, Radio, Brain, GitBranch, Goal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Copa2026Home() {
  const { data } = useWC2026Overview();
  const opening = new Date("2026-06-11T20:00:00-04:00");
  const tournamentStarted = new Date() >= opening;

  return (
    <Layout>
      <Helmet>
        <title>Copa do Mundo 2026 — Cobertura Completa | Statball</title>
        <meta name="description" content="Cobertura completa da Copa do Mundo 2026: jogos ao vivo, últimos resultados, próximos confrontos, grupos, chaveamento, palpites IA e análises por seleção." />
        <link rel="canonical" href="https://www.statball.com.br/copa-2026" />
      </Helmet>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative container mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-3">
              <Trophy className="w-4 h-4" /> FIFA World Cup 2026
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">Copa do Mundo 2026</h1>
            <p className="text-muted-foreground text-lg mb-8">Estados Unidos · Canadá · México · 48 seleções · 12 grupos</p>
            {!tournamentStarted && <CountdownTimer target={opening} />}
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <Button asChild><Link to="/copa-2026/jogos"><Calendar className="w-4 h-4 mr-2" />Ver jogos</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/grupos">Grupos</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/chaveamento"><GitBranch className="w-4 h-4 mr-2" />Chaveamento</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/palpites-ia"><Brain className="w-4 h-4 mr-2" />Palpites IA</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/selecoes"><Users className="w-4 h-4 mr-2" />Seleções</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/artilharia"><Goal className="w-4 h-4 mr-2" />Artilharia</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/posts"><Newspaper className="w-4 h-4 mr-2" />Cobertura</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 space-y-12">
        {(data?.liveMatches?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-destructive animate-pulse" />Ao vivo agora
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data!.liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {(data?.todayMatches?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Jogos de hoje</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data!.todayMatches.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {(data?.nextMatches?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Próximos jogos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data!.nextMatches.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {(data?.lastResults?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Últimos resultados</h2>
              <Link to="/copa-2026/jogos" className="text-sm text-primary hover:underline">Ver todos →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data!.lastResults.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Tabela dos grupos</h2>
            <Link to="/copa-2026/grupos" className="text-sm text-primary hover:underline">Detalhes por grupo →</Link>
          </div>
          <GroupsTable />
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Palpites IA em lote</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Veja em uma única tela o placar previsto pelo Statball para todos os jogos da Copa, com nível de confiança e taxa de acerto.
            </p>
            <Button asChild size="sm"><Link to="/copa-2026/palpites-ia">Abrir painel IA</Link></Button>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Chaveamento</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Acompanhe o caminho de cada seleção até o título, das oitavas até a final, atualizado em tempo real.
            </p>
            <Button asChild size="sm" variant="outline"><Link to="/copa-2026/chaveamento">Ver chaveamento</Link></Button>
          </div>
        </section>

        {(data?.recentPosts?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Últimos posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data!.recentPosts.map((p: any) => (
                <Link key={p.id} to={`/noticias/${p.slug}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/60">
                  <h3 className="font-semibold mb-1 line-clamp-2">{p.titulo}</h3>
                  {p.resumo && <p className="text-sm text-muted-foreground line-clamp-3">{p.resumo}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
