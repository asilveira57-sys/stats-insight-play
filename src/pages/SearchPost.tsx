import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnswerCard } from "@/components/search/AnswerCard";
import { TopScorersTable } from "@/components/search/TopScorersTable";
import type { StructuredAnswer } from "@/hooks/useIntelligentSearch";

const BASE_URL = "https://www.statball.com.br";

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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: data.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: data.answer_summary,
      },
    },
  };

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
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div className="space-y-2">
          <Link to="/pesquisa" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <SearchIcon className="h-3 w-3" /> Pesquisa Statball
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight">{data.question}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Atualizado em {new Date(data.updated_at).toLocaleDateString("pt-BR")}</span>
            {data.confidence != null && (
              <Badge variant="outline" className="text-[10px]">Confiança {Math.round(Number(data.confidence))}%</Badge>
            )}
          </div>
        </div>

        {payload?.kind === "top_scorer" && (
          <>
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resposta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-snug">{payload.summary}</p>
              </CardContent>
            </Card>
            <TopScorersTable
              rows={payload.top_scorers}
              leagueName={payload.league.name}
              year={payload.year}
              source={payload.source}
            />
          </>
        )}

        {payload?.kind === "team_stats" && <AnswerCard data={payload} />}
      </div>
    </Layout>
  );
}
