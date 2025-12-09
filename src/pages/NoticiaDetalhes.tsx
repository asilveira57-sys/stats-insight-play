import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { Layout } from "@/components/layout/Layout";
import { useNoticiaBySlug } from "@/hooks/useNoticias";
import { Loader2, ArrowLeft, Share2, Calendar, ChevronRight, Home, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function NoticiaDetalhes() {
  const { slug } = useParams<{ slug: string }>();
  const { data: noticia, isLoading } = useNoticiaBySlug(slug || null);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: noticia?.titulo,
          text: noticia?.resumo || "",
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!noticia) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="text-2xl font-display font-bold mb-2">Notícia não encontrada</h1>
          <p className="text-muted-foreground mb-6">
            O artigo que você está procurando não existe ou foi removido.
          </p>
          <Button asChild>
            <Link to="/noticias">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar às Notícias
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* SEO Meta Tags - would need react-helmet for full implementation */}
      <article className="min-h-screen">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="w-3.5 h-3.5" />
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/noticias">Notícias</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[200px] truncate">
                  {noticia.titulo}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Hero Image */}
        {noticia.imagem_url && (
          <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
            <img
              src={noticia.imagem_url}
              alt={noticia.titulo}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="container mx-auto px-4 -mt-32 relative z-10">
          <div className="max-w-3xl mx-auto">
            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              <time dateTime={noticia.data_publicacao || noticia.created_at}>
                {formatDate(noticia.data_publicacao || noticia.created_at)}
              </time>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 leading-tight">
              {noticia.titulo}
            </h1>

            {/* Summary */}
            {noticia.resumo && (
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed border-l-4 border-primary pl-4">
                {noticia.resumo}
              </p>
            )}

            {/* Article Content */}
            <div
              className="prose prose-lg prose-invert max-w-none 
                [&>h2]:text-2xl [&>h2]:font-display [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4
                [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3
                [&>p]:text-foreground/90 [&>p]:mb-4 [&>p]:leading-relaxed
                [&>ul]:my-4 [&>ul]:pl-6 [&>ul>li]:mb-2
                [&>ol]:my-4 [&>ol]:pl-6 [&>ol>li]:mb-2
                [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-6"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(noticia.texto) }}
            />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 mt-12 pt-8 border-t border-border">
              <Button variant="outline" asChild>
                <Link to="/noticias">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar às Notícias
                </Link>
              </Button>
              <Button variant="secondary" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-16" />
      </article>
    </Layout>
  );
}
