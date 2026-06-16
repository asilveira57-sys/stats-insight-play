import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search as SearchIcon, ChevronRight, Sparkles, Trophy, BarChart3, ListOrdered, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CompetitionBreakdown } from "@/components/search/CompetitionBreakdown";
import { MatchesList } from "@/components/search/MatchesList";
import { TopScorersTable } from "@/components/search/TopScorersTable";
import type { StructuredAnswer } from "@/hooks/useIntelligentSearch";

const BASE_URL = "https://www.statball.com.br";

function buildIntro(payload: StructuredAnswer | null, question: string): string {
  if (!payload) {
    return `Nesta página você encontra a resposta completa para a pergunta "${question}", com dados oficiais reunidos pelo Statball a partir de partidas, campeonatos e estatísticas atualizadas diariamente.`;
  }
  if (payload.kind === "team_stats") {
    const t = payload.team.name;
    const y = payload.year ? ` na temporada de ${payload.year}` : "";
    const b = payload.breakdown;
    const ap = b.total > 0 ? (((b.vitorias * 3 + b.empates) / (b.total * 3)) * 100).toFixed(0) : "0";
    return `Resposta completa sobre o desempenho do ${t}${y}: ${b.total} jogos disputados, com ${b.vitorias} vitórias, ${b.empates} empates e ${b.derrotas} derrotas, somando ${b.gols_pro} gols marcados e ${b.gols_contra} sofridos — um aproveitamento de ${ap}%. Abaixo você encontra o detalhamento por competição e a lista completa de partidas com link para cada jogo.`;
  }
  if (payload.kind === "top_scorer") {
    return `Lista atualizada dos artilheiros ${payload.league.name ? `da ${payload.league.name}` : ""}${payload.year ? ` na temporada ${payload.year}` : ""}, com nome do jogador, clube e total de gols marcados. Os dados são atualizados após cada rodada e podem ser conferidos diretamente nas páginas dos atletas.`;
  }
  return `Resposta completa para "${question}", com dados oficiais Statball.`;
}

function buildFaqs(payload: StructuredAnswer | null, question: string): { q: string; a: string }[] {
  if (!payload) return [];
  if (payload.kind === "team_stats") {
    const t = payload.team.name;
    const y = payload.year ?? new Date().getFullYear();
    const b = payload.breakdown;
    const ap = b.total > 0 ? (((b.vitorias * 3 + b.empates) / (b.total * 3)) * 100).toFixed(0) : "0";
    const topComp = payload.competitions[0];
    return [
      { q: `Quantos jogos o ${t} disputou em ${y}?`, a: `O ${t} disputou ${b.total} partidas em ${y}, considerando todas as competições oficiais.` },
      { q: `Qual o aproveitamento do ${t} em ${y}?`, a: `O aproveitamento do ${t} em ${y} é de ${ap}%, com ${b.vitorias} vitórias, ${b.empates} empates e ${b.derrotas} derrotas.` },
      { q: `Quantos gols o ${t} marcou e sofreu em ${y}?`, a: `Na temporada ${y}, o ${t} marcou ${b.gols_pro} gols e sofreu ${b.gols_contra}, deixando saldo de ${b.gols_pro - b.gols_contra}.` },
      ...(topComp ? [{ q: `Qual a competição com mais jogos do ${t} em ${y}?`, a: `Em ${y}, o ${t} disputou mais partidas pela ${topComp.name} (${topComp.total} jogos, com ${topComp.w}V ${topComp.d}E ${topComp.l}D).` }] : []),
    ];
  }
  if (payload.kind === "top_scorer") {
    const top = payload.top_scorers[0];
    return [
      ...(top ? [{ q: `Quem é o artilheiro ${payload.league.name ? `da ${payload.league.name}` : ""}${payload.year ? ` em ${payload.year}` : ""}?`, a: `${top.jogador}${top.time ? ` (${top.time})` : ""} lidera com ${top.gols} gols marcados.` }] : []),
      { q: `Como o Statball calcula a artilharia?`, a: `Somamos todos os gols oficiais marcados pelo jogador na competição informada, considerando apenas partidas com status finalizado e gols confirmados pelas fontes oficiais.` },
    ];
  }
  return [];
}

