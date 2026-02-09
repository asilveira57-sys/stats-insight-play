import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Github, FolderTree, Play, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  parseGitHubUrl,
  analyzeRepoTree,
  type DetectedCompetition,
} from "@/lib/githubImportUtils";

type WizardStep = "config" | "scanning" | "review" | "importing" | "done";

export function GitHubImportWizard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>("config");
  const [repoUrl, setRepoUrl] = useState("https://github.com/ricardo-mattoss/Brazilian-Soccer-Data");
  const [provider, setProvider] = useState("github_brazilian_soccer_data");
  const [sourceName, setSourceName] = useState("Brazilian-Soccer-Data");
  const [competitions, setCompetitions] = useState<DetectedCompetition[]>([]);
  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set());
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Check for active batches on mount
  useEffect(() => {
    const checkActive = async () => {
      const { data } = await supabase
        .from("csv_imports" as any)
        .select("id")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setActiveBatchId((data[0] as any).id);
        setStep("importing");
      }
    };
    checkActive();
  }, []);

  // Polling for active batch progress
  const { data: batchData } = useQuery({
    queryKey: ["github-import-progress", activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return null;
      const { data, error } = await supabase
        .from("csv_imports" as any)
        .select("*")
        .eq("id", activeBatchId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!activeBatchId,
    refetchInterval: activeBatchId ? 3000 : false,
  });

  // When batch completes, stop polling and show done
  useEffect(() => {
    if (batchData && (batchData.status === "completed" || batchData.status === "failed")) {
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["csv-imports"] });
    }
  }, [batchData?.status]);

  const progress = batchData?.progress_detail || {};
  const importStats = {
    inserted: batchData?.rows_inserted || progress.inserted || 0,
    updated: batchData?.rows_updated || progress.updated || 0,
    skipped: batchData?.rows_skipped || progress.skipped || 0,
    failed: batchData?.rows_failed || progress.failed || 0,
    totalFiles: progress.total_files || 0,
    processedFiles: progress.processed_files || 0,
  };
  const importProgress = importStats.totalFiles > 0
    ? Math.round((importStats.processedFiles / importStats.totalFiles) * 100)
    : 0;
  const importStatus = batchData?.status === "completed" ? "completed"
    : batchData?.status === "failed" ? "failed"
    : "running";
  const importErrors: string[] = batchData?.error_report || [];

  // Step 1: Scan repository
  const handleScan = async () => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setScanError("URL inválida. Use o formato: https://github.com/owner/repo");
      return;
    }

    setStep("scanning");
    setScanError(null);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-github-repo", {
        body: { action: "tree", owner: parsed.owner, repo: parsed.repo },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      const tree = data.tree || [];
      const detected = analyzeRepoTree(tree);

      if (detected.length === 0) {
        setScanError("Nenhuma competição detectada no repositório.");
        setStep("config");
        return;
      }

      setCompetitions(detected);
      setStep("review");
    } catch (err: any) {
      setScanError(err.message);
      setStep("config");
    }
  };

  const toggleCompetition = (path: string) => {
    setCompetitions((prev) =>
      prev.map((c) =>
        c.path === path
          ? { ...c, selected: !c.selected, seasons: c.seasons.map((s) => ({ ...s, selected: !c.selected })) }
          : c
      )
    );
  };

  const toggleSeason = (compPath: string, seasonPath: string) => {
    setCompetitions((prev) =>
      prev.map((c) =>
        c.path === compPath
          ? { ...c, seasons: c.seasons.map((s) => (s.path === seasonPath ? { ...s, selected: !s.selected } : s)) }
          : c
      )
    );
  };

  const toggleExpand = (path: string) => {
    setExpandedComps((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const totalSelectedSeasons = competitions.reduce(
    (sum, c) => sum + c.seasons.filter((s) => s.selected).length,
    0
  );

  // Step 3: Fire-and-forget import
  const handleImport = async () => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) return;

    // Collect selected files
    const selectedFiles: { path: string; leagueName: string; country: string; season: string; fileType: string }[] = [];
    for (const comp of competitions) {
      for (const season of comp.seasons) {
        if (season.selected) {
          selectedFiles.push({
            path: season.path,
            leagueName: comp.name.split(" / ").pop() || comp.name,
            country: comp.country,
            season: season.year,
            fileType: season.fileType,
          });
        }
      }
    }

    if (selectedFiles.length === 0) return;

    // Create batch record
    try {
      const { data: batch, error: batchErr } = await supabase
        .from("csv_imports" as any)
        .insert({
          user_id: user?.id || "",
          file_name: `github:${parsed.owner}/${parsed.repo}`,
          file_type: "matches",
          provider,
          total_rows: 0,
          status: "processing",
          progress_detail: { processed_files: 0, total_files: selectedFiles.length, inserted: 0, updated: 0, skipped: 0, failed: 0 },
        } as any)
        .select("id")
        .single();

      if (batchErr) throw new Error(batchErr.message);
      const batchId = (batch as any).id;
      setActiveBatchId(batchId);
      setStep("importing");

      // Fire-and-forget: invoke backend function
      supabase.functions.invoke("import-github-data", {
        body: {
          batch_id: batchId,
          owner: parsed.owner,
          repo: parsed.repo,
          provider,
          files: selectedFiles,
        },
      }).catch((err) => {
        console.error("Edge function invoke error:", err);
      });
    } catch (err: any) {
      setScanError(err.message);
      setStep("config");
    }
  };

  const handleReset = () => {
    setStep("config");
    setActiveBatchId(null);
    setCompetitions([]);
  };

  return (
    <div className="space-y-4">
      {/* Step: Config */}
      {step === "config" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" /> Configurar Fonte GitHub
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Repositório</Label>
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Fonte</Label>
                <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Ex: Brazilian-Soccer-Data" />
              </div>
              <div>
                <Label>Provider ID</Label>
                <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Ex: github_brazilian_soccer_data" />
              </div>
            </div>
            {scanError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {scanError}
              </div>
            )}
            <Button onClick={handleScan} className="w-full">
              <FolderTree className="w-4 h-4 mr-2" /> Escanear Repositório
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Scanning */}
      {step === "scanning" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Escaneando repositório...</p>
          </CardContent>
        </Card>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderTree className="w-5 h-5" /> Competições Detectadas
              </span>
              <Badge variant="secondary">
                {totalSelectedSeasons} temporada(s) selecionada(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {competitions.map((comp) => (
              <div key={comp.path} className="border rounded-lg">
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(comp.path)}
                >
                  {expandedComps.has(comp.path) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Checkbox
                    checked={comp.selected}
                    onCheckedChange={() => toggleCompetition(comp.path)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{comp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {comp.country} · {comp.seasons.length} temporada(s)
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {comp.seasons.filter((s) => s.selected).length}/{comp.seasons.length}
                  </Badge>
                </div>
                {expandedComps.has(comp.path) && (
                  <div className="border-t px-3 py-2 space-y-1 bg-muted/20">
                    {comp.seasons.map((season) => (
                      <div key={season.path} className="flex items-center gap-3 text-sm py-1">
                        <Checkbox
                          checked={season.selected}
                          onCheckedChange={() => toggleSeason(comp.path, season.path)}
                        />
                        <span>{season.year}</span>
                        <Badge variant="outline" className="text-xs">
                          {season.fileType.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{season.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("config")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={totalSelectedSeasons === 0}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" /> Importar {totalSelectedSeasons} Temporada(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Importing / Done */}
      {(step === "importing" || step === "done") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importStatus === "running" && <Loader2 className="w-5 h-5 animate-spin" />}
              {importStatus === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
              {importStatus === "failed" && <XCircle className="w-5 h-5 text-destructive" />}
              {importStatus === "running"
                ? `Importando... (${importStats.processedFiles}/${importStats.totalFiles} arquivos)`
                : importStatus === "completed"
                ? "Importação Concluída!"
                : "Falha na Importação"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={importProgress} />

            {importStatus === "running" && progress.current_file && (
              <p className="text-xs text-muted-foreground truncate">
                📄 {progress.current_file}
              </p>
            )}

            {importStatus === "running" && (
              <p className="text-xs text-muted-foreground">
                ⚡ Processando em background — você pode navegar livremente.
              </p>
            )}

            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <p className="text-xl font-bold text-green-500">{importStats.inserted}</p>
                <p className="text-xs text-muted-foreground">Inseridos</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                <p className="text-xl font-bold text-blue-500">{importStats.updated}</p>
                <p className="text-xs text-muted-foreground">Existentes</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xl font-bold">{importStats.skipped}</p>
                <p className="text-xs text-muted-foreground">Ignorados</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 text-center">
                <p className="text-xl font-bold text-destructive">{importStats.failed}</p>
                <p className="text-xs text-muted-foreground">Falhas</p>
              </div>
            </div>

            {importErrors.length > 0 && (
              <div className="max-h-40 overflow-auto border rounded p-2 text-xs text-muted-foreground">
                {importErrors.slice(0, 50).map((e: string, i: number) => (
                  <p key={i}>{e}</p>
                ))}
                {importErrors.length > 50 && (
                  <p className="text-destructive">... e mais {importErrors.length - 50} erros</p>
                )}
              </div>
            )}

            {step === "done" && (
              <Button onClick={handleReset} className="w-full">
                Nova Importação
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
