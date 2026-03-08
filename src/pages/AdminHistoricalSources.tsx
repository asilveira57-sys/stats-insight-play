import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Download, RefreshCw, Globe, Link2, Clock, CheckCircle, XCircle, AlertTriangle,
  Loader2, FileText, Eye, Trash2, Cpu, GitMerge, ArrowUpCircle, Zap, Database, Search, Play,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

// ─── Hooks ─────────────────────────────────────────
function useSources() {
  return useQuery({
    queryKey: ["historical-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historical_sources")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

function useSourceUrls(sourceId: string | null) {
  return useQuery({
    queryKey: ["historical-source-urls", sourceId],
    queryFn: async () => {
      if (!sourceId) return [];
      return fetchAllRecords(
        "historical_source_urls",
        "*",
        (q: any) => q.eq("source_id", sourceId),
        { column: "created_at", ascending: false }
      );
    },
    enabled: !!sourceId,
  });
}

function useJobs() {
  return useQuery({
    queryKey: ["historical-import-jobs"],
    queryFn: async () => {
      return fetchAllRecords<any>(
        "historical_import_jobs",
        "*, source_url:historical_source_urls(url)",
        undefined,
        { column: "created_at", ascending: false }
      );
    },
    refetchInterval: 5000,
  });
}

function useLogs(jobId: string | null) {
  return useQuery({
    queryKey: ["historical-import-logs", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("historical_import_logs")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });
}

function useStagingMatches(sourceUrlId: string | null) {
  return useQuery({
    queryKey: ["historical-staging", sourceUrlId],
    queryFn: async () => {
      if (!sourceUrlId) return [];
      return fetchAllRecords<any>(
        "historical_staging_matches",
        "*",
        (q: any) => q.eq("source_url_id", sourceUrlId),
        { column: "created_at", ascending: true }
      );
    },
    enabled: !!sourceUrlId,
    refetchInterval: 10000,
  });
}

function useBatchPipelineJobs(sourceId: string | null) {
  return useQuery({
    queryKey: ["historical-batch-jobs", sourceId],
    enabled: !!sourceId,
    queryFn: async () => {
      return fetchAllRecords<any>(
        "background_jobs",
        "id, status, progress, created_at, updated_at",
        (q: any) => q.eq("job_type", "historical_batch_pipeline").contains("progress", { source_id: sourceId }),
        { column: "updated_at", ascending: false }
      );
    },
    refetchInterval: 3000,
  });
}

// ─── Status Badge ──────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    success: { variant: "default", icon: CheckCircle },
    completed: { variant: "default", icon: CheckCircle },
    unchanged: { variant: "secondary", icon: RefreshCw },
    running: { variant: "outline", icon: Loader2 },
    pending: { variant: "outline", icon: Clock },
    failed: { variant: "destructive", icon: XCircle },
    error: { variant: "destructive", icon: XCircle },
    parsed: { variant: "secondary", icon: Cpu },
    resolved: { variant: "default", icon: GitMerge },
    conflict: { variant: "destructive", icon: AlertTriangle },
    promoted: { variant: "default", icon: ArrowUpCircle },
    skipped: { variant: "secondary", icon: XCircle },
    idle: { variant: "outline", icon: Clock },
    conflicts: { variant: "destructive", icon: AlertTriangle },
  };
  const v = variants[status] || { variant: "secondary" as const, icon: AlertTriangle };
  const Icon = v.icon;
  return (
    <Badge variant={v.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {status}
    </Badge>
  );
}

// ─── Pipeline Status ───────────────────────────────
function PipelineStatus({ url }: { url: any }) {
  const status = url.pipeline_status || 'idle';
  const steps = [
    { key: 'fetched', label: 'Coletado', done: !!url.last_fetched_at },
    { key: 'parsed', label: 'Parseado', done: !!url.last_parsed_at },
    { key: 'resolved', label: 'Resolvido', done: !!url.last_resolved_at },
    { key: 'promoted', label: 'Promovido', done: !!url.last_promoted_at },
  ];
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${s.done ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
          <span className={`text-[10px] ${s.done ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
          {i < steps.length - 1 && <span className="text-muted-foreground/30 text-[10px]">→</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────
export default function AdminHistoricalSources() {
  const queryClient = useQueryClient();
  const { data: sources = [], isLoading: loadingSources } = useSources();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const { data: urls = [] } = useSourceUrls(selectedSource);
  const { data: jobs = [] } = useJobs();
  const { data: batchJobs = [] } = useBatchPipelineJobs(selectedSource);
  const latestBatchJob = batchJobs[0];
  const latestBatchProgress = latestBatchJob?.progress || {};
  const [viewLogsJobId, setViewLogsJobId] = useState<string | null>(null);
  const { data: logs = [] } = useLogs(viewLogsJobId);
  const [viewStagingUrlId, setViewStagingUrlId] = useState<string | null>(null);
  const { data: stagingMatches = [] } = useStagingMatches(viewStagingUrlId);
  const [activeTab, setActiveTab] = useState("sources");

  // ── Modals state ──
  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", provider_name: "rsssf", source_type: "website", country: "", confederation: "", scope: "", priority: 100, notes: "" });
  const [newUrl, setNewUrl] = useState({ url: "", url_type: "results", language: "pt", season_label: "", country: "" });

  // ── Mutations ──
  const createSource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("historical_sources").insert(newSource);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historical-sources"] });
      toast.success("Fonte criada com sucesso");
      setShowAddSource(false);
      setNewSource({ name: "", provider_name: "rsssf", source_type: "website", country: "", confederation: "", scope: "", priority: 100, notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createUrl = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("historical_source_urls").insert({ ...newUrl, source_id: selectedSource });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historical-source-urls"] });
      toast.success("URL adicionada");
      setShowAddUrl(false);
      setNewUrl({ url: "", url_type: "results", language: "pt", season_label: "", country: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fetchUrl = useMutation({
    mutationFn: async (sourceUrlId: string) => {
      const { data, error } = await supabase.functions.invoke("historical-fetch", {
        body: { source_url_id: sourceUrlId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["historical-source-urls"] });
      queryClient.invalidateQueries({ queryKey: ["historical-import-jobs"] });
      if (data?.status === "unchanged") {
        toast.info("Conteúdo não mudou desde última coleta");
      } else {
        toast.success(`Coleta concluída: ${data?.raw_length} bytes em ${data?.duration_ms}ms`);
      }
    },
    onError: (e: any) => toast.error(`Falha na coleta: ${e.message}`),
  });

  const parseUrl = useMutation({
    mutationFn: async (sourceUrlId: string) => {
      const { data, error } = await supabase.functions.invoke("historical-parse", {
        body: { source_url_id: sourceUrlId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["historical-source-urls"] });
      queryClient.invalidateQueries({ queryKey: ["historical-import-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["historical-staging"] });
      toast.success(`Parse concluído: ${data?.matches_parsed} partidas extraídas`);
    },
    onError: (e: any) => toast.error(`Falha no parse: ${e.message}`),
  });

  const resolveUrl = useMutation({
    mutationFn: async (sourceUrlId: string) => {
      const { data, error } = await supabase.functions.invoke("historical-resolve", {
        body: { source_url_id: sourceUrlId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["historical-source-urls"] });
      queryClient.invalidateQueries({ queryKey: ["historical-import-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["historical-staging"] });
      toast.success(`Resolução: ${data?.resolved} resolvidas, ${data?.conflicts} conflitos`);
    },
    onError: (e: any) => toast.error(`Falha na resolução: ${e.message}`),
  });

  const promoteUrl = useMutation({
    mutationFn: async ({ sourceUrlId, dryRun = false }: { sourceUrlId: string; dryRun?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("historical-promote", {
        body: { source_url_id: sourceUrlId, dry_run: dryRun },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["historical-source-urls"] });
      queryClient.invalidateQueries({ queryKey: ["historical-import-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["historical-staging"] });
      const prefix = data?.dry_run ? "[DRY RUN] " : "";
      toast.success(`${prefix}Promoção: ${data?.promoted} promovidas, ${data?.duplicates} duplicatas, ${data?.skipped} ignoradas`);
    },
    onError: (e: any) => toast.error(`Falha na promoção: ${e.message}`),
  });

  const runFullPipeline = useMutation({
    mutationFn: async (sourceUrlId: string) => {
      toast.info("Pipeline completo iniciado: Fetch → Parse → Resolve → Promote");
      
      // Step 1: Fetch
      const { data: fetchData, error: fetchErr } = await supabase.functions.invoke("historical-fetch", {
        body: { source_url_id: sourceUrlId },
      });
      if (fetchErr) throw new Error(`Fetch: ${fetchErr.message}`);
      
      // Step 2: Parse
      const { data: parseData, error: parseErr } = await supabase.functions.invoke("historical-parse", {
        body: { source_url_id: sourceUrlId },
      });
      if (parseErr) throw new Error(`Parse: ${parseErr.message}`);
      
      // Step 3: Resolve
      const { data: resolveData, error: resolveErr } = await supabase.functions.invoke("historical-resolve", {
        body: { source_url_id: sourceUrlId },
      });
      if (resolveErr) throw new Error(`Resolve: ${resolveErr.message}`);
      
      // Step 4: Promote
      const { data: promoteData, error: promoteErr } = await supabase.functions.invoke("historical-promote", {
        body: { source_url_id: sourceUrlId },
      });
      if (promoteErr) throw new Error(`Promote: ${promoteErr.message}`);
      
      return { fetchData, parseData, resolveData, promoteData };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["historical-source-urls"] });
      queryClient.invalidateQueries({ queryKey: ["historical-import-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["historical-staging"] });
      const p = data.promoteData;
      toast.success(`Pipeline completo! ${p?.promoted || 0} partidas importadas para produção`);
    },
    onError: (e: any) => toast.error(`Pipeline falhou: ${e.message}`),
  });

  const toggleSource = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("historical_sources").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["historical-sources"] }),
  });

  // ── Auto-discover URLs ──
  const [autodiscoverUrl, setAutodiscoverUrl] = useState("");
  const [showAutodiscover, setShowAutodiscover] = useState(false);
  const autodiscover = useMutation({
    mutationFn: async () => {
      if (!selectedSource || !autodiscoverUrl) throw new Error("Selecione uma fonte e informe a URL índice");
      const { data, error } = await supabase.functions.invoke("historical-autodiscover", {
        body: { source_id: selectedSource, index_url: autodiscoverUrl },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["historical-source-urls"] });
      toast.success(`Auto-descoberta: ${data?.inserted} URLs novas inseridas (${data?.already_registered} já existiam)`);
      setShowAutodiscover(false);
    },
    onError: (e: any) => toast.error(`Falha na auto-descoberta: ${e.message}`),
  });

  // ── Batch Pipeline ──
  const [batchSize, setBatchSize] = useState(5);
  const batchPipeline = useMutation({
    mutationFn: async () => {
      if (!selectedSource) throw new Error("Selecione uma fonte");
      const { data, error } = await supabase.functions.invoke("historical-batch-pipeline", {
        body: { source_id: selectedSource, batch_size: batchSize },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["historical-source-urls"] });
      queryClient.invalidateQueries({ queryKey: ["historical-import-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["historical-staging"] });
      toast.success(`Pipeline em lote: ${data?.processed}/${data?.needs_work} processadas, ${data?.errors} erros (${(data?.duration_ms / 1000).toFixed(1)}s)`);
    },
    onError: (e: any) => toast.error(`Pipeline em lote falhou: ${e.message}`),
  });

  const isAnyPending = fetchUrl.isPending || parseUrl.isPending || resolveUrl.isPending || promoteUrl.isPending || runFullPipeline.isPending || autodiscover.isPending || batchPipeline.isPending;

  // ── KPIs ──
  const totalSources = sources.length;
  const activeSources = sources.filter((s: any) => s.is_active).length;
  const totalUrls = urls.length;
  const recentJobs = jobs.filter((j: any) => j.status === "completed").length;

  // Staging stats
  const stagingStats = {
    total: stagingMatches.length,
    parsed: stagingMatches.filter((m: any) => m.status === 'parsed').length,
    resolved: stagingMatches.filter((m: any) => m.status === 'resolved').length,
    conflict: stagingMatches.filter((m: any) => m.status === 'conflict').length,
    promoted: stagingMatches.filter((m: any) => m.status === 'promoted').length,
    skipped: stagingMatches.filter((m: any) => m.status === 'skipped').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fontes Históricas</h1>
            <p className="text-muted-foreground">Motor de importação: Fetch → Parse → Resolve → Promote</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalSources}</p>
            <p className="text-xs text-muted-foreground">Fontes</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{activeSources}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalUrls}</p>
            <p className="text-xs text-muted-foreground">URLs (fonte selecionada)</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent-foreground">{recentJobs}</p>
            <p className="text-xs text-muted-foreground">Jobs concluídos</p>
          </CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sources"><Globe className="h-4 w-4 mr-1" /> Fontes</TabsTrigger>
            <TabsTrigger value="urls" disabled={!selectedSource}><Link2 className="h-4 w-4 mr-1" /> URLs & Pipeline</TabsTrigger>
            <TabsTrigger value="staging" disabled={!viewStagingUrlId}><Database className="h-4 w-4 mr-1" /> Staging</TabsTrigger>
            <TabsTrigger value="jobs"><Clock className="h-4 w-4 mr-1" /> Jobs</TabsTrigger>
          </TabsList>

          {/* ── FONTES TAB ── */}
          <TabsContent value="sources" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showAddSource} onOpenChange={setShowAddSource}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Fonte</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Cadastrar Fonte Histórica</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Nome da fonte (ex: RSSSF Brasil)" value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newSource.provider_name} onValueChange={(v) => setNewSource({ ...newSource, provider_name: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rsssf">RSSSF</SelectItem>
                          <SelectItem value="openfootball">OpenFootball</SelectItem>
                          <SelectItem value="kaggle">Kaggle</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newSource.source_type} onValueChange={(v) => setNewSource({ ...newSource, source_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="api">API</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="País" value={newSource.country} onChange={(e) => setNewSource({ ...newSource, country: e.target.value })} />
                      <Input placeholder="Confederação (ex: CONMEBOL)" value={newSource.confederation} onChange={(e) => setNewSource({ ...newSource, confederation: e.target.value })} />
                    </div>
                    <Input placeholder="Escopo (ex: campeonatos nacionais)" value={newSource.scope} onChange={(e) => setNewSource({ ...newSource, scope: e.target.value })} />
                    <Textarea placeholder="Notas" value={newSource.notes} onChange={(e) => setNewSource({ ...newSource, notes: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button onClick={() => createSource.mutate()} disabled={!newSource.name || createSource.isPending}>
                      {createSource.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Criar Fonte
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingSources ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>País</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map((s: any) => (
                      <TableRow key={s.id} className={selectedSource === s.id ? "bg-muted/50" : ""}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell><Badge variant="outline">{s.provider_name}</Badge></TableCell>
                        <TableCell>{s.country || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? "default" : "secondary"}>
                            {s.is_active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.priority}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedSource(s.id); setActiveTab("urls"); }}>
                            <Eye className="h-3 w-3 mr-1" /> URLs
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleSource.mutate({ id: s.id, is_active: s.is_active })}>
                            {s.is_active ? "Desativar" : "Ativar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sources.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma fonte cadastrada</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* ── URLS & PIPELINE TAB ── */}
          <TabsContent value="urls" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                URLs da fonte: <strong>{sources.find((s: any) => s.id === selectedSource)?.name || "—"}</strong>
                {urls.length > 0 && <span className="ml-2 text-xs">({urls.length} URLs)</span>}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Auto-discover button */}
                <Dialog open={showAutodiscover} onOpenChange={setShowAutodiscover}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Search className="h-4 w-4" /> Auto-descobrir URLs
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Auto-descobrir URLs do RSSSF</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Cole a URL da página-índice (ex: https://rsssfbrasil.com/historical.htm). 
                        O sistema vai extrair automaticamente todos os links de temporadas e competições.
                      </p>
                      <Input 
                        placeholder="https://rsssfbrasil.com/historical.htm" 
                        value={autodiscoverUrl} 
                        onChange={(e) => setAutodiscoverUrl(e.target.value)} 
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={() => autodiscover.mutate()} disabled={!autodiscoverUrl || autodiscover.isPending}>
                        {autodiscover.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                        Descobrir e Cadastrar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Batch pipeline button */}
                <Button 
                  size="sm" 
                  variant="default" 
                  className="gap-1"
                  onClick={() => batchPipeline.mutate()} 
                  disabled={isAnyPending || urls.length === 0}
                  title={`Processar ${batchSize} URLs pendentes pelo pipeline completo`}
                >
                  {batchPipeline.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Pipeline em Lote ({batchSize})
                </Button>

                {/* Add URL manually */}
                <Dialog open={showAddUrl} onOpenChange={setShowAddUrl}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Adicionar URL</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Adicionar URL</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Input placeholder="https://rsssf.org/tablesbr/..." value={newUrl.url} onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={newUrl.url_type} onValueChange={(v) => setNewUrl({ ...newUrl, url_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="results">Resultados</SelectItem>
                            <SelectItem value="standings">Classificação</SelectItem>
                            <SelectItem value="scorers">Artilheiros</SelectItem>
                            <SelectItem value="squads">Elencos</SelectItem>
                            <SelectItem value="index">Índice</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="Temporada (ex: 2012)" value={newUrl.season_label} onChange={(e) => setNewUrl({ ...newUrl, season_label: e.target.value })} />
                      </div>
                      <Input placeholder="País" value={newUrl.country} onChange={(e) => setNewUrl({ ...newUrl, country: e.target.value })} />
                    </div>
                    <DialogFooter>
                      <Button onClick={() => createUrl.mutate()} disabled={!newUrl.url || createUrl.isPending}>
                        Adicionar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Batch pipeline progress */}
            {batchPipeline.isPending && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Pipeline em lote executando...</p>
                    <p className="text-xs text-muted-foreground">Processando {batchSize} URLs pelo pipeline completo (Fetch → Parse → Resolve → Promote)</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Temporada</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Staging</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urls.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs max-w-[250px] truncate">{u.url}</TableCell>
                      <TableCell>{u.season_label || "—"}</TableCell>
                      <TableCell><PipelineStatus url={u} /></TableCell>
                      <TableCell className="text-xs">
                        {u.staging_total ? (
                          <span>{u.staging_promoted || 0}/{u.staging_total} promovidas</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {/* Individual phase buttons */}
                          <Button size="sm" variant="outline" onClick={() => fetchUrl.mutate(u.id)} disabled={isAnyPending} title="Fase 1: Coletar HTML">
                            {fetchUrl.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => parseUrl.mutate(u.id)} disabled={isAnyPending || !u.last_fetched_at} title="Fase 2: Parsear com IA">
                            {parseUrl.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cpu className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => resolveUrl.mutate(u.id)} disabled={isAnyPending || !u.last_parsed_at} title="Fase 3: Resolver entidades">
                            {resolveUrl.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitMerge className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => promoteUrl.mutate({ sourceUrlId: u.id })} disabled={isAnyPending || !u.last_resolved_at} title="Fase 4: Promover para produção">
                            {promoteUrl.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpCircle className="h-3 w-3" />}
                          </Button>
                          
                          {/* Full pipeline button */}
                          <Button size="sm" variant="default" onClick={() => runFullPipeline.mutate(u.id)} disabled={isAnyPending} title="Pipeline completo (4 fases)">
                            {runFullPipeline.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                            Full
                          </Button>

                          {/* View staging */}
                          <Button size="sm" variant="ghost" onClick={() => { setViewStagingUrlId(u.id); setActiveTab("staging"); }} title="Ver staging">
                            <Database className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {urls.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma URL cadastrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Pipeline Legend */}
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Legenda do Pipeline:</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" /> Fetch: Coleta HTML bruto</span>
                  <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> Parse: IA extrai partidas do texto</span>
                  <span className="flex items-center gap-1"><GitMerge className="h-3 w-3" /> Resolve: Mapeia times/ligas canônicos</span>
                  <span className="flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" /> Promote: Insere em produção (com dedup)</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Full: Executa as 4 fases em sequência</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── STAGING TAB ── */}
          <TabsContent value="staging" className="space-y-4">
            {/* Staging Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Card><CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{stagingStats.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-muted-foreground">{stagingStats.parsed}</p>
                <p className="text-[10px] text-muted-foreground">Parseadas</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-primary">{stagingStats.resolved}</p>
                <p className="text-[10px] text-muted-foreground">Resolvidas</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-destructive">{stagingStats.conflict}</p>
                <p className="text-[10px] text-muted-foreground">Conflitos</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-primary">{stagingStats.promoted}</p>
                <p className="text-[10px] text-muted-foreground">Promovidas</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-muted-foreground">{stagingStats.skipped}</p>
                <p className="text-[10px] text-muted-foreground">Ignoradas</p>
              </CardContent></Card>
            </div>

            <Card>
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Casa</TableHead>
                      <TableHead>Placar</TableHead>
                      <TableHead>Fora</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Rodada</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagingMatches.map((m: any) => (
                      <TableRow key={m.id} className={m.status === 'conflict' ? 'bg-destructive/5' : m.status === 'promoted' ? 'bg-primary/5' : ''}>
                        <TableCell className="text-xs">
                          <div>{m.home_team_raw}</div>
                          {m.home_team_id && <Badge variant="outline" className="text-[9px] mt-0.5">{m.home_team_confidence}</Badge>}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {m.score_home !== null ? `${m.score_home}-${m.score_away}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{m.away_team_raw}</div>
                          {m.away_team_id && <Badge variant="outline" className="text-[9px] mt-0.5">{m.away_team_confidence}</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">{m.match_date || m.match_date_raw || "—"}</TableCell>
                        <TableCell className="text-xs">{m.round_raw || "—"}</TableCell>
                        <TableCell><StatusBadge status={m.status} /></TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">{m.resolution_notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {stagingMatches.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum registro no staging</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* ── JOBS TAB ── */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resultados</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j: any) => (
                    <TableRow key={j.id}>
                      <TableCell className="text-xs">
                        {format(new Date(j.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {j.job_type === 'fetch' && <Download className="h-3 w-3" />}
                          {j.job_type === 'parse' && <Cpu className="h-3 w-3" />}
                          {j.job_type === 'resolve' && <GitMerge className="h-3 w-3" />}
                          {(j.job_type === 'promote' || j.job_type === 'promote_dry') && <ArrowUpCircle className="h-3 w-3" />}
                          {j.job_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {(j.source_url as any)?.url || "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={j.status} /></TableCell>
                      <TableCell className="text-xs">
                        {j.total_matches_detected != null && <span>🎯 {j.total_matches_detected} </span>}
                        {j.total_promoted != null && <span>✅ {j.total_promoted} </span>}
                        {j.total_conflicts != null && j.total_conflicts > 0 && <span>⚠️ {j.total_conflicts} </span>}
                        {j.total_ignored != null && j.total_ignored > 0 && <span>⏭️ {j.total_ignored}</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {j.duration_ms ? `${(j.duration_ms / 1000).toFixed(1)}s` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setViewLogsJobId(j.id)}>
                          <FileText className="h-3 w-3 mr-1" /> Logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobs.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum job registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Logs Drawer */}
            {viewLogsJobId && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-sm">Logs do Job</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setViewLogsJobId(null)}>Fechar</Button>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-auto">
                  <div className="space-y-1">
                    {logs.map((l: any) => (
                      <div key={l.id} className={`text-xs font-mono p-2 rounded ${
                        l.level === "error" ? "bg-destructive/10 text-destructive" :
                        l.level === "warn" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        <span className="opacity-60">[{format(new Date(l.created_at), "HH:mm:ss")}]</span>{" "}
                        <span className="font-semibold">[{l.stage}]</span>{" "}
                        {l.message}
                      </div>
                    ))}
                    {logs.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Sem logs</p>}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
