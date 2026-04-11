import { useState, useEffect } from "react";
import { KaggleAutoImportTab } from "@/components/admin/kaggle/KaggleAutoImportTab";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKaggleData } from "@/hooks/useKaggleData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Database, Play, RefreshCw, FileText, AlertTriangle, CheckCircle2,
  Search, Loader2, BarChart3, Eye, Zap, ArrowRight, GitMerge,
  List, Shield, Download, Globe, FolderOpen
} from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  queued: "bg-blue-500/20 text-blue-400",
  downloading: "bg-cyan-500/20 text-cyan-400",
  extracting: "bg-purple-500/20 text-purple-400",
  profiling: "bg-indigo-500/20 text-indigo-400",
  mapping: "bg-violet-500/20 text-violet-400",
  staging: "bg-amber-500/20 text-amber-400",
  awaiting_review: "bg-orange-500/20 text-orange-400",
  completed: "bg-green-500/20 text-green-400",
  completed_with_alerts: "bg-lime-500/20 text-lime-400",
  failed: "bg-red-500/20 text-red-400",
  cancelled: "bg-gray-500/20 text-gray-400",
};

const POPULAR_FOOTBALL_QUERIES = [
  "football results",
  "soccer matches",
  "fifa world cup",
  "football statistics",
  "premier league",
  "brasileirao",
  "champions league",
  "international football",
];

interface KaggleDataset {
  ref: string;
  title: string;
  subtitle: string;
  creator: string;
  totalBytes: number;
  lastUpdated: string;
  downloadCount: number;
  voteCount: number;
  url: string;
}

interface KaggleFile {
  name: string;
  totalBytes: number;
  columns: number;
  description: string;
}

