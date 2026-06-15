import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useWC2026Posts } from "@/hooks/useCopa2026";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function Copa2026Posts() {
  const { data, isLoading } = useWC2026Posts();
  const posts = data ?? [];

  return (
    <Layout>
      <Helmet>
        <title>Cobertura Copa do Mundo 2026 — Notícias e crônicas | Statball</title>
        <meta name="description" content="Cobertura editorial e crônicas pós-jogo da Copa do Mundo 2026, gerada pela redação automatizada do Statball." />
        <link rel="canonical" href="https://www.statball.com.br/copa-2026/posts" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Cobertura Copa 2026</h1>
        <p className="text-muted-foreground mb-6">Notícias, prévias e crônicas pós-jogo da Copa do Mundo 2026.</p>

        {isLoading ? (
          <div className="text-muted-foreground">Carregando…</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Nenhum post publicado ainda.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((p: any) => {
              const kind = p.slug?.includes("pos-jogo") ? "Pós-jogo" : p.slug?.includes("group") ? "Prévia" : "Cobertura";
              const dateStr = p.data_publicacao
                ? new Date(p.data_publicacao).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" })
                : "";
              return (
                <Link
                  key={p.id}
                  to={`/noticias/${p.slug}`}
                  className="group block rounded-xl border border-border bg-card hover:border-primary/60 hover:shadow-lg transition-all overflow-hidden"
                >
                  {p.imagem_url ? (
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      <img
                        src={p.imagem_url}
                        alt={p.imagem_alt ?? p.titulo}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px]">{kind}</Badge>
                      {dateStr && <span className="text-xs text-muted-foreground">{dateStr}</span>}
                    </div>
                    <h2 className="font-bold text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {p.titulo}
                    </h2>
                    {p.resumo && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{p.resumo}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
