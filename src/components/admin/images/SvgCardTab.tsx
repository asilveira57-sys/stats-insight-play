import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Image as ImageIcon, Zap, Infinity as InfinityIcon, StopCircle, ExternalLink, History } from "lucide-react";

interface ResultItem {
  id: string;
  titulo: string;
  success: boolean;
  imagem_url?: string;
  error?: string;
}

export function SvgCardTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [batchSize, setBatchSize] = useState(100);
  const [running, setRunning] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [stopFlag, setStopFlag] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [progress, setProgress] = useState({ totalFixed: 0, lastBatchFixed: 0, lastBatchErrors: 0 });

  // Pendentes: nunca regenerados OU sem imagem OU unsplash
  const { data: pendingCount, isLoading: countLoading } = useQuery({
    queryKey: ["svg-card-pending"],
    queryFn: async () => {
      const { count } = await supabase
        .from("noticias")
        .select("*", { count: "exact", head: true })
        .eq("publicada", true)
        .or("image_regenerated_at.is.null,imagem_url.is.null,imagem_url.like.%unsplash%");
      return count || 0;
    },
    staleTime: 5_000,
    refetchInterval: running ? 3_000 : false,
  });

  // Já gerados via SVG
  const { data: doneCount } = useQuery({
    queryKey: ["svg-card-done"],
    queryFn: async () => {
      const { count } = await supabase
        .from("noticias")
        .select("*", { count: "exact", head: true })
        .eq("image_source", "svg")
        .not("image_regenerated_at", "is", null);
      return count || 0;
    },
    staleTime: 5_000,
    refetchInterval: running ? 3_000 : false,
  });

  const runOneBatch = async (): Promise<{ pending: number; fixed: number; errors: number; results: ResultItem[] }> => {
    const { data, error } = await supabase.functions.invoke("generate-article-card-svg", {
      body: { limit: batchSize, mode: "execute" },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Falha na execução");
    return {
      pending: data.pending ?? 0,
      fixed: data.fixed ?? 0,
      errors: data.errors ?? 0,
      results: data.results || [],
    };
  };

  const runBatch = async () => {
    setRunning(true);
    setStopFlag(false);
    try {
      const r = await runOneBatch();
      setResults(r.results);
      setProgress(p => ({
        totalFixed: p.totalFixed + r.fixed,
        lastBatchFixed: r.fixed,
        lastBatchErrors: r.errors,
      }));
      toast({ title: `Lote concluído`, description: `${r.fixed} OK, ${r.errors} erros, ${r.pending} pendentes` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
      queryClient.invalidateQueries({ queryKey: ["svg-card-pending"] });
      queryClient.invalidateQueries({ queryKey: ["svg-card-done"] });
      queryClient.invalidateQueries({ queryKey: ["admin-image-stats"] });
    }
  };

  const runAuto = async () => {
    setAutoRun(true);
    setRunning(true);
    setStopFlag(false);
    let totalFixed = 0;
    let totalErrors = 0;
    try {
      while (true) {
        if (stopFlag) break;
        const r = await runOneBatch();
        totalFixed += r.fixed;
        totalErrors += r.errors;
        setResults(r.results);
        setProgress({ totalFixed, lastBatchFixed: r.fixed, lastBatchErrors: r.errors });
        queryClient.invalidateQueries({ queryKey: ["svg-card-pending"] });
        queryClient.invalidateQueries({ queryKey: ["svg-card-done"] });
        if (r.fixed === 0 || r.pending === 0) break;
        await new Promise(res => setTimeout(res, 500));
      }
      toast({ title: "Auto-run finalizado", description: `Total: ${totalFixed} corrigidos, ${totalErrors} erros` });
    } catch (err: any) {
      toast({ title: "Auto-run interrompido", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
      setAutoRun(false);
      queryClient.invalidateQueries({ queryKey: ["admin-image-stats"] });
    }
  };

  const total = (pendingCount || 0) + (doneCount || 0);
  const percent = total > 0 ? Math.round(((doneCount || 0) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-500" />
            Cards SVG (custo zero, recomendado)
          </CardTitle>
          <CardDescription>
            Gera capa do artigo combinando cores dos times + nome do confronto + logo da liga.
            Renderizado no edge em ~200ms. <strong>Não consome créditos de IA</strong>.
            Ideal pros 30k+ artigos retroativos.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total artigos" value={total} loading={countLoading} />
        <Stat label="Com SVG" value={doneCount} loading={countLoading} accent="success" />
        <Stat label="Pendentes" value={pendingCount} loading={countLoading} accent="warning" />
        <Stat label="Cobertura" value={`${percent}%`} loading={countLoading} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso geral</span>
            <Badge variant={percent >= 90 ? "default" : "secondary"}>{percent}%</Badge>
          </div>
          <Progress value={percent} className="h-3" />
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Executar geração</CardTitle>
          <CardDescription>
            Use auto-run pra processar até zerar a fila. Lotes de 100 levam ~30s. 30k artigos ≈ 25 min.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="batch">Tamanho do lote (1-500)</Label>
              <Input
                id="batch"
                type="number"
                min={1}
                max={500}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, Math.min(500, parseInt(e.target.value) || 100)))}
                className="w-28"
                disabled={running}
              />
            </div>

            <Button onClick={runBatch} disabled={running || !pendingCount} className="gap-2">
              {running && !autoRun ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
              ) : (
                <><Play className="h-4 w-4" /> Rodar 1 lote</>
              )}
            </Button>

            {!autoRun ? (
              <Button onClick={runAuto} disabled={running || !pendingCount} variant="secondary" className="gap-2">
                <InfinityIcon className="h-4 w-4" /> Auto-run até zerar
              </Button>
            ) : (
              <Button onClick={() => setStopFlag(true)} variant="destructive" className="gap-2">
                <StopCircle className="h-4 w-4" /> Parar auto-run
              </Button>
            )}
          </div>

          {progress.totalFixed > 0 && (
            <div className="rounded-lg border p-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total corrigidos (sessão)</p>
                <p className="text-xl font-bold text-green-600">{progress.totalFixed}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Último lote OK</p>
                <p className="text-xl font-bold">{progress.lastBatchFixed}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Último lote erros</p>
                <p className="text-xl font-bold text-red-600">{progress.lastBatchErrors}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Amostra do último lote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.slice(0, 12).map((r) => (
                <div key={r.id} className="rounded-lg overflow-hidden border bg-card">
                  {r.success && r.imagem_url ? (
                    <img src={r.imagem_url} alt={r.titulo} loading="lazy" className="w-full aspect-[1200/630] object-cover" />
                  ) : (
                    <div className="aspect-[1200/630] bg-destructive/10 flex items-center justify-center text-destructive text-xs p-2">
                      {r.error}
                    </div>
                  )}
                  <p className="p-2 text-xs line-clamp-2">{r.titulo}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, loading, accent }: { label: string; value: number | string | undefined; loading: boolean; accent?: "success" | "warning" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-muted animate-pulse rounded" />
        ) : (
          <p className={`text-2xl font-bold ${accent === "success" ? "text-green-600" : accent === "warning" ? "text-yellow-600" : "text-foreground"}`}>
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value ?? 0}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