export default function AdminKaggle() {
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("football results");
  const [searchResults, setSearchResults] = useState<KaggleDataset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDatasetSlug, setSelectedDatasetSlug] = useState<string | null>(null);
  const [selectedDatasetTitle, setSelectedDatasetTitle] = useState("");
  const [datasetFiles, setDatasetFiles] = useState<KaggleFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [fileImportStatuses, setFileImportStatuses] = useState<Record<string, { status: string; created_at: string }>>({});
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const {
    datasets, jobs, stats, resolutionQueue,
    useDatasetFiles, useStagingMatches, useStagingTeams, useJobLogs, useColumnMappings,
    registerDataset, registerFiles, createJob, uploadRaw,
    profileFile, stageData, resolveJob, promoteJob, batchProcess,
  } = useKaggleData();

  const files = useDatasetFiles(selectedDataset);
  const stagingMatches = useStagingMatches(selectedJob);
  const stagingTeams = useStagingTeams(selectedJob);
  const jobLogs = useJobLogs(selectedJob);
  const columnMappings = useColumnMappings(selectedFileId);

  const s = stats.data;
  const isLoading = registerDataset.isPending || createJob.isPending || profileFile.isPending || stageData.isPending || resolveJob.isPending || promoteJob.isPending || batchProcess.isPending;

  // Auto-polling: refresh jobs every 8s when there are active jobs
  const hasActiveJobs = (jobs.data || []).some((j: any) => 
    ["pending", "downloading", "extracting", "profiling", "mapping", "staging"].includes(j.status)
  );
  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = setInterval(() => {
      jobs.refetch();
      stats.refetch();
    }, 8000);
    return () => clearInterval(interval);
  }, [hasActiveJobs]);

  const getInvokeErrorMessage = async (e: any, fallback = "Falha ao chamar a função") => {
    try {
      if (e?.context && typeof e.context.json === "function") {
        const payload = await e.context.json();
        if (payload?.error) return payload.error;
        if (payload?.details) return payload.details;
      }
    } catch {
      // ignore parse errors
    }

    return e?.message || fallback;
  };

  // Search Kaggle datasets
  const handleSearch = async (query?: string) => {
    const q = query || searchQuery;
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("kaggle-import", {
        body: { action: "search_datasets", query: q },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.error || "Busca falhou");
      if (data?.datasets) {
        setSearchResults(data.datasets);
        toast.success(`${data.datasets.length} datasets encontrados`);
      }
    } catch (e: any) {
      toast.error(`Erro na busca: ${await getInvokeErrorMessage(e, "Falha ao buscar datasets")}`);
    } finally {
      setIsSearching(false);
    }
  };

  // List files of a dataset
  const handleListFiles = async (datasetSlug: string, title: string) => {
    setSelectedDatasetSlug(datasetSlug);
    setSelectedDatasetTitle(title);
    setIsLoadingFiles(true);
    setFilesDialogOpen(true);
    setFileImportStatuses({});
    try {
      const { data, error } = await supabase.functions.invoke("kaggle-import", {
        body: { action: "list_dataset_files", dataset_slug: datasetSlug },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.error || "Listagem de arquivos falhou");
      setDatasetFiles(data?.files || []);

      // Fetch import statuses for this dataset's files
      try {
        const { data: statusData } = await supabase
          .from("kaggle_import_jobs")
          .select("status, created_at, kaggle_dataset_files!inner(file_name, kaggle_datasets!inner(dataset_slug))")
          .eq("kaggle_dataset_files.kaggle_datasets.dataset_slug", datasetSlug)
          .order("created_at", { ascending: false });

        if (statusData && statusData.length > 0) {
          const statusMap: Record<string, { status: string; created_at: string }> = {};
          for (const row of statusData) {
            const fileName = (row as any).kaggle_dataset_files?.file_name;
            if (fileName && !statusMap[fileName]) {
              statusMap[fileName] = { status: row.status, created_at: row.created_at };
            }
          }
          setFileImportStatuses(statusMap);
        }
      } catch {
        // Non-critical: just don't show statuses
      }
    } catch (e: any) {
      toast.error(`Erro ao listar arquivos: ${await getInvokeErrorMessage(e, "Falha ao listar arquivos")}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Quick import a file + auto-process full pipeline
  const handleQuickImport = async (fileName: string) => {
    if (!selectedDatasetSlug) return;
    setIsImporting(fileName);
    try {
      // Step 1: Download
      toast.info(`⬇️ Baixando ${fileName}...`);
      const { data, error } = await supabase.functions.invoke("kaggle-import", {
        body: {
          action: "quick_import",
          dataset_slug: selectedDatasetSlug,
          dataset_title: selectedDatasetTitle,
          file_name: fileName,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Download falhou");

      const jobId = data.job_id;
      toast.success(`✅ Download OK: ${data.rows} linhas. Processando...`);

      // Step 2: Profile
      toast.info("📊 Profiling arquivo...");
      const { data: profileData, error: profErr } = await supabase.functions.invoke("kaggle-process", {
        body: { action: "profile", job_id: jobId },
      });
      if (profErr) throw profErr;
      if (profileData?.success === false) throw new Error(profileData?.error || "Profiling falhou");

      // Step 3: Stage
      toast.info("📦 Staging dados...");
      const { data: stageDataResp, error: stageErr } = await supabase.functions.invoke("kaggle-process", {
        body: { action: "stage", job_id: jobId },
      });
      if (stageErr) throw stageErr;
      if (stageDataResp?.success === false) throw new Error(stageDataResp?.error || "Staging falhou");

      // Step 4: Resolve (auto-creates teams & leagues) - loop until complete
      toast.info("🔗 Resolvendo times, ligas e partidas...");
      let resolveData: any = null;
      let resolvePass = 0;
      const MAX_RESOLVE_PASSES = 20;
      while (resolvePass < MAX_RESOLVE_PASSES) {
        resolvePass++;
        const { data: rd, error: resolveErr } = await supabase.functions.invoke("kaggle-resolve", {
          body: { job_id: jobId },
        });
        if (resolveErr) throw resolveErr;
        if (rd?.success === false) throw new Error(rd?.error || "Resolução falhou");
        resolveData = rd;
        
        if (rd?.complete) {
          toast.success(`✅ Resolução completa em ${resolvePass} passada(s)`);
          break;
        }
        
        const pending = rd?.pending;
        toast.info(`🔄 Passada ${resolvePass}: ${pending?.teams || 0} times, ${pending?.competitions || 0} ligas, ${pending?.matches || 0} partidas pendentes...`);
      }
      if (!resolveData?.complete) {
        toast.warning("⚠️ Resolução não completou em todas as passadas — promovendo o que foi resolvido");
      }

      // Step 5: Promote
      toast.info("🚀 Promovendo para produção...");
      const { data: promoteData, error: promoteErr } = await supabase.functions.invoke("kaggle-promote", {
        body: { job_id: jobId, promote_mode: "all_resolved" },
      });
      if (promoteErr) throw promoteErr;
      if (promoteData?.success === false) throw new Error(promoteData?.error || "Promoção falhou");

      const rTeams = resolveData?.teams;
      const promoted = promoteData?.promoted || 0;
      const updated = promoteData?.updated || 0;
      toast.success(
        `✅ Pipeline completo! ${promoted} novas partidas, ${updated} atualizadas. ` +
        `Times: ${rTeams?.resolved || 0} (${rTeams?.created || 0} novos). ` +
        `Ligas: ${resolveData?.competitions?.created || 0} novas.`
      );

      jobs.refetch();
      datasets.refetch();
      stats.refetch();
    } catch (e: any) {
      toast.error(`Erro: ${await getInvokeErrorMessage(e, "Falha no pipeline Kaggle")}`);
    } finally {
      setIsImporting(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kaggle Import</h1>
            <p className="text-sm text-muted-foreground">Busque e importe datasets de futebol do Kaggle com um clique</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => batchProcess.mutate({ action: "process_pending", batch_size: 5 })} disabled={isLoading}>
              {batchProcess.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
              Processar Pendentes
            </Button>
            <Button size="sm" variant="outline" onClick={() => batchProcess.mutate({ action: "batch_promote", batch_size: 5 })} disabled={isLoading}>
              <ArrowRight className="h-4 w-4 mr-1" />
              Promover Batch
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Datasets", value: s?.totalDatasets || 0, icon: Database },
            { label: "Arquivos", value: s?.totalFiles || 0, icon: FileText },
            { label: "Staging", value: s?.totalStagingMatches || 0, icon: BarChart3 },
            { label: "Conflitos", value: s?.pendingConflicts || 0, icon: AlertTriangle },
            { label: "Revisão", value: s?.pendingResolution || 0, icon: Eye },
          ].map(card => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <span className="text-2xl font-bold">{card.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="search"><Search className="h-3 w-3 mr-1" />Buscar</TabsTrigger>
            <TabsTrigger value="imported"><Database className="h-3 w-3 mr-1" />Importados</TabsTrigger>
            <TabsTrigger value="jobs"><List className="h-3 w-3 mr-1" />Jobs</TabsTrigger>
            <TabsTrigger value="staging"><Eye className="h-3 w-3 mr-1" />Staging</TabsTrigger>
            <TabsTrigger value="resolution"><GitMerge className="h-3 w-3 mr-1" />Resolução</TabsTrigger>
            <TabsTrigger value="logs"><Shield className="h-3 w-3 mr-1" />Logs</TabsTrigger>
          </TabsList>

          {/* SEARCH TAB */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="h-5 w-5" />Buscar Datasets no Kaggle</CardTitle>
                <CardDescription>Busque datasets de futebol e importe arquivos diretamente com um clique</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Ex: football results, soccer matches..."
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={() => handleSearch()} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                    Buscar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {POPULAR_FOOTBALL_QUERIES.map(q => (
                    <Button key={q} size="sm" variant="outline" onClick={() => { setSearchQuery(q); handleSearch(q); }} className="text-xs">
                      {q}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">{searchResults.length} resultados</h3>
                {searchResults.map(ds => (
                  <Card key={ds.ref} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{ds.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ds.subtitle}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>👤 {ds.creator}</span>
                            <span>📦 {formatBytes(ds.totalBytes)}</span>
                            <span>⬇️ {ds.downloadCount?.toLocaleString()}</span>
                            <span>👍 {ds.voteCount}</span>
                          </div>
                          <code className="text-xs text-muted-foreground/60 mt-1 block">{ds.ref}</code>
                        </div>
                        <Button size="sm" onClick={() => handleListFiles(ds.ref, ds.title)}>
                          <FolderOpen className="h-4 w-4 mr-1" />
                          Ver Arquivos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Files Dialog */}
            <Dialog open={filesDialogOpen} onOpenChange={setFilesDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-base">Arquivos de: {selectedDatasetTitle}</DialogTitle>
                </DialogHeader>
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando arquivos...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {datasetFiles.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum arquivo encontrado</p>
                    )}
                    {datasetFiles.map(f => {
                      const importStatus = fileImportStatuses[f.name];
                      const isCompleted = importStatus?.status === 'completed' || importStatus?.status === 'completed_with_alerts';
                      const isInProgress = importStatus && ['pending', 'queued', 'downloading', 'extracting', 'profiling', 'mapping', 'staging'].includes(importStatus.status);
                      const isFailed = importStatus?.status === 'failed';
                      const isAwaitingReview = importStatus?.status === 'awaiting_review';

                      return (
                        <div key={f.name} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm font-medium truncate">{f.name}</p>
                              {isCompleted && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" />Importado
                                </Badge>
                              )}
                              {isInProgress && (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">
                                  <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />Em andamento
                                </Badge>
                              )}
                              {isAwaitingReview && (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] px-1.5 py-0">
                                  <AlertTriangle className="h-3 w-3 mr-0.5" />Revisão
                                </Badge>
                              )}
                              {isFailed && (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0">
                                  <AlertTriangle className="h-3 w-3 mr-0.5" />Falhou
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                              <span>{formatBytes(f.totalBytes)}</span>
                              {f.columns > 0 && <span>{f.columns} colunas</span>}
                              {importStatus && (
                                <span className="text-muted-foreground/60">
                                  Último: {new Date(importStatus.created_at).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={isCompleted ? "outline" : "default"}
                            onClick={() => handleQuickImport(f.name)}
                            disabled={isImporting === f.name || !!isInProgress}
                          >
                            {isImporting === f.name ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
                            {isCompleted ? "Reimportar" : "Importar"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* IMPORTED DATASETS */}
          <TabsContent value="imported" className="space-y-4">
            <h2 className="text-lg font-semibold">Datasets Importados</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(datasets.data || []).map((ds: any) => (
                  <TableRow key={ds.id}>
                    <TableCell className="font-medium">{ds.dataset_title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{ds.dataset_slug}</TableCell>
                    <TableCell><Badge variant="outline">{ds.dataset_category || "—"}</Badge></TableCell>
                    <TableCell>
                      <Badge className={ds.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {ds.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedDataset(ds.id); setActiveTab("jobs"); }}>
                        <FolderOpen className="h-3 w-3 mr-1" />Jobs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!datasets.data?.length && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum dataset importado ainda. Use a aba "Buscar" para começar.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* JOBS */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Fila de Jobs</h2>
              <Button size="sm" variant="outline" onClick={() => jobs.refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />Atualizar
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linhas</TableHead>
                  <TableHead>Staged</TableHead>
                  <TableHead>Promovidos</TableHead>
                  <TableHead>Erros</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(jobs.data || []).map((j: any) => (
                  <TableRow key={j.id}>
                    <TableCell className="text-xs max-w-32 truncate">{j.kaggle_datasets?.dataset_title || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{j.kaggle_dataset_files?.file_name || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[j.status] || "bg-muted"}>{j.status}</Badge>
                      {j.error_summary && (
                        <p className="text-[10px] text-destructive mt-1 max-w-48 truncate" title={j.error_summary}>⚠️ {j.error_summary}</p>
                      )}
                    </TableCell>
                    <TableCell>{j.total_rows_read || 0}</TableCell>
                    <TableCell>{j.total_rows_staged || 0}</TableCell>
                    <TableCell>{j.total_promoted || 0}</TableCell>
                    <TableCell className={j.total_errors > 0 ? "text-destructive font-bold" : ""}>{j.total_errors || 0}</TableCell>
                    <TableCell className="flex gap-1 flex-wrap">
                      {["pending", "extracting"].includes(j.status) && (
                        <Button size="sm" variant="ghost" onClick={() => profileFile.mutate(j.id)} disabled={isLoading} title="Profile">
                          <FileText className="h-3 w-3" />
                        </Button>
                      )}
                      {["mapping", "profiling"].includes(j.status) && (
                        <Button size="sm" variant="ghost" onClick={() => stageData.mutate(j.id)} disabled={isLoading} title="Stage">
                          <Database className="h-3 w-3" />
                        </Button>
                      )}
                      {["staging", "awaiting_review"].includes(j.status) && (
                        <Button size="sm" variant="ghost" onClick={() => resolveJob.mutate(j.id)} disabled={isLoading} title="Resolve">
                          <GitMerge className="h-3 w-3" />
                        </Button>
                      )}
                      {j.status === "awaiting_review" && (
                        <Button size="sm" variant="ghost" onClick={() => promoteJob.mutate({ job_id: j.id })} disabled={isLoading} title="Promote">
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedJob(j.id); setActiveTab("staging"); }} title="Ver staging">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedJob(j.id); setActiveTab("logs"); }} title="Ver logs">
                        <Shield className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!jobs.data?.length && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum job. Importe um dataset pela aba "Buscar".</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* STAGING */}
          <TabsContent value="staging" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedJob || ""} onValueChange={setSelectedJob}>
                <SelectTrigger className="w-80"><SelectValue placeholder="Selecionar job..." /></SelectTrigger>
                <SelectContent>
                  {(jobs.data || []).map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>{j.kaggle_datasets?.dataset_title} - {j.status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedJob && (
              <Tabs defaultValue="matches">
                <TabsList>
                  <TabsTrigger value="matches">Partidas ({stagingMatches.data?.length || 0})</TabsTrigger>
                  <TabsTrigger value="teams">Times ({stagingTeams.data?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="matches">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Casa</TableHead>
                          <TableHead>Placar</TableHead>
                          <TableHead>Fora</TableHead>
                          <TableHead>Competição</TableHead>
                          <TableHead>Dedupe</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(stagingMatches.data || []).map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs">{m.parsed_date || m.raw_date_text}</TableCell>
                            <TableCell className="text-xs">{m.raw_home_team}</TableCell>
                            <TableCell className="text-xs font-bold">{m.parsed_home_score ?? "?"} x {m.parsed_away_score ?? "?"}</TableCell>
                            <TableCell className="text-xs">{m.raw_away_team}</TableCell>
                            <TableCell className="text-xs">{m.raw_competition_name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                m.dedupe_status === "exact_match" ? "text-green-400" :
                                m.dedupe_status === "probable_match" ? "text-yellow-400" :
                                m.dedupe_status === "new_record" ? "text-blue-400" : ""
                              }>
                                {m.dedupe_status || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell><Badge className={statusColors[m.resolution_status] || "bg-muted"}>{m.resolution_status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="teams">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome Original</TableHead>
                        <TableHead>Normalizado</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Vinculado</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(stagingTeams.data || []).map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.raw_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.normalized_name}</TableCell>
                          <TableCell className="font-mono text-xs">{t.inferred_slug}</TableCell>
                          <TableCell>{t.matched_team_id ? "✅" : "❌"}</TableCell>
                          <TableCell>
                            <Badge className={
                              t.resolution_status === "resolved" ? "bg-green-500/20 text-green-400" :
                              t.resolution_status === "unmatched" ? "bg-red-500/20 text-red-400" :
                              "bg-yellow-500/20 text-yellow-400"
                            }>
                              {t.resolution_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>

          {/* RESOLUTION */}
          <TabsContent value="resolution" className="space-y-4">
            <h2 className="text-lg font-semibold">Fila de Resolução ({resolutionQueue.data?.length || 0})</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(resolutionQueue.data || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.entity_type}</Badge></TableCell>
                    <TableCell>{r.issue_type}</TableCell>
                    <TableCell><Badge className={statusColors[r.status] || "bg-muted"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
                {!resolutionQueue.data?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma revisão pendente</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* LOGS */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedJob || ""} onValueChange={setSelectedJob}>
                <SelectTrigger className="w-80"><SelectValue placeholder="Selecionar job..." /></SelectTrigger>
                <SelectContent>
                  {(jobs.data || []).map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>{j.kaggle_datasets?.dataset_title} - {j.status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedJob && (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {(jobLogs.data || []).map((l: any) => (
                  <div key={l.id} className={`flex gap-2 items-start p-2 rounded text-xs font-mono ${
                    l.level === "error" ? "bg-red-500/10 text-red-400" :
                    l.level === "warn" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-muted/30"
                  }`}>
                    <span className="text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleTimeString("pt-BR")}</span>
                    <Badge variant="outline" className="text-[10px]">{l.stage}</Badge>
                    <span className="flex-1">{l.message}</span>
                  </div>
                ))}
                {!jobLogs.data?.length && (
                  <p className="text-center text-muted-foreground py-8">Nenhum log para este job</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
