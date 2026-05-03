import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Image, ImageOff, Sparkles, Play, AlertTriangle, CheckCircle, BarChart3, RefreshCw, FileText, TrendingUp, Eye, Wand2 } from "lucide-react";
import { AuditTab } from "@/components/admin/images/AuditTab";
import { RegenerateNanoBananaTab } from "@/components/admin/images/RegenerateNanoBananaTab";

function useImageStats() {
  return useQuery({
    queryKey: ["admin-image-stats"],
    queryFn: async () => {
      const [totalRes, nullRes, unsplashRes, svgRes, storageRes] = await Promise.all([
        supabase.from("noticias").select("*", { count: "exact", head: true }).eq("publicada", true),
        supabase.from("noticias").select("*", { count: "exact", head: true }).eq("publicada", true).is("imagem_url", null),
        supabase.from("noticias").select("*", { count: "exact", head: true }).eq("publicada", true).like("imagem_url", "%unsplash.com%"),
        supabase.from("noticias").select("*", { count: "exact", head: true }).eq("publicada", true).like("imagem_url", "%.svg"),
        supabase.from("noticias").select("*", { count: "exact", head: true }).eq("publicada", true).like("imagem_url", "%news-thumbnails%").not("imagem_url", "like", "%.svg"),
      ]);

      const total = totalRes.count || 0;
      const nullCount = nullRes.count || 0;
      const unsplash = unsplashRes.count || 0;
      const svg = svgRes.count || 0;
      const storage = storageRes.count || 0;
      const withImage = total - nullCount;

      return { total, nullCount, unsplash, svg, storage, withImage };
    },
    staleTime: 30_000,
  });
}

function useContentStats() {
  return useQuery({
    queryKey: ["admin-content-stats"],
    queryFn: async () => {
      const [totalRes, updatedRes, pendingRes] = await Promise.all([
        supabase.from("noticias").select("*", { count: "exact", head: true }).eq("publicada", true),
        supabase.from("noticias").select("*", { count: "exact", head: true }).eq("publicada", true).eq("content_updated", true),
        supabase.from("noticias").select("*", { count: "exact", head: true }).eq("publicada", true).or("content_updated.is.null,content_updated.eq.false"),
      ]);

      return {
        total: totalRes.count || 0,
        updated: updatedRes.count || 0,
        pending: pendingRes.count || 0,
      };
    },
    staleTime: 30_000,
  });
}

