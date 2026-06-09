import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { CountdownTimer } from "@/components/copa2026/CountdownTimer";
import { GroupsTable } from "@/components/copa2026/GroupsTable";
import { MatchCard } from "@/components/copa2026/MatchCard";
import { useWC2026Overview } from "@/hooks/useCopa2026";
import { Link } from "react-router-dom";
import { Trophy, Users, Calendar, Newspaper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Copa2026Home() {
  const { data } = useWC2026Overview();
  const opening = new Date("2026-06-11T20:00:00-04:00");

  return (
    <Layout>
      <Helmet>
        <title>Copa do Mundo 2026 — Cobertura Completa | Statball</title>
        <meta name="description" content="Cobertura completa da Copa do Mundo 2026: jogos, seleções, grupos, mata-mata, análises por IA e posts automáticos." />
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
            <CountdownTimer target={opening} />
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <Button asChild><Link to="/copa-2026/jogos"><Calendar className="w-4 h-4 mr-2" />Ver jogos</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/grupos">Grupos</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/chaveamento">Chaveamento</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/selecoes"><Users className="w-4 h-4 mr-2" />Seleções</Link></Button>
              <Button asChild variant="outline"><Link to="/copa-2026/posts"><Newspaper className="w-4 h-4 mr-2" />Cobertura</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 space-y-12">
        {data?.nextMatch && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Próxima partida</h2>
            <div className="max-w-2xl"><MatchCard match={data.nextMatch} /></div>
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

        <section>
          <h2 className="text-xl font-bold mb-4">Tabela dos grupos</h2>
          <GroupsTable />
        </section>

        <section>
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Cobertura por IA</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Análises pré-jogo, previsões editoriais e resumos pós-jogo gerados automaticamente a partir dos dados reais do banco. Cobertura jornalística, sem relação com apostas.
            </p>
            <Button asChild variant="outline" size="sm"><Link to="/copa-2026/posts">Ver posts automáticos</Link></Button>
          </div>
        </section>

        {(data?.recentPosts?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Últimos posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data!.recentPosts.map((p) => (
                <Link key={p.id} to={`/copa-2026/posts`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/60">
                  <h3 className="font-semibold mb-1 line-clamp-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
