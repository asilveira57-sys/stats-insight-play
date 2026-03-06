import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Calendar } from "lucide-react";

interface RelatedArticlesProps {
  currentArticleId: string;
  ligaNome?: string;
}

interface RelatedArticle {
  id: string;
  titulo: string;
  resumo: string | null;
  slug: string | null;
  data_publicacao: string | null;
  imagem_url: string | null;
}

function generateSlug(title: string, id: string): string {
  const baseSlug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return baseSlug || id;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR", { 
    day: "2-digit", 
    month: "short" 
  });
}

export function RelatedArticles({ currentArticleId, ligaNome }: RelatedArticlesProps) {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["related-articles", currentArticleId],
    queryFn: async (): Promise<RelatedArticle[]> => {
      const { data, error } = await supabase
        .from("noticias")
        .select("id, titulo, resumo, slug, data_publicacao, imagem_url")
        .eq("publicada", true)
        .neq("id", currentArticleId)
        .order("data_publicacao", { ascending: false });

      if (error) {
        console.error("Error fetching related articles:", error);
        return [];
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || !articles || articles.length === 0) {
    return null;
  }

  return (
    <div className="my-12 p-8 rounded-2xl bg-card/50 border border-border">
      <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        Você também pode se interessar
      </h2>

      <ul className="space-y-4">
        {articles.map((article) => {
          const slug = article.slug || generateSlug(article.titulo, article.id);
          return (
            <li key={article.id}>
              <Link
                to={`/noticias/${slug}`}
                className="group flex items-start gap-4 p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {article.imagem_url && (
                  <img
                    src={article.imagem_url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">
                    {article.titulo}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(article.data_publicacao)}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        to="/noticias"
        className="inline-flex items-center gap-2 mt-6 text-sm text-primary hover:underline"
      >
        Ver todas as análises
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
