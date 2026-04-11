import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, Loader2, Play, Square, CheckCircle2, AlertTriangle, Clock, Zap,
} from "lucide-react";

interface Candidate {
  dataset_slug: string;
  dataset_title: string;
  file_name: string;
  file_size: number;
  dataset_downloads: number;
  status: "waiting" | "processing" | "completed" | "failed" | "skipped";
  promoted?: number;
  error?: string;
}

export function KaggleAutoImportTab() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<string[]>([]);
  const stopRef = useRef(false);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString("pt-BR");
    setLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 200));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    setCandidates([]);
    setLogs([]);
    addLog("🔍 Iniciando descoberta de datasets...");
    try {
      const { data, error } = await supabase.functions.invoke("kaggle-autodiscover", {
        body: { max_files: 15 },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha na descoberta");

      const found: Candidate[] = data.candidates || [];
      setCandidates(found);
      const keys = new Set(found.map(c => `${c.dataset_slug}::${c.file_name}`));
      setSelected(keys);
      addLog(`✅ ${found.length} arquivos elegíveis encontrados em ${data.queries_searched} buscas`);
      toast.success(`${found.length} arquivos descobertos`);
    } catch (e: any) {
      addLog(`❌ Erro: ${e.message}`);
      toast.error(`Erro na descoberta: ${e.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleStart = useCallback(async () => {
    const filesToProcess = candidates.filter(c => selected.has(`${c.dataset_slug}::${c.file_name}`));
    if (filesToProcess.length === 0) { toast.warning("Selecione pelo menos um arquivo"); return; }

    stopRef.current = false;
    setIsRunning(true);
    addLog(`🚀 Iniciando pipeline para ${filesToProcess.length} arquivo(s)...`);

    // Process in batches of 2 to stay within timeouts
    const batchSize = 2;
    let totalPromoted = 0;
    let completedCount = 0;

    for (let i = 0; i < filesToProcess.length; i += batchSize) {
      if (stopRef.current) { addLog("🛑 Pipeline interrompido pelo usuário"); break; }

      const batch = filesToProcess.slice(i, i + batchSize);
      const batchFiles = batch.map(f => ({
        dataset_slug: f.dataset_slug,
        dataset_title: f.dataset_title,
        file_name: f.file_name,
      }));

      addLog(`📦 Processando lote ${Math.floor(i / batchSize) + 1}: ${batch.map(b => b.file_name).join(", ")}`);

      // Mark as processing
      setCandidates(prev => prev.map(c =>
        batch.some(b => b.dataset_slug === c.dataset_slug && b.file_name === c.file_name)
          ? { ...c, status: "processing" as const }
          : c
      ));

      try {
        const { data, error } = await supabase.functions.invoke("kaggle-batch", {
          body: { action: "auto_pipeline", files: batchFiles },
        });

        if (error) throw error;

        const results = data?.results || [];
        for (const r of results) {
          const status = r.status === "completed" ? "completed" : r.status === "skipped" ? "skipped" : "failed";
          setCandidates(prev => prev.map(c =>
            c.dataset_slug === r.dataset_slug && c.file_name === r.file_name
              ? { ...c, status: status as any, promoted: r.promoted, error: r.error }
              : c
          ));

          if (status === "completed") {
            completedCount++;
            totalPromoted += r.promoted || 0;
            addLog(`✅ ${r.file_name}: ${r.promoted || 0} partidas promovidas`);
          } else if (status === "failed") {
            addLog(`❌ ${r.file_name}: ${r.error || "falhou"}`);
          }
        }

        if (data?.circuit_breaker) {
          addLog("🛑 Circuit breaker ativado (402/429). Parando pipeline.");
          toast.error("Circuit breaker: sem créditos ou rate limit");
          break;
        }
      } catch (e: any) {
        addLog(`❌ Erro no lote: ${e.message}`);
        // Mark batch as failed
        setCandidates(prev => prev.map(c =>
          batch.some(b => b.dataset_slug === c.dataset_slug && b.file_name === c.file_name) && c.status === "processing"
            ? { ...c, status: "failed" as const, error: e.message }
            : c
        ));
      }

      // Brief pause between batches
      if (i + batchSize < filesToProcess.length && !stopRef.current) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    addLog(`🏁 Pipeline finalizado: ${completedCount} completos, ${totalPromoted} partidas promovidas`);
    toast.success(`Pipeline completo: ${completedCount} arquivos, ${totalPromoted} partidas`);
    setIsRunning(false);
  }, [candidates, selected]);

  const handleStop = () => {
    stopRef.current = true;
    addLog("⏸️ Solicitando parada...");
  };

  const completed = candidates.filter(c => c.status === "completed").length;
  const failed = candidates.filter(c => c.status === "failed").length;
  const processing = candidates.filter(c => c.status === "processing").length;
  const total = candidates.length;
  const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const totalPromoted = candidates.reduce((s, c) => s + (c.promoted || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5" />Auto Import
          </CardTitle>
          <CardDescription>
            Descobre e importa automaticamente datasets de futebol do Kaggle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleDiscover} disabled={isDiscovering || isRunning}>
              {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
              Descobrir Datasets
            </Button>
            {candidates.length > 0 && !isRunning && (
              <Button onClick={handleStart} disabled={selected.size === 0} variant="default">
                <Play className="h-4 w-4 mr-1" />
                Iniciar Pipeline ({selected.size})
              </Button>
            )}
            {isRunning && (
              <Button onClick={handleStop} variant="destructive">
                <Square className="h-4 w-4 mr-1" />
                Parar
              </Button>
            )}
          </div>

          {/* Progress */}
          {total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{completed} de {total} completos • {totalPromoted} partidas</span>
                {processing > 0 && <span className="text-yellow-400">{processing} processando...</span>}
                {failed > 0 && <span className="text-destructive">{failed} falhas</span>}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidates list */}
      {candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Arquivos Descobertos ({candidates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {candidates.map(c => {
                const key = `${c.dataset_slug}::${c.file_name}`;
                return (
                  <div key={key} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                    <Checkbox
                      checked={selected.has(key)}
                      onCheckedChange={() => toggleSelect(key)}
                      disabled={isRunning || c.status !== "waiting"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-medium truncate">{c.file_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.dataset_title} • {formatBytes(c.file_size)}</p>
                    </div>
                    {c.status === "waiting" && (
                      <Badge variant="outline" className="text-[10px]"><Clock className="h-3 w-3 mr-0.5" />Aguardando</Badge>
                    )}
                    {c.status === "processing" && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]"><Loader2 className="h-3 w-3 mr-0.5 animate-spin" />Processando</Badge>
                    )}
                    {c.status === "completed" && (
                      <Badge className="bg-green-500/20 text-green-400 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />{c.promoted || 0} partidas</Badge>
                    )}
                    {c.status === "failed" && (
                      <Badge className="bg-red-500/20 text-red-400 text-[10px]" title={c.error}><AlertTriangle className="h-3 w-3 mr-0.5" />Falhou</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[300px] overflow-y-auto font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className={`p-1 rounded ${
                  log.includes("❌") ? "bg-red-500/10 text-red-400" :
                  log.includes("✅") ? "bg-green-500/10 text-green-400" :
                  log.includes("🛑") ? "bg-red-500/10 text-red-300" :
                  "text-muted-foreground"
                }`}>
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
