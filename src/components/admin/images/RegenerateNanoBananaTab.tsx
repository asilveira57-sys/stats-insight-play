import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Sparkles, CheckCircle, XCircle, Image as ImageIcon } from "lucide-react";

interface ResultItem {
  id: string;
  titulo: string;
  success: boolean;
  imagem_url?: string;
  matchup?: string | null;
  error?: string;
}

export function RegenerateNanoBananaTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [batchSize, setBatchSize] = useState(5);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [pending, setPending] = useState<number | null>(null);

  // Total pendentes
  const { data: pendingCount, isLoading: countLoading } = useQuery({
    queryKey: ["nano-banana-pending"],
    queryFn: async () => {
      const { count } = await supabase
        .from("noticias")
        .select("*", { count: "exact", head: true })
        .eq("publicada", true)
        .is("image_regenerated_at", null)
        .or("imagem_url.is.null,imagem_url.like.%.svg,imagem_url.like.%unsplash%");
      return count || 0;
    },
    staleTime: 10_000,
  });

  // Total já regenerados
  const { data: doneCount } = useQuery({
    queryKey: ["nano-banana-done"],
    queryFn: async () => {
      const { count } = await supabase
        .from("noticias")
        .select("*", { count: "exact", head: true })
        .not("image_regenerated_at", "is", null);
      return count || 0;
    },
    staleTime: 10_000,
  });

  const runBatch = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-article-images", {
        body: { limit: batchSize, mode: "execute" },
      });
      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Falha na execução");
      }

      setResults(data.results || []);
      setPending(data.pending ?? null);

      const fixed = data.fixed || 0;
      const errors = data.errors || 0;

      toast({
        title: `Lote concluído: ${fixed} OK, ${errors} erro(s)`,
        description: `Restam ${data.pending ?? "?"} artigos para corrigir`,
      });

      queryClient.invalidateQueries({ queryKey: ["nano-banana-pending"] });
      queryClient.invalidateQueries({ queryKey: ["nano-banana-done"] });
      queryClient.invalidateQueries({ queryKey: ["admin-image-stats"] });
      queryClient.invalidateQueries({ queryKey: ["audit-articles"] });
    } catch (err: any) {
      const msg = err?.message || String(err);
      toast({
        title: "Erro no lote",
        description: msg.includes("RATE_LIMIT")
          ? "Rate limit atingido. Aguarde alguns minutos."
          : msg.includes("CREDITS_EXHAUSTED")
          ? "Créditos do Lovable AI esgotados — adicione créditos em Settings → Workspace → Usage"
          : msg,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const total = (pendingCount || 0) + (doneCount || 0);
  const progressPercent = total > 0 ? Math.round(((doneCount || 0) / total) * 100) : 0;
  const estimatedCost = ((pendingCount || 0) * 0.003).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Regenerar Imagens (SVG)
          </CardTitle>
          <CardDescription>
            Gera imagens únicas via Lovable AI Gateway usando os times da partida, cores e
            ângulo de cena variável por artigo. ~$0.003/imagem (~26x mais barato que DALL·E 3).
            Sem logos, sem texto, sem repetir cena.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Já regeneradas" value={doneCount} loading={countLoading} accent="success" />
        <StatBox label="Pendentes" value={pendingCount} loading={countLoading} accent="warning" />
        <StatBox label="Progresso" value={`${progressPercent}%`} loading={countLoading} />
        <StatBox label="Custo estimado restante" value={`~$${estimatedCost}`} loading={countLoading} />
      </div>

      {/* Action */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Executar próximo lote</CardTitle>
          <CardDescription>
            Cada execução processa N artigos mais recentes que ainda não foram corrigidos.
            Recomendado: 5 por vez para acompanhar o resultado visualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="batch">Tamanho do lote (1-10)</Label>
              <Input
                id="batch"
                type="number"
                min={1}
                max={10}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
                className="w-24"
                disabled={running}
              />
            </div>
            <Button onClick={runBatch} disabled={running || !pendingCount} className="gap-2">
              {running ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gerando {batchSize} imagens...</>
              ) : (
                <><Play className="h-4 w-4" /> Processar {batchSize} agora</>
              )}
            </Button>
            {pending !== null && (
              <Badge variant="outline">{pending} ainda pendentes</Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Custo deste lote: ~${(batchSize * 0.003).toFixed(3)} • Tempo aprox: {batchSize * 4}s
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado do último lote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((r) => (
                <Card key={r.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {r.success && r.imagem_url ? (
                      <img
                        src={r.imagem_url}
                        alt={r.titulo}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-destructive">
                        <XCircle className="h-8 w-8" />
                      </div>
                    )}
                    <Badge
                      variant={r.success ? "default" : "destructive"}
                      className="absolute top-1 right-1 text-[10px]"
                    >
                      {r.success ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> OK</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> ERRO</>
                      )}
                    </Badge>
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs font-medium line-clamp-2">{r.titulo}</p>
                    {r.matchup && (
                      <p className="text-[11px] text-muted-foreground">{r.matchup}</p>
                    )}
                    {!r.success && r.error && (
                      <p className="text-[11px] text-destructive line-clamp-2">{r.error}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  loading,
  accent,
}: {
  label: string;
  value: number | string | undefined;
  loading: boolean;
  accent?: "success" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-muted animate-pulse rounded" />
        ) : (
          <p
            className={`text-2xl font-bold ${
              accent === "success"
                ? "text-green-600"
                : accent === "warning"
                ? "text-yellow-600"
                : "text-foreground"
            }`}
          >
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value ?? 0}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