export default function AdminImageManager() {
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useImageStats();
  const { data: contentStats, isLoading: contentStatsLoading } = useContentStats();

  const [svgRunning, setSvgRunning] = useState(false);
  const [svgProgress, setSvgProgress] = useState({ processed: 0, fixed: 0, errors: 0, pending: 0 });

  const [aiRunning, setAiRunning] = useState(false);
  const [aiProgress, setAiProgress] = useState({ processed: 0, fixed: 0, errors: 0, pending: 0 });

  const [reprocessRunning, setReprocessRunning] = useState(false);
  const [reprocessProgress, setReprocessProgress] = useState<{
    processed: number;
    failed: number;
    results: Array<{ titulo: string; success: boolean; word_count_before: number; word_count_after: number; error?: string }>;
  }>({ processed: 0, failed: 0, results: [] });

  if (adminLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) return null;

  const runSvgBatch = async () => {
    setSvgRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-svg-thumbnails", {
        body: { batch_size: 50, mode: "null_images" },
      });

      if (error) throw error;

      setSvgProgress({
        processed: data.processed || 0,
        fixed: data.fixed || 0,
        errors: data.errors || 0,
        pending: data.pending_null || 0,
      });

      toast({
        title: "SVG Batch concluído",
        description: `${data.fixed} thumbnails gerados, ${data.errors} erros`,
      });

      queryClient.invalidateQueries({ queryKey: ["admin-image-stats"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSvgRunning(false);
    }
  };

  const runAiBatch = async () => {
    setAiRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("fix-article-thumbnails", {
        body: { limit: 3 },
      });

      if (error) throw error;

      setAiProgress({
        processed: data.processed || 0,
        fixed: data.fixed || 0,
        errors: data.errors || 0,
        pending: data.pending || 0,
      });

      toast({
        title: "IA Batch concluído",
        description: `${data.fixed} imagens geradas via IA, ${data.errors} erros`,
      });

      queryClient.invalidateQueries({ queryKey: ["admin-image-stats"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setAiRunning(false);
    }
  };

  const runReprocessBatch = async () => {
    setReprocessRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("reprocess-articles", {
        body: { limit: 3, prioritize_recent: true },
      });

      if (error) throw error;

      setReprocessProgress({
        processed: data.processed || 0,
        failed: data.failed || 0,
        results: data.results || [],
      });

      toast({
        title: "Reprocessamento concluído",
        description: `${data.processed} artigos reescritos, ${data.failed} erros`,
      });

      queryClient.invalidateQueries({ queryKey: ["admin-content-stats"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setReprocessRunning(false);
    }
  };

  const coveragePercent = stats ? Math.round(((stats.total - stats.nullCount) / Math.max(stats.total, 1)) * 100) : 0;
  const contentPercent = contentStats ? Math.round((contentStats.updated / Math.max(contentStats.total, 1)) * 100) : 0;

  return (
    <AdminLayout>
      <Helmet>
        <title>Gerenciar Conteúdo | Admin</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Conteúdo</h1>
          <p className="text-muted-foreground">Imagens e reprocessamento de artigos</p>
        </div>

        <Tabs defaultValue="regenerate">
          <TabsList>
            <TabsTrigger value="regenerate" className="gap-2">
              <Wand2 className="h-4 w-4" /> Regenerar (Nano Banana)
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <Image className="h-4 w-4" /> Imagens
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Eye className="h-4 w-4" /> Auditoria
            </TabsTrigger>
            <TabsTrigger value="reprocess" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reprocessar Conteúdo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regenerate" className="space-y-6 mt-4">
            <RegenerateNanoBananaTab />
          </TabsContent>

          <TabsContent value="images" className="space-y-6 mt-4">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Artigos"
            value={stats?.total}
            loading={statsLoading}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <StatCard
            label="Com Imagem"
            value={stats?.withImage}
            loading={statsLoading}
            icon={<Image className="h-4 w-4 text-green-500" />}
            variant="success"
          />
          <StatCard
            label="Sem Imagem (NULL)"
            value={stats?.nullCount}
            loading={statsLoading}
            icon={<ImageOff className="h-4 w-4 text-red-500" />}
            variant="error"
          />
          <StatCard
            label="Unsplash Legacy"
            value={stats?.unsplash}
            loading={statsLoading}
            icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
            variant="warning"
          />
          <StatCard
            label="SVG Gerados"
            value={stats?.svg}
            loading={statsLoading}
            icon={<CheckCircle className="h-4 w-4 text-blue-500" />}
          />
          <StatCard
            label="IA Storage"
            value={stats?.storage}
            loading={statsLoading}
            icon={<Sparkles className="h-4 w-4 text-purple-500" />}
          />
        </div>

        {/* Coverage Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Cobertura de Imagens</span>
              <Badge variant={coveragePercent >= 90 ? "default" : coveragePercent >= 50 ? "secondary" : "destructive"}>
                {coveragePercent}%
              </Badge>
            </div>
            <Progress value={coveragePercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.withImage || 0} de {stats?.total || 0} artigos têm imagem
            </p>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* SVG Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-blue-500" />
                Geração SVG (Custo Zero)
              </CardTitle>
              <CardDescription>
                Gera thumbnails únicos usando cores dos times, padrões geométricos e dados do artigo.
                Sem IA, sem rate limit, processamento instantâneo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Batch: 50 artigos</Badge>
                <Badge variant="outline">Target: imagem NULL</Badge>
              </div>

              {svgProgress.processed > 0 && (
                <div className="rounded-lg border p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Processados</span>
                    <span className="font-medium">{svgProgress.processed}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Corrigidos</span>
                    <span className="font-medium">{svgProgress.fixed}</span>
                  </div>
                  {svgProgress.errors > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Erros</span>
                      <span className="font-medium">{svgProgress.errors}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pendentes</span>
                    <span className="font-medium">{svgProgress.pending}</span>
                  </div>
                </div>
              )}

              <Button onClick={runSvgBatch} disabled={svgRunning} className="w-full">
                {svgRunning ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processando...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Gerar SVG Batch (50 artigos)</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* AI Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Geração IA (Lovable AI)
              </CardTitle>
              <CardDescription>
                Gera imagens fotorrealísticas via Lovable AI Gateway (incluso no plano).
                Ideal para artigos de destaque. Mais lento devido a rate limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Batch: 3 artigos</Badge>
                <Badge variant="outline">Target: Unsplash legacy</Badge>
              </div>

              {aiProgress.processed > 0 && (
                <div className="rounded-lg border p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Processados</span>
                    <span className="font-medium">{aiProgress.processed}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Corrigidos</span>
                    <span className="font-medium">{aiProgress.fixed}</span>
                  </div>
                  {aiProgress.errors > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Erros</span>
                      <span className="font-medium">{aiProgress.errors}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pendentes</span>
                    <span className="font-medium">{aiProgress.pending}</span>
                  </div>
                </div>
              )}

              <Button onClick={runAiBatch} disabled={aiRunning} variant="secondary" className="w-full">
                {aiRunning ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando com IA...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Gerar IA Batch (3 artigos)</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6 mt-4">
            <AuditTab />
          </TabsContent>

          {/* Reprocess Content Tab */}
          <TabsContent value="reprocess" className="space-y-6 mt-4">
            {/* Content Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                label="Total Artigos"
                value={contentStats?.total}
                loading={contentStatsLoading}
                icon={<FileText className="h-4 w-4" />}
              />
              <StatCard
                label="Já Reprocessados"
                value={contentStats?.updated}
                loading={contentStatsLoading}
                icon={<CheckCircle className="h-4 w-4 text-green-500" />}
                variant="success"
              />
              <StatCard
                label="Pendentes"
                value={contentStats?.pending}
                loading={contentStatsLoading}
                icon={<RefreshCw className="h-4 w-4 text-orange-500" />}
                variant="warning"
              />
            </div>

            {/* Content Coverage Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso de Reprocessamento</span>
                  <Badge variant={contentPercent >= 90 ? "default" : contentPercent >= 50 ? "secondary" : "destructive"}>
                    {contentPercent}%
                  </Badge>
                </div>
                <Progress value={contentPercent} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {contentStats?.updated || 0} de {contentStats?.total || 0} artigos com conteúdo atualizado
                </p>
              </CardContent>
            </Card>

            {/* Reprocess Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Reprocessar Artigos (Lovable AI)
                </CardTitle>
                <CardDescription>
                  Reescreve 100% do conteúdo textual de artigos genéricos, mantendo tema, título e URL.
                  Usa Lovable AI Gateway (custo incluso). Processa 3 artigos por lote.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">Batch: 3 artigos</Badge>
                  <Badge variant="outline">Prioridade: mais recentes</Badge>
                  <Badge variant="outline">Mínimo: 400 palavras</Badge>
                </div>

                {reprocessProgress.results.length > 0 && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Último lote</span>
                      <span>{reprocessProgress.processed} OK / {reprocessProgress.failed} erros</span>
                    </div>
                    <div className="space-y-1">
                      {reprocessProgress.results.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          {r.success ? (
                            <TrendingUp className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{r.titulo}</p>
                            {r.success ? (
                              <p className="text-muted-foreground">
                                {r.word_count_before} → {r.word_count_after} palavras
                              </p>
                            ) : (
                              <p className="text-red-500">{r.error}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={runReprocessBatch} disabled={reprocessRunning} className="w-full">
                  {reprocessRunning ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Reprocessando...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-2" /> Reprocessar Batch (3 artigos)</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  label,
  value,
  loading,
  icon,
  variant,
}: {
  label: string;
  value?: number;
  loading: boolean;
  icon: React.ReactNode;
  variant?: "success" | "error" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <span className={`text-2xl font-bold ${
            variant === "success" ? "text-green-600" :
            variant === "error" ? "text-red-600" :
            variant === "warning" ? "text-yellow-600" :
            "text-foreground"
          }`}>
            {value?.toLocaleString("pt-BR") || 0}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
