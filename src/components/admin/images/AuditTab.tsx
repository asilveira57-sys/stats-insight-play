import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Eye, RefreshCw, Play, Pause, ChevronLeft, ChevronRight,
  Image as ImageIcon, Sparkles, Filter, X
} from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type FilterType = "all" | "svg" | "ia" | "null";

interface ArticleRow {
  id: string;
  titulo: string;
  slug: string;
  imagem_url: string | null;
  data_publicacao: string | null;
  updated_at: string | null;
}

function classifyImage(url: string | null): "svg" | "ia" | "null" {
  if (!url) return "null";
  if (url.endsWith(".svg")) return "svg";
  return "ia";
}

const PAGE_SIZE = 20;

export function AuditTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Continuous replacement state
  const [autoRunning, setAutoRunning] = useState(false);
  const autoRef = useRef(false);
  const [autoStats, setAutoStats] = useState({ replaced: 0, errors: 0, total: 0 });

  // Reset page when filter changes
  useEffect(() => setPage(0), [filter]);

  const buildQuery = useCallback((countOnly: boolean) => {
    let q = supabase
      .from("noticias")
      .select(countOnly ? "*" : "id,titulo,slug,imagem_url,data_publicacao,updated_at", {
        count: "exact",
        head: countOnly,
      })
      .eq("publicada", true);

    if (filter === "svg") q = q.like("imagem_url", "%.svg");
    else if (filter === "ia") q = q.like("imagem_url", "%news-thumbnails%").not("imagem_url", "like", "%.svg");
    else if (filter === "null") q = q.is("imagem_url", null);

    if (!countOnly) {
      q = q.order("data_publicacao", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    }
    return q;
  }, [filter, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-articles", filter, page],
    queryFn: async () => {
      const res = await buildQuery(false);
      return { articles: (res.data || []) as ArticleRow[], count: res.count || 0 };
    },
    staleTime: 15_000,
  });

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  const regenerateOne = async (article: ArticleRow) => {
    setRegeneratingId(article.id);
    try {
      const { data: result, error } = await supabase.functions.invoke("fix-article-thumbnails", {
        body: { limit: 1, mode: "svg_replace", target_id: article.id },
      });
      if (error) throw error;
      if (result?.fixed > 0) {
        toast({ title: "Imagem regenerada", description: article.titulo });
        queryClient.invalidateQueries({ queryKey: ["audit-articles"] });
        queryClient.invalidateQueries({ queryKey: ["admin-image-stats"] });
      } else {
        toast({ title: "Falha", description: result?.results?.[0]?.error || "Sem resultado", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRegeneratingId(null);
    }
  };

  const startAutoReplace = async () => {
    autoRef.current = true;
    setAutoRunning(true);

    // Get total SVGs
    const { count } = await supabase
      .from("noticias")
      .select("*", { count: "exact", head: true })
      .eq("publicada", true)
      .like("imagem_url", "%.svg");

    setAutoStats({ replaced: 0, errors: 0, total: count || 0 });

    let totalReplaced = 0;
    let totalErrors = 0;

    while (autoRef.current) {
      try {
        const { data: result, error } = await supabase.functions.invoke("fix-article-thumbnails", {
          body: { limit: 3, mode: "svg_replace" },
        });

        if (error) throw error;

        const fixed = result?.fixed || 0;
        const errors = result?.errors || 0;
        totalReplaced += fixed;
        totalErrors += errors;

        setAutoStats(prev => ({
          ...prev,
          replaced: totalReplaced,
          errors: totalErrors,
        }));

        if (fixed === 0 && errors === 0) {
          // Nothing left
          autoRef.current = false;
          toast({ title: "Substituição concluída", description: `${totalReplaced} imagens substituídas` });
          break;
        }

        queryClient.invalidateQueries({ queryKey: ["audit-articles"] });
        queryClient.invalidateQueries({ queryKey: ["admin-image-stats"] });

        // Wait 10 seconds between batches
        if (autoRef.current) {
          await new Promise(r => setTimeout(r, 10000));
        }
      } catch (err: any) {
        if (err.message?.includes("RATE_LIMIT") || err.message?.includes("CREDITS")) {
          toast({ title: "Rate limit", description: "Pausando automaticamente...", variant: "destructive" });
          autoRef.current = false;
          break;
        }
        totalErrors++;
        setAutoStats(prev => ({ ...prev, errors: totalErrors }));
        await new Promise(r => setTimeout(r, 15000));
      }
    }

    setAutoRunning(false);
  };

  const stopAutoReplace = () => {
    autoRef.current = false;
  };

  const remaining = Math.max(autoStats.total - autoStats.replaced, 0);
  const etaMinutes = remaining > 0 ? Math.ceil((remaining / 3) * (13 / 60)) : 0;
  const autoPercent = autoStats.total > 0 ? Math.round((autoStats.replaced / autoStats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Auto-replace controls */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Substituição Automática de SVGs</h3>
              <p className="text-sm text-muted-foreground">
                Processa 3 artigos por vez, pausa 10s entre lotes. Custo: $0 via Lovable AI.
              </p>
            </div>
            {autoRunning ? (
              <Button variant="destructive" onClick={stopAutoReplace}>
                <Pause className="h-4 w-4 mr-2" /> Pausar
              </Button>
            ) : (
              <Button onClick={startAutoReplace}>
                <Play className="h-4 w-4 mr-2" /> Iniciar Substituição
              </Button>
            )}
          </div>

          {(autoRunning || autoStats.replaced > 0) && (
            <div className="space-y-2">
              <Progress value={autoPercent} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{autoStats.replaced} substituídas / {autoStats.errors} erros</span>
                <span>
                  {remaining} restantes
                  {etaMinutes > 0 && ` (~${etaMinutes} min)`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="svg">SVG Artísticas</SelectItem>
            <SelectItem value="ia">IA Corretas</SelectItem>
            <SelectItem value="null">Sem Imagem</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {data?.count?.toLocaleString("pt-BR") || 0} artigos
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data?.articles.map((article) => {
            const type = classifyImage(article.imagem_url);
            const isRegenerating = regeneratingId === article.id;

            return (
              <Card key={article.id} className="overflow-hidden group">
                <div className="relative aspect-video bg-muted">
                  {article.imagem_url ? (
                    <img
                      src={article.imagem_url}
                      alt={article.titulo}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Overlay buttons */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {article.imagem_url && (
                      <Button size="sm" variant="secondary" onClick={() => setPreviewUrl(article.imagem_url)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {type === "svg" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => regenerateOne(article)}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Badge */}
                  <Badge
                    className="absolute top-1 right-1 text-[10px]"
                    variant={type === "svg" ? "destructive" : type === "ia" ? "default" : "secondary"}
                  >
                    {type === "svg" ? "SVG" : type === "ia" ? "IA" : "NULL"}
                  </Badge>
                </div>

                <CardContent className="p-2">
                  <p className="text-xs font-medium truncate" title={article.titulo}>
                    {article.titulo}
                  </p>
                  {article.data_publicacao && (
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(article.data_publicacao).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Full-size preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Preview da imagem</DialogTitle>
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
