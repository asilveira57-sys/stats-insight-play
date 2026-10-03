import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { Badge } from "@/components/ui/badge";
import { useTeamSeoStats } from "@/hooks/useTeamSeoStats";
import { ChevronRight } from "lucide-react";

/**
 * Global team statistics page - aggregates across ALL leagues and seasons
 * Route: /estatisticas/times/:slug
 */
export default function EstatisticasTeamGlobal() {
  const { slug } = useParams<{ slug: string }>();
  // Pass null league to aggregate across all leagues; latest available season
  const { data, isLoading } = useTeamSeoStats(slug ?? null, null, null);

  const title = useMemo(
    () => (data ? `Estatísticas Gerais do ${data.team.nome} | Aleball` : "Estatísticas | Aleball"),
    [data],
  );
  const description = useMemo(
    () => (data
      ? `Estatísticas gerais e histórico do ${data.team.nome} em todas as competições e temporadas.`
      : ""),
    [data],
  );

  useEffect(() => {
    document.title = title;
    const setMeta = (n: string, c: string, prop = false) => {
      const sel = prop ? `meta[property="${n}"]` : `meta[name="${n}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        prop ? el.setAttribute("property", n) : el.setAttribute("name", n);
        document.head.appendChild(el);
      }
      el.content = c;
    };
    setMeta("description", description);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/estatisticas/times/${slug}`;
  }, [title, description, slug]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Time não encontrado</h1>
          <Link to="/estatisticas" className="text-primary underline">Voltar</Link>
        </div>
      </Layout>
    );
  }

  const { team, availableSeasons, availableLeagues, stats } = data;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <nav className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
          <Link to="/estatisticas" className="hover:text-foreground">Estatísticas</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{team.nome}</span>
        </nav>

        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
            <TeamBadge name={team.nome} primaryColor={team.cores?.primary} secondaryColor={team.cores?.secondary} size="xl" />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold">Estatísticas do {team.nome}</h1>
              <p className="text-muted-foreground mt-1">
                Histórico completo em todas as competições e temporadas.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap justify-center md:justify-start">
                <Badge variant="secondary">{stats.jogos} jogos ({data.season})</Badge>
                <Badge variant="secondary">{availableSeasons.length} temporadas</Badge>
                <Badge variant="secondary">{availableLeagues.length} competições</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-3">Por Temporada</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {availableSeasons.map((s) => (
                <Link
                  key={s}
                  to={availableLeagues[0]
                    ? `/estatisticas/${availableLeagues[0].slug}/${team.slug}/${s}`
                    : `/times/${team.slug}`}
                  className="px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 text-center font-medium transition"
                >
                  {s}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-3">Por Competição</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableLeagues.map((l) => (
                <Link
                  key={l.id}
                  to={`/estatisticas/${l.slug}/${team.slug}/${data.season}`}
                  className="px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition"
                >
                  {l.nome}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
