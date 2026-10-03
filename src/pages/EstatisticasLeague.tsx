import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { useLeagueBySlug } from "@/hooks/useLeaguePillar";
import { ChevronRight } from "lucide-react";

export default function EstatisticasLeague() {
  const { liga } = useParams<{ liga: string }>();
  const { data, isLoading } = useLeagueBySlug(liga ?? null);

  useEffect(() => {
    if (!data) return;
    const title = `Estatísticas ${data.nome} – Times e Desempenho | Aleball`;
    const desc = `Estatísticas completas de todos os times do ${data.nome}: gols, médias, aproveitamento e análises por temporada.`;
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
    setMeta("description", desc);
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/estatisticas/${data.slug}`;
  }, [data]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-24" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Liga não encontrada</h1>
          <Link to="/estatisticas" className="text-primary underline">Voltar</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <nav className="text-sm text-muted-foreground flex items-center gap-1">
          <Link to="/estatisticas" className="hover:text-foreground">Estatísticas</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{data.nome}</span>
        </nav>

        <header>
          <h1 className="text-3xl md:text-4xl font-bold">Estatísticas {data.nome}</h1>
          <p className="text-muted-foreground mt-1">
            {data.teams.length} times · {data.stats.partidasFinalizadas} partidas finalizadas · média {data.stats.mediaGolsPorJogo} gols/jogo
          </p>
        </header>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-3">Times do {data.nome}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data.teams.map((t) => (
                <Link
                  key={t.id}
                  to={`/estatisticas/${data.slug}/${t.slug}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition"
                >
                  <TeamBadge
                    name={t.nome}
                    primaryColor={t.cores?.primary}
                    secondaryColor={t.cores?.secondary}
                    size="md"
                  />
                  <span className="text-xs text-center line-clamp-2">{t.nome}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
