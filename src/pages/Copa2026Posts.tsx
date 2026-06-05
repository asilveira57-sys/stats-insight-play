import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useWC2026Posts } from "@/hooks/useCopa2026";
import { Badge } from "@/components/ui/badge";

export default function Copa2026Posts() {
  const { data, isLoading } = useWC2026Posts();
  return (
    <Layout>
      <Helmet><title>Posts — Cobertura Copa 2026 | Statball</title></Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Cobertura automática</h1>
        <p className="text-muted-foreground mb-6">Posts gerados a partir das análises por IA da Copa 2026.</p>
        {isLoading ? (
          <div>Carregando...</div>
        ) : (data ?? []).length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Nenhum post publicado ainda.</div>
        ) : (
          <div className="space-y-4">
            {data!.map(p => (
              <article key={p.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{p.post_type}</Badge>
                  {p.published_at && <span className="text-xs text-muted-foreground">{new Date(p.published_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}
                </div>
                <h2 className="font-bold text-lg mb-2">{p.title}</h2>
                {p.excerpt && <p className="text-muted-foreground mb-3">{p.excerpt}</p>}
                {p.content && <div className="whitespace-pre-line text-sm">{p.content}</div>}
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
