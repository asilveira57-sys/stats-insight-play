import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Trophy, Shield, Users, Flame, FileText, Eye } from "lucide-react";
import {
  useSearchTrends,
  usePopularEntities,
} from "@/hooks/useIntelligentSearch";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Period = "daily" | "weekly" | "monthly" | "total";

const PERIODS: { key: Period; label: string }[] = [
  { key: "daily", label: "Hoje" },
  { key: "weekly", label: "Semana" },
  { key: "monthly", label: "Mês" },
  { key: "total", label: "Total" },
];

function RankCard({ title, icon: Icon, items }: { title: string; icon: any; items: { name: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
        ) : (
          items.map((it, i) => (
            <Link
              key={i}
              to={`/pesquisa?q=${encodeURIComponent(it.name)}`}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}.</span>
                <span className="text-sm truncate">{it.name}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">{it.count}</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function Trends() {
  const [period, setPeriod] = useState<Period>("daily");
  const { data: trends } = useSearchTrends(period, 20);
  const { data: teams } = usePopularEntities("team", 20);
  const { data: leagues } = usePopularEntities("league", 20);
  const { data: players } = usePopularEntities("player", 20);

  const { data: recentPosts } = useQuery({
    queryKey: ["search-posts-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("search_posts")
        .select("slug, question, answer_summary, views, updated_at")
        .order("updated_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: popularPosts } = useQuery({
    queryKey: ["search-posts-popular"],
    queryFn: async () => {
      const { data } = await supabase
        .from("search_posts")
        .select("slug, question, answer_summary, views")
        .order("views", { ascending: false })
        .limit(12);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const trendItems = (trends || []).map((t: any) => ({
    name: t.term,
    count: period === "total" ? t.total_searches : t[`${period}_searches`],
  }));

  return (
    <Layout>
      <Helmet>
        <title>Tendências de Pesquisa | Statball</title>
        <meta
          name="description"
          content="O que o Brasil está pesquisando sobre futebol no Statball: times, campeonatos e jogadores mais buscados, além das páginas de pesquisa indexadas no Google."
        />
        <link rel="canonical" href="https://www.statball.com.br/trends" />
      </Helmet>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
            <Flame className="h-7 w-7 text-primary" />
            Tendências de Pesquisa
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-3xl">
            O que o Brasil está pesquisando sobre futebol no Statball. Veja os termos, times,
            campeonatos e jogadores mais buscados em tempo real — e explore as páginas de
            pesquisa indexadas, geradas a partir de perguntas reais dos usuários.
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {PERIODS.map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={period === p.key ? "default" : "outline"}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <RankCard title="Termos mais buscados" icon={TrendingUp} items={trendItems} />
            <RankCard title="Times" icon={Shield} items={(teams || []).map((t: any) => ({ name: t.entity_name, count: t.search_count }))} />
            <RankCard title="Campeonatos" icon={Trophy} items={(leagues || []).map((t: any) => ({ name: t.entity_name, count: t.search_count }))} />
            <RankCard title="Jogadores" icon={Users} items={(players || []).map((t: any) => ({ name: t.entity_name, count: t.search_count }))} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-display font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> Pesquisas mais acessadas
          </h2>
          <p className="text-sm text-muted-foreground">
            Páginas de respostas geradas pela inteligência do Statball com maior número de visualizações.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(popularPosts || []).map((p: any) => (
              <Link
                key={p.slug}
                to={`/pesquisa/${p.slug}`}
                className="block p-3 rounded-md border border-border hover:border-primary/50 hover:bg-muted/30 transition"
              >
                <p className="text-sm font-medium line-clamp-2">{p.question}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.answer_summary}</p>
                <span className="text-[10px] text-muted-foreground mt-2 inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {p.views} visualizações
                </span>
              </Link>
            ))}
            {(popularPosts || []).length === 0 && (
              <p className="text-xs text-muted-foreground">Ainda não há pesquisas suficientes.</p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-display font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Últimas pesquisas indexadas
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada pergunta respondida vira uma página própria, com dados oficiais e links para
            times, campeonatos e partidas — ótimas para tirar dúvidas e descobrir estatísticas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(recentPosts || []).map((p: any) => (
              <Link
                key={p.slug}
                to={`/pesquisa/${p.slug}`}
                className="block p-3 rounded-md border border-border hover:border-primary/50 hover:bg-muted/30 transition"
              >
                <p className="text-sm font-medium line-clamp-2">{p.question}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.answer_summary}</p>
                <span className="text-[10px] text-muted-foreground mt-2 block">
                  {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            ))}
            {(recentPosts || []).length === 0 && (
              <p className="text-xs text-muted-foreground">Faça a primeira pesquisa para gerar uma página.</p>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
