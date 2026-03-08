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
  Loader2, FileText, Eye, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
      const { data, error } = await supabase
        .from("historical_source_urls")
        .select("*")
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sourceId,
  });
}

function useJobs() {
  return useQuery({
    queryKey: ["historical-import-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historical_import_jobs")
        .select("*, source_url:historical_source_urls(url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
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

// ─── Main Page ─────────────────────────────────────
export default function AdminHistoricalSources() {
  const queryClient = useQueryClient();
  const { data: sources = [], isLoading: loadingSources } = useSources();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const { data: urls = [] } = useSourceUrls(selectedSource);
  const { data: jobs = [] } = useJobs();
  const [viewLogsJobId, setViewLogsJobId] = useState<string | null>(null);
  const { data: logs = [] } = useLogs(viewLogsJobId);

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

  const toggleSource = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("historical_sources").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["historical-sources"] }),
  });

  // ── KPIs ──
  const totalSources = sources.length;
  const activeSources = sources.filter((s: any) => s.is_active).length;
  const totalUrls = urls.length;
  const recentJobs = jobs.filter((j: any) => j.status === "completed").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fontes Históricas</h1>
            <p className="text-muted-foreground">Motor de importação histórica — RSSSF e outras fontes</p>
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

        <Tabs defaultValue="sources">
          <TabsList>
            <TabsTrigger value="sources"><Globe className="h-4 w-4 mr-1" /> Fontes</TabsTrigger>
            <TabsTrigger value="urls" disabled={!selectedSource}><Link2 className="h-4 w-4 mr-1" /> URLs</TabsTrigger>
            <TabsTrigger value="jobs"><Clock className="h-4 w-4 mr-1" /> Fila de Jobs</TabsTrigger>
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
                          <Button size="sm" variant="outline" onClick={() => setSelectedSource(s.id)}>
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

          {/* ── URLS TAB ── */}
          <TabsContent value="urls" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                URLs da fonte: <strong>{sources.find((s: any) => s.id === selectedSource)?.name || "—"}</strong>
              </p>
              <Dialog open={showAddUrl} onOpenChange={setShowAddUrl}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar URL</Button>
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

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Temporada</TableHead>
                    <TableHead>Último Fetch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urls.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">{u.url}</TableCell>
                      <TableCell><Badge variant="outline">{u.url_type}</Badge></TableCell>
                      <TableCell>{u.season_label || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {u.last_fetched_at ? format(new Date(u.last_fetched_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "Nunca"}
                      </TableCell>
                      <TableCell>
                        {u.last_status ? <StatusBadge status={u.last_status} /> : <Badge variant="secondary">—</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchUrl.mutate(u.id)}
                          disabled={fetchUrl.isPending}
                        >
                          {fetchUrl.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
                          Coletar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {urls.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma URL cadastrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── JOBS TAB ── */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell><Badge variant="outline">{j.provider_name}</Badge></TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {(j.source_url as any)?.url || "—"}
                      </TableCell>
                      <TableCell>{j.job_type}</TableCell>
                      <TableCell><StatusBadge status={j.status} /></TableCell>
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
