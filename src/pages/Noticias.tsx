import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NewsCard } from "@/components/cards/NewsCard";
import { useNoticias, useNoticia, type NoticiaCard } from "@/hooks/useNoticias";
import { Newspaper, Search, Loader2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Noticias() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: noticias, isLoading } = useNoticias(20);
  const [selectedNoticiaId, setSelectedNoticiaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: selectedNoticia, isLoading: noticiaLoading } = useNoticia(selectedNoticiaId);

  // Check for artigo parameter in URL on mount
  useEffect(() => {
    const artigoId = searchParams.get("artigo");
    if (artigoId) {
      setSelectedNoticiaId(artigoId);
    }
  }, [searchParams]);

  // Clear URL param when modal closes
  const handleModalClose = (open: boolean) => {
    if (!open) {
      setSelectedNoticiaId(null);
      searchParams.delete("artigo");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const filteredNoticias = noticias?.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featuredNoticias = filteredNoticias?.slice(0, 2) || [];
  const otherNoticias = filteredNoticias?.slice(2) || [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                <span className="gradient-text">Notícias</span>
              </h1>
              <p className="text-muted-foreground">
                Últimas novidades do mundo do futebol
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar notícias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full md:w-64"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        ) : filteredNoticias && filteredNoticias.length > 0 ? (
          <>
            {/* Featured News */}
            {featuredNoticias.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {featuredNoticias.map((item) => (
                  <NewsCard 
                    key={item.id} 
                    {...item} 
                    featured 
                    onClick={() => setSelectedNoticiaId(item.id)}
                  />
                ))}
              </div>
            )}

            {/* News Grid */}
            {otherNoticias.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherNoticias.map((item) => (
                  <NewsCard 
                    key={item.id} 
                    {...item} 
                    onClick={() => setSelectedNoticiaId(item.id)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="glass-card p-12 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma notícia encontrada</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm 
                ? "Tente buscar por outro termo" 
                : "Novas notícias serão publicadas em breve"}
            </p>
          </div>
        )}
      </div>

      {/* News Detail Modal */}
      <Dialog open={!!selectedNoticiaId} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          {noticiaLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedNoticia ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-display pr-6">
                  {selectedNoticia.titulo}
                </DialogTitle>
              </DialogHeader>
              
              {selectedNoticia.imagem_url && (
                <div className="relative h-48 md:h-64 rounded-lg overflow-hidden -mx-6 -mt-2">
                  <img
                    src={selectedNoticia.imagem_url}
                    alt={selectedNoticia.titulo}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                </div>
              )}
              
              <div className="text-xs text-muted-foreground mb-4">
                {selectedNoticia.data_publicacao && 
                  new Date(selectedNoticia.data_publicacao).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                }
              </div>
              
              <ScrollArea className="max-h-[40vh]">
                <div className="prose prose-sm prose-invert max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedNoticia.texto}
                  </p>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Notícia não encontrada
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
