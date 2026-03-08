import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { Layout } from "@/components/layout/Layout";
import { useNoticiaBySlug } from "@/hooks/useNoticias";
import { Loader2, ArrowLeft, Share2, Calendar, ChevronRight, Home, Newspaper, Clock } from "lucide-react";
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
import { ArticleSEO } from "@/components/news/ArticleSEO";
import { PremiumCTA } from "@/components/news/PremiumCTA";
import { RelatedArticles } from "@/components/news/RelatedArticles";
import { AdSlot } from "@/components/ads/AdSlot";

// Estimate reading time based on word count
function calculateReadingTime(text: string): number {
  const plainText = text.replace(/<[^>]*>/g, " ");
  const words = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Process HTML to split content at CTA placeholders and H2 sections
function processContent(html: string): { 
  intro: string; 
  sections: string[]; 
  hasCta: boolean;
  isLongPost: boolean;
} {
  const ctaRegex = /<div class="premium-cta">[\s\S]*?<\/div>/;
  const ctaFinalRegex = /<div class="premium-cta-final">[\s\S]*?<\/div>/;
  
  // Remove the CTAs from content
  let processed = html.replace(ctaRegex, "<!-- CTA_PLACEHOLDER -->");
  processed = processed.replace(ctaFinalRegex, "");
  
  const hasCta = processed.includes("<!-- CTA_PLACEHOLDER -->");
  
  // Split at H2 headings to get sections
  const h2Regex = /(<h2[^>]*>)/gi;
  const parts = processed.split(h2Regex).filter(Boolean);
  
  // First part is intro (before first H2)
  let intro = "";
  const sections: string[] = [];
  let currentSection = "";
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.match(/<h2[^>]*>/i)) {
      // This is an H2 tag, start new section
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = part;
    } else if (i === 0 && !part.match(/<h2[^>]*>/i)) {
      // First part before any H2 is intro
      intro = part;
    } else {
      // Continue current section
      currentSection += part;
    }
  }
  
  // Push last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // Check if post is long (more than 800 words)
  const plainText = html.replace(/<[^>]*>/g, " ");
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const isLongPost = wordCount > 800;
  
  return { intro, sections, hasCta, isLongPost };
}

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

  const readingTime = calculateReadingTime(noticia.texto);
  const { intro, sections, hasCta, isLongPost } = processContent(noticia.texto);
  const articleUrl = `${window.location.origin}/noticias/${slug}`;
  
  // Determine where to insert mid-article ad (after ~40% of sections)
  const midAdIndex = Math.max(1, Math.floor(sections.length * 0.4));

  const proseClasses = `prose prose-lg prose-invert max-w-none article-content
    [&>h2]:text-2xl [&>h2]:font-display [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:text-foreground
    [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-3 [&>h3]:text-foreground
    [&>h4]:text-lg [&>h4]:font-medium [&>h4]:mt-6 [&>h4]:mb-2
    [&>p]:text-foreground/90 [&>p]:mb-4 [&>p]:leading-relaxed
    [&>ul]:my-4 [&>ul]:pl-6 [&>ul>li]:mb-2 [&>ul>li]:text-foreground/85
    [&>ol]:my-4 [&>ol]:pl-6 [&>ol>li]:mb-2 [&>ol>li]:text-foreground/85
    [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-6 [&>blockquote]:text-muted-foreground
    [&_figure.internal-image]:my-8 [&_figure.internal-image]:rounded-xl [&_figure.internal-image]:overflow-hidden
    [&_figure.internal-image_img]:w-full [&_figure.internal-image_img]:h-auto
    [&_figure.internal-image_figcaption]:text-sm [&_figure.internal-image_figcaption]:text-muted-foreground [&_figure.internal-image_figcaption]:text-center [&_figure.internal-image_figcaption]:mt-3 [&_figure.internal-image_figcaption]:italic
    [&_strong]:text-foreground [&_strong]:font-semibold
    [&_em]:text-foreground/90
    [&_.internal-links]:my-10 [&_.internal-links]:p-6 [&_.internal-links]:rounded-xl [&_.internal-links]:bg-muted/30 [&_.internal-links]:border [&_.internal-links]:border-border/50
    [&_.internal-links_h3]:text-lg [&_.internal-links_h3]:font-semibold [&_.internal-links_h3]:mb-4 [&_.internal-links_h3]:text-foreground
    [&_.internal-links_ul]:space-y-2 [&_.internal-links_ul]:list-none [&_.internal-links_ul]:pl-0
    [&_.internal-links_a]:text-primary [&_.internal-links_a]:hover:underline [&_.internal-links_a]:transition-colors
    [&_.ad-slot]:my-8`;

  return (
    <Layout>
      {/* SEO Meta Tags */}
      <ArticleSEO
        title={noticia.titulo}
        description={noticia.resumo || noticia.texto.slice(0, 160)}
        image={noticia.imagem_url || undefined}
        url={articleUrl}
        publishedTime={noticia.data_publicacao || noticia.created_at}
      />

      <article className="min-h-screen" itemScope itemType="https://schema.org/Article">
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
                  <Link to="/noticias">Análises</Link>
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
        {noticia.imagem_url ? (
          <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
            <img
              src={noticia.imagem_url}
              alt={noticia.titulo}
              className="w-full h-full object-cover"
              itemProp="image"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                el.parentElement!.classList.add("bg-muted/50");
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        ) : (
          <div className="relative w-full h-[200px] md:h-[250px] overflow-hidden bg-gradient-to-br from-primary/20 via-muted/30 to-background flex items-center justify-center">
            <Newspaper className="w-16 h-16 text-muted-foreground/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="container mx-auto px-4 -mt-32 relative z-10">
          <div className="max-w-3xl mx-auto">
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time 
                  dateTime={noticia.data_publicacao || noticia.created_at}
                  itemProp="datePublished"
                >
                  {formatDate(noticia.data_publicacao || noticia.created_at)}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{readingTime} min de leitura</span>
              </div>
            </div>

            {/* Title */}
            <h1 
              className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 leading-tight"
              itemProp="headline"
            >
              {noticia.titulo}
            </h1>

            {/* Summary */}
            {noticia.resumo && (
              <p 
                className="text-lg text-muted-foreground mb-8 leading-relaxed border-l-4 border-primary pl-4"
                itemProp="description"
              >
                {noticia.resumo}
              </p>
            )}

            {/* Introduction */}
            {intro && (
              <div
                className={proseClasses}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(intro) }}
                itemProp="articleBody"
              />
            )}

            {/* Ad Slot 1 - After Intro (In-Article) */}
            <AdSlot position="article-intro" className="my-8" />

            {/* Article Sections with Mid-Article Ad */}
            {sections.map((section, index) => (
              <div key={index}>
                <div
                  className={proseClasses}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section) }}
                />
                
                {/* Insert mid-article ad after calculated section */}
                {index === midAdIndex - 1 && (
                  <>
                    {/* Ad Slot 2 - Mid Article (In-Content) */}
                    <AdSlot position="article-mid" className="my-8" />
                    
                    {/* Premium CTA - Inline */}
                    {hasCta && <PremiumCTA variant="inline" />}
                  </>
                )}
              </div>
            ))}

            {/* Premium CTA - Footer */}
            <PremiumCTA variant="footer" />

            {/* Ad Slot 3 - End of Article (only for long posts) */}
            {isLongPost && (
              <AdSlot position="article-end" className="my-8" />
            )}

            {/* Related Articles */}
            <RelatedArticles currentArticleId={noticia.id} />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 mt-12 pt-8 border-t border-border">
              <Button variant="outline" asChild>
                <Link to="/noticias">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Todas as Análises
                </Link>
              </Button>
              <Button variant="secondary" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>

            {/* Legal disclaimer */}
            <div className="mt-8 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              <p>
                <strong>Aviso:</strong> O Statball é uma plataforma de análise estatística de futebol. 
                Este conteúdo tem caráter informativo e não constitui recomendação de apostas. 
                Consulte nossos <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link> e{" "}
                <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-16" />
      </article>
    </Layout>
  );
}
