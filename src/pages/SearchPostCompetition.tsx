import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, Trophy, ListOrdered, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MatchesList } from "@/components/search/MatchesList";
import type { MatchRow, StructuredAnswer } from "@/hooks/useIntelligentSearch";

const BASE = "https://www.statball.com.br";

export default function SearchPostCompetition() {
  const { slug, ligaSlug } = useParams<{ slug: string; ligaSlug: string }>();

  const { data: post, isLoading } = useQuery({
    enabled: !!slug,
    queryKey: ["search-post-base", slug],
    queryFn: async () => {
      const { data } = await supabase.from("search_posts").select("*").eq("slug", slug!).maybeSingle();
      return data;
    },
  });

  const payload = post?.answer_payload as unknown as StructuredAnswer | undefined;
  const teamStats = payload?.kind === "team_stats" ? payload : null;
  const competition = teamStats?.competitions.find((c) => c.slug === ligaSlug) || null;
  const matches: MatchRow[] = useMemo(
    () => (teamStats?.matches ?? []).filter((m) => m.liga_slug === ligaSlug),
    [teamStats, ligaSlug],
  );

  // Adversary breakdown
  const adversaries = useMemo(() => {
    if (!teamStats) return [];
    const map = new Map<string, { name: string; slug: string | null; w: number; d: number; l: number; gp: number; gc: number; total: number }>();
    for (const m of matches) {
      const adv = m.is_home ? m.away_team : m.home_team;
      const advSlug = m.is_home ? m.away_team_slug : m.home_team_slug;
      const gp = m.is_home ? (m.gols_casa ?? 0) : (m.gols_fora ?? 0);
      const gc = m.is_home ? (m.gols_fora ?? 0) : (m.gols_casa ?? 0);
      const k = advSlug || adv;
      const cur = map.get(k) || { name: adv, slug: advSlug, w: 0, d: 0, l: 0, gp: 0, gc: 0, total: 0 };
      cur.total += 1;
      cur.gp += gp;
      cur.gc += gc;
      if (gp > gc) cur.w += 1;
      else if (gp < gc) cur.l += 1;
      else cur.d += 1;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [teamStats, matches]);

  if (isLoading) {
    return <Layout><div className="container mx-auto px-4 py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Layout>;
  }
  if (!post || !teamStats || !competition) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center space-y-3">
          <h1 className="text-2xl font-bold">Página não encontrada</h1>
          <Link to={`/pesquisa/${slug ?? ""}`} className="text-primary hover:underline">Voltar para a pesquisa</Link>
        </div>
      </Layout>
    );
  }

  const team = teamStats.team;
  const year = teamStats.year;
  const ap = competition.total > 0 ? (((competition.w * 3 + competition.d) / (competition.total * 3)) * 100).toFixed(0) : "0";
  const goalsPro = matches.reduce((s, m) => s + (m.is_home ? (m.gols_casa ?? 0) : (m.gols_fora ?? 0)), 0);
  const goalsCon = matches.reduce((s, m) => s + (m.is_home ? (m.gols_fora ?? 0) : (m.gols_casa ?? 0)), 0);

  const title = `${team.name} na ${competition.name}${year ? ` ${year}` : ""}`;
  const metaTitle = `${title} — ${competition.total} jogos, ${competition.w}V ${competition.d}E ${competition.l}D | Statball`;
  const metaDesc = `Desempenho completo do ${team.name} na ${competition.name}${year ? ` em ${year}` : ""}: ${competition.total} partidas, ${competition.w} vitórias, ${competition.d} empates, ${competition.l} derrotas e ${goalsPro} gols marcados.`;
  const canonical = `${BASE}/pesquisa/${slug}/competicao/${ligaSlug}`;

  const jsonLd: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: metaDesc,
      url: canonical,
      datePublished: post.created_at,
      dateModified: post.updated_at,
      author: { "@type": "Organization", name: "Statball" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${BASE}/` },
        { "@type": "ListItem", position: 2, name: "Pesquisa Statball", item: `${BASE}/pesquisa` },
        { "@type": "ListItem", position: 3, name: post.question, item: `${BASE}/pesquisa/${slug}` },
        { "@type": "ListItem", position: 4, name: competition.name, item: canonical },
      ],
    },
  ];

  return (
    <Layout>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        {jsonLd.map((s, i) => <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>)}
      </Helmet>

      <article className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
          <Link to="/" className="hover:text-primary">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/pesquisa" className="hover:text-primary">Pesquisa</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/pesquisa/${slug}`} className="hover:text-primary line-clamp-1 max-w-[200px]">{post.question}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground/70">{competition.name}</span>
        </nav>

        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">{title}</h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Detalhamento completo da campanha do{" "}
            {team.slug ? <Link to={`/times/${team.slug}`} className="text-primary hover:underline font-medium">{team.name}</Link> : <strong>{team.name}</strong>}{" "}
            na <Link to={`/campeonatos/${competition.slug ?? ""}`} className="text-primary hover:underline font-medium">{competition.name}</Link>{year ? <> de <strong>{year}</strong></> : null}: {competition.total} jogos, com {competition.w} vitórias, {competition.d} empates e {competition.l} derrotas. Abaixo, o desempenho contra cada adversário e a lista completa de partidas — clique em qualquer jogo para ver o resumo, os gols e os cartões.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{competition.w} V</Badge>
            <Badge variant="secondary">{competition.d} E</Badge>
            <Badge variant="destructive">{competition.l} D</Badge>
            <Badge variant="outline">{goalsPro} gols pró</Badge>
            <Badge variant="outline">{goalsCon} gols contra</Badge>
            <Badge variant="outline">{ap}% aproveitamento</Badge>
          </div>
        </header>

        <section aria-labelledby="adversarios" className="space-y-3">
          <h2 id="adversarios" className="text-xl font-display font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Desempenho por adversário</h2>
          <Card><CardContent className="pt-5 px-0 pb-0">
            <ul className="divide-y divide-border">
              {adversaries.map((a) => {
                const saldo = a.gp - a.gc;
                return (
                  <li key={a.slug || a.name}>
                    {a.slug ? (
                      <Link to={`/times/${a.slug}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-muted/40 transition">
                        <span className="truncate">{a.name}</span>
                        <span className="text-muted-foreground tabular-nums whitespace-nowrap text-xs">{a.total} jogos · {a.w}V {a.d}E {a.l}D · {a.gp}-{a.gc} (saldo {saldo >= 0 ? `+${saldo}` : saldo})</span>
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                        <span className="truncate">{a.name}</span>
                        <span className="text-muted-foreground tabular-nums whitespace-nowrap text-xs">{a.total} jogos · {a.w}V {a.d}E {a.l}D · {a.gp}-{a.gc}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent></Card>
        </section>

        <section aria-labelledby="lista" className="space-y-3">
          <h2 id="lista" className="text-xl font-display font-semibold flex items-center gap-2"><ListOrdered className="h-5 w-5 text-primary" /> Todas as partidas na {competition.name}</h2>
          <MatchesList matches={matches} totalMatches={matches.length} />
        </section>

        <section aria-labelledby="ctx" className="space-y-2">
          <h2 id="ctx" className="text-xl font-display font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Sobre esta campanha</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta página é gerada automaticamente a partir da pergunta{" "}
            <Link to={`/pesquisa/${slug}`} className="text-primary hover:underline">"{post.question}"</Link>{" "}
            e cruza apenas dados oficiais de partidas finalizadas registradas na base do Statball. Cada linha da tabela acima é clicável e leva à ficha completa do jogo, com gols (minuto, autor e assistência) e cartões aplicados.
          </p>
        </section>
      </article>
    </Layout>
  );
}