export default function SearchPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    enabled: !!slug,
    queryKey: ["search-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_posts")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: related } = useQuery({
    enabled: !!data,
    queryKey: ["search-posts-related", slug],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("search_posts")
        .select("slug, question, answer_summary, views")
        .neq("slug", slug!)
        .order("views", { ascending: false })
        .limit(8);
      return rows ?? [];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (slug && data) {
      supabase.rpc("increment_search_post_views", { p_slug: slug }).then(() => {}, () => {});
    }
  }, [slug, data]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Pergunta não encontrada</h1>
          <p className="text-muted-foreground">Essa pesquisa ainda não tem uma página salva.</p>
          <Link to="/pesquisa" className="text-primary hover:underline">Voltar para a pesquisa</Link>
        </div>
      </Layout>
    );
  }

  const payload = data.answer_payload as unknown as StructuredAnswer;
  const canonical = `${BASE_URL}/pesquisa/${data.slug}`;
  const intro = buildIntro(payload, data.question);
  const faqs = buildFaqs(payload, data.question);

  const jsonLd: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "QAPage",
      mainEntity: {
        "@type": "Question",
        name: data.question,
        text: data.question,
        answerCount: 1,
        acceptedAnswer: {
          "@type": "Answer",
          text: data.answer_summary,
          url: canonical,
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Pesquisa Statball", item: `${BASE_URL}/pesquisa` },
        { "@type": "ListItem", position: 3, name: data.question, item: canonical },
      ],
    },
  ];

  if (faqs.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return (
    <Layout>
      <Helmet>
        <title>{data.meta_title}</title>
        <meta name="description" content={data.meta_description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={data.meta_title} />
        <meta property="og:description" content={data.meta_description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        {jsonLd.map((schema, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
        ))}
      </Helmet>

      <article className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
          <Link to="/" className="hover:text-primary">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/pesquisa" className="hover:text-primary inline-flex items-center gap-1">
            <SearchIcon className="h-3 w-3" /> Pesquisa Statball
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground/70 line-clamp-1">{data.question}</span>
        </nav>

        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">{data.question}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>Publicado por <strong className="text-foreground/80">Statball</strong></span>
            <span>·</span>
            <span>Atualizado em {new Date(data.updated_at).toLocaleDateString("pt-BR")}</span>
            {data.confidence != null && (
              <>
                <span>·</span>
                <Badge variant="outline" className="text-[10px]">Confiança {Math.round(Number(data.confidence))}%</Badge>
              </>
            )}
          </div>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{intro}</p>
        </header>

        {/* Resposta direta */}
        <section aria-labelledby="resposta-direta" className="space-y-3">
          <h2 id="resposta-direta" className="text-xl font-display font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Resposta direta
          </h2>
          <Card className="border-primary/30">
            <CardContent className="pt-6 space-y-4">
              <p className="text-lg leading-snug">
                {payload?.kind === "team_stats" && (
                  <>
                    {payload.team.slug ? (
                      <Link to={`/times/${payload.team.slug}`} className="font-semibold text-primary hover:underline">
                        {payload.team.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{payload.team.name}</span>
                    )}{" "}
                    disputou <strong>{payload.breakdown.total} partidas</strong>
                    {payload.year ? ` em ${payload.year}` : ""}
                    {payload.scope === "home" ? " como mandante" : payload.scope === "away" ? " como visitante" : ""}.
                  </>
                )}
                {payload?.kind === "top_scorer" && payload.summary}
                {!payload && data.answer_summary}
              </p>

              {payload?.kind === "team_stats" && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">{payload.breakdown.vitorias} V</Badge>
                  <Badge variant="secondary">{payload.breakdown.empates} E</Badge>
                  <Badge variant="destructive">{payload.breakdown.derrotas} D</Badge>
                  <Badge variant="outline">{payload.breakdown.gols_pro} gols pró</Badge>
                  <Badge variant="outline">{payload.breakdown.gols_contra} gols contra</Badge>
                  <Badge variant="outline">
                    {payload.breakdown.total > 0
                      ? (((payload.breakdown.vitorias * 3 + payload.breakdown.empates) / (payload.breakdown.total * 3)) * 100).toFixed(0)
                      : 0}
                    % aproveitamento
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Por competição */}
        {payload?.kind === "team_stats" && payload.competitions.length > 0 && (
          <section aria-labelledby="por-competicao" className="space-y-3">
            <h2 id="por-competicao" className="text-xl font-display font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Desempenho por competição
            </h2>
            <p className="text-sm text-muted-foreground">
              Distribuição das {payload.breakdown.total} partidas{payload.year ? ` de ${payload.year}` : ""} entre os torneios disputados. Clique em uma competição para ver a página completa do campeonato.
            </p>
            <CompetitionBreakdown competitions={payload.competitions} />
          </section>
        )}

        {/* Lista de partidas */}
        {payload?.kind === "team_stats" && payload.matches.length > 0 && (
          <section aria-labelledby="lista-partidas" className="space-y-3">
            <h2 id="lista-partidas" className="text-xl font-display font-semibold flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-primary" /> Lista de partidas
            </h2>
            <p className="text-sm text-muted-foreground">
              Todas as partidas com placar final. Clique em qualquer linha para acessar a página completa do jogo, com escalações, estatísticas e melhores momentos.
            </p>
            <MatchesList matches={payload.matches} totalMatches={payload.total_matches} />
          </section>
        )}

        {/* Top scorers */}
        {payload?.kind === "top_scorer" && (
          <section aria-labelledby="artilheiros" className="space-y-3">
            <h2 id="artilheiros" className="text-xl font-display font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Tabela de artilheiros
            </h2>
            <TopScorersTable
              rows={payload.top_scorers}
              leagueName={payload.league.name}
              year={payload.year}
              source={payload.source}
            />
          </section>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <section aria-labelledby="faq" className="space-y-3">
            <h2 id="faq" className="text-xl font-display font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> Perguntas frequentes
            </h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <Card key={i}>
                  <CardContent className="pt-5 space-y-2">
                    <h3 className="font-semibold">{f.q}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Metodologia */}
        <section aria-labelledby="metodologia" className="space-y-2">
          <h2 id="metodologia" className="text-xl font-display font-semibold">Como o Statball calculou esta resposta</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Statball cruza dados de partidas oficiais, campeonatos e jogadores em tempo real. Apenas jogos com placar finalizado são considerados nas estatísticas. Sempre que possível, a resposta inclui links para a página de cada time, campeonato e partida, permitindo verificar os dados na fonte. A página é gerada automaticamente a partir da pergunta do usuário e atualizada quando novos jogos entram na base.
          </p>
        </section>

        {/* Related */}
        {(related?.length ?? 0) > 0 && (
          <section aria-labelledby="relacionadas" className="space-y-3">
            <h2 id="relacionadas" className="text-xl font-display font-semibold">Pesquisas relacionadas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {related!.map((r: any) => (
                <Link
                  key={r.slug}
                  to={`/pesquisa/${r.slug}`}
                  className="block p-3 rounded-md border border-border hover:border-primary/50 hover:bg-muted/30 transition"
                >
                  <p className="text-sm font-medium line-clamp-2">{r.question}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.answer_summary}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Quer perguntar outra coisa?</p>
          <Link
            to="/pesquisa"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition text-sm font-medium"
          >
            <SearchIcon className="h-4 w-4" /> Fazer nova pesquisa no Statball
          </Link>
        </section>
      </article>
    </Layout>
  );
}
