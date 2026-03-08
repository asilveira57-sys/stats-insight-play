import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useKaggleData } from "@/hooks/useKaggleData";
import {
  Database, Upload, Play, RefreshCw, FileText, AlertTriangle, CheckCircle2,
  Clock, XCircle, Eye, Zap, ArrowRight, Loader2, BarChart3, Search,
  Plus, FolderOpen, GitMerge, List, Shield
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

export default function AdminKaggle() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [newDatasetOpen, setNewDatasetOpen] = useState(false);
  const [newDatasetForm, setNewDatasetForm] = useState({ dataset_slug: "", dataset_title: "", dataset_url: "", dataset_description: "", dataset_category: "", country_scope: "", competition_scope: "" });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFileContent, setUploadFileContent] = useState("");
  const [uploadJobId, setUploadJobId] = useState("");

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

  const handleRegisterDataset = () => {
    registerDataset.mutate(newDatasetForm);
    setNewDatasetOpen(false);
    setNewDatasetForm({ dataset_slug: "", dataset_title: "", dataset_url: "", dataset_description: "", dataset_category: "", country_scope: "", competition_scope: "" });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadFileContent(text);
  };

  const handleUploadSubmit = async () => {
    if (!uploadJobId || !uploadFileContent) return;
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(uploadFileContent));
    const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    uploadRaw.mutate({ job_id: uploadJobId, raw_text: uploadFileContent, content_hash: hash, asset_type: "csv" });
    setUploadOpen(false);
    setUploadFileContent("");
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kaggle Import</h1>
            <p className="text-sm text-muted-foreground">Integração com datasets do Kaggle</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => batchProcess.mutate({ action: "process_pending", batch_size: 3 })} disabled={isLoading}>
              {batchProcess.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
              Processar Pendentes
            </Button>
            <Button size="sm" variant="outline" onClick={() => batchProcess.mutate({ action: "batch_promote", batch_size: 5 })} disabled={isLoading}>
              <ArrowRight className="h-4 w-4 mr-1" />
              Promover Batch
            </Button>
            <Button size="sm" variant="outline" onClick={() => batchProcess.mutate({ action: "retry_failed", batch_size: 3 })} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry Falhas
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="dashboard"><BarChart3 className="h-3 w-3 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="datasets"><Database className="h-3 w-3 mr-1" />Datasets</TabsTrigger>
            <TabsTrigger value="files"><FolderOpen className="h-3 w-3 mr-1" />Arquivos</TabsTrigger>
            <TabsTrigger value="jobs"><List className="h-3 w-3 mr-1" />Jobs</TabsTrigger>
            <TabsTrigger value="staging"><Search className="h-3 w-3 mr-1" />Staging</TabsTrigger>
            <TabsTrigger value="resolution"><GitMerge className="h-3 w-3 mr-1" />Resolução</TabsTrigger>
            <TabsTrigger value="logs"><Shield className="h-3 w-3 mr-1" />Auditoria</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Datasets", value: s?.totalDatasets || 0, icon: Database },
                { label: "Arquivos", value: s?.totalFiles || 0, icon: FileText },
                { label: "Staging Matches", value: s?.totalStagingMatches || 0, icon: BarChart3 },
                { label: "Conflitos", value: s?.pendingConflicts || 0, icon: AlertTriangle },
                { label: "Revisão Manual", value: s?.pendingResolution || 0, icon: Eye },
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

            {s?.jobsByStatus && Object.keys(s.jobsByStatus).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Jobs por Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(s.jobsByStatus).map(([status, count]) => (
                      <Badge key={status} className={statusColors[status] || "bg-muted"}>
                        {status}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* DATASETS */}
          <TabsContent value="datasets" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Datasets Cadastrados</h2>
              <Dialog open={newDatasetOpen} onOpenChange={setNewDatasetOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Dataset</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Cadastrar Dataset Kaggle</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Slug (owner/dataset-name)</label>
                      <Input value={newDatasetForm.dataset_slug} onChange={e => setNewDatasetForm(f => ({ ...f, dataset_slug: e.target.value }))} placeholder="martj42/international-football-results-from-1872-to-2017" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Título</label>
                      <Input value={newDatasetForm.dataset_title} onChange={e => setNewDatasetForm(f => ({ ...f, dataset_title: e.target.value }))} placeholder="International Football Results" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">URL (opcional)</label>
                      <Input value={newDatasetForm.dataset_url} onChange={e => setNewDatasetForm(f => ({ ...f, dataset_url: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Descrição</label>
                      <Textarea value={newDatasetForm.dataset_description} onChange={e => setNewDatasetForm(f => ({ ...f, dataset_description: e.target.value }))} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Categoria</label>
                        <Input value={newDatasetForm.dataset_category} onChange={e => setNewDatasetForm(f => ({ ...f, dataset_category: e.target.value }))} placeholder="historical" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">País</label>
                        <Input value={newDatasetForm.country_scope} onChange={e => setNewDatasetForm(f => ({ ...f, country_scope: e.target.value }))} placeholder="international" />
                      </div>
                    </div>
                    <Button onClick={handleRegisterDataset} disabled={!newDatasetForm.dataset_slug || !newDatasetForm.dataset_title}>Cadastrar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>País</TableHead>
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
                    <TableCell>{ds.country_scope || "—"}</TableCell>
                    <TableCell>
                      <Badge className={ds.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {ds.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedDataset(ds.id); setActiveTab("files"); }}>
                        <FolderOpen className="h-3 w-3 mr-1" />Arquivos
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!datasets.data?.length && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum dataset cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* FILES */}
          <TabsContent value="files" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedDataset || ""} onValueChange={setSelectedDataset}>
                <SelectTrigger className="w-80"><SelectValue placeholder="Selecionar dataset..." /></SelectTrigger>
                <SelectContent>
                  {(datasets.data || []).map((ds: any) => (
                    <SelectItem key={ds.id} value={ds.id}>{ds.dataset_title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDataset && (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Arquivos do Dataset</h3>
                  <RegisterFilesDialog datasetId={selectedDataset} onRegister={(fileList: any[]) => registerFiles.mutate({ dataset_id: selectedDataset, files: fileList })} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>Último Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(files.data || []).map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-sm">{f.file_name}</TableCell>
                        <TableCell><Badge variant="outline">{f.file_type}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{f.inferred_entity_type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.file_hash?.substring(0, 12) || "—"}</TableCell>
                        <TableCell><Badge className={statusColors[f.last_status || ""] || "bg-muted"}>{f.last_status || "—"}</Badge></TableCell>
                        <TableCell className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => {
                            createJob.mutate({ dataset_id: selectedDataset, dataset_file_id: f.id });
                          }}>
                            <Play className="h-3 w-3 mr-1" />Job
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedFileId(f.id); }}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {selectedFileId && columnMappings.data && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Mapeamento de Colunas</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Coluna Origem</TableHead>
                            <TableHead>Coluna Normalizada</TableHead>
                            <TableHead>Entidade</TableHead>
                            <TableHead>Campo</TableHead>
                            <TableHead>Confiança</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {columnMappings.data.map((m: any) => (
                            <TableRow key={m.id}>
                              <TableCell className="font-mono text-xs">{m.source_column_name}</TableCell>
                              <TableCell className="font-mono text-xs">{m.normalized_column_name}</TableCell>
                              <TableCell><Badge variant="outline">{m.target_entity}</Badge></TableCell>
                              <TableCell className="text-xs">{m.target_field}</TableCell>
                              <TableCell>
                                <Badge className={m.mapping_confidence >= 90 ? "bg-green-500/20 text-green-400" : m.mapping_confidence >= 70 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}>
                                  {m.mapping_confidence}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* JOBS */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Fila de Jobs</h2>
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-1" />Upload Manual</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Upload Manual de Arquivo</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Job ID</label>
                      <Select value={uploadJobId} onValueChange={setUploadJobId}>
                        <SelectTrigger><SelectValue placeholder="Selecionar job..." /></SelectTrigger>
                        <SelectContent>
                          {(jobs.data || []).filter((j: any) => ["pending", "extracting"].includes(j.status)).map((j: any) => (
                            <SelectItem key={j.id} value={j.id}>{j.kaggle_datasets?.dataset_title} - {j.kaggle_dataset_files?.file_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Arquivo CSV/JSON</label>
                      <Input type="file" accept=".csv,.json,.txt" onChange={handleFileUpload} />
                    </div>
                    <Button onClick={handleUploadSubmit} disabled={!uploadJobId || !uploadFileContent}>Enviar</Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                  <TableHead>Conflitos</TableHead>
                  <TableHead>Erros</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(jobs.data || []).map((j: any) => (
                  <TableRow key={j.id}>
                    <TableCell className="text-xs max-w-32 truncate">{j.kaggle_datasets?.dataset_title || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{j.kaggle_dataset_files?.file_name || "—"}</TableCell>
                    <TableCell><Badge className={statusColors[j.status] || "bg-muted"}>{j.status}</Badge></TableCell>
                    <TableCell>{j.total_rows_read || 0}</TableCell>
                    <TableCell>{j.total_rows_staged || 0}</TableCell>
                    <TableCell>{j.total_promoted || 0}</TableCell>
                    <TableCell>{j.total_conflicts || 0}</TableCell>
                    <TableCell className={j.total_errors > 0 ? "text-destructive font-bold" : ""}>{j.total_errors || 0}</TableCell>
                    <TableCell className="flex gap-1 flex-wrap">
                      {["pending", "extracting"].includes(j.status) && (
                        <Button size="sm" variant="ghost" onClick={() => profileFile.mutate(j.id)} disabled={isLoading}>
                          <FileText className="h-3 w-3" />
                        </Button>
                      )}
                      {["mapping", "profiling"].includes(j.status) && (
                        <Button size="sm" variant="ghost" onClick={() => stageData.mutate(j.id)} disabled={isLoading}>
                          <Database className="h-3 w-3" />
                        </Button>
                      )}
                      {["staging", "awaiting_review"].includes(j.status) && (
                        <Button size="sm" variant="ghost" onClick={() => resolveJob.mutate(j.id)} disabled={isLoading}>
                          <GitMerge className="h-3 w-3" />
                        </Button>
                      )}
                      {j.status === "awaiting_review" && (
                        <Button size="sm" variant="ghost" onClick={() => promoteJob.mutate({ job_id: j.id })} disabled={isLoading}>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedJob(j.id); setActiveTab("staging"); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedJob(j.id); setActiveTab("logs"); }}>
                        <Shield className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!jobs.data?.length && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum job</TableCell></TableRow>
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
                          <TableHead>Conf.</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(stagingMatches.data || []).slice(0, 100).map((m: any) => (
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
                            <TableCell>{m.confidence_score || 0}%</TableCell>
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
                        <TableHead>Time Vinculado</TableHead>
                        <TableHead>Confiança</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(stagingTeams.data || []).map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.raw_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.normalized_name}</TableCell>
                          <TableCell className="font-mono text-xs">{t.inferred_slug}</TableCell>
                          <TableCell className="text-xs">{t.matched_team_id ? `✅ ${t.matched_team_id.substring(0, 8)}...` : "❌"}</TableCell>
                          <TableCell>{t.confidence_score || 0}%</TableCell>
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
            <h2 className="text-lg font-semibold">Fila de Resolução Manual ({resolutionQueue.data?.length || 0})</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(resolutionQueue.data || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.entity_type}</Badge></TableCell>
                    <TableCell>{r.issue_type}</TableCell>
                    <TableCell><Badge className={statusColors[r.status] || "bg-muted"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost"><Eye className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!resolutionQueue.data?.length && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma revisão pendente</TableCell></TableRow>
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

// Sub-component for registering files
function RegisterFilesDialog({ datasetId, onRegister }: { datasetId: string; onRegister: (files: any[]) => void }) {
  const [open, setOpen] = useState(false);
  const [filesText, setFilesText] = useState("");

  const handleSubmit = () => {
    const files = filesText.split("\n").filter(l => l.trim()).map(line => {
      const parts = line.split(",").map(s => s.trim());
      return { file_name: parts[0], file_type: parts[1] || "csv", inferred_entity_type: parts[2] || "unknown" };
    });
    onRegister(files);
    setOpen(false);
    setFilesText("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Registrar Arquivos</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar Arquivos</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Um arquivo por linha: nome,tipo,entidade</p>
          <Textarea value={filesText} onChange={e => setFilesText(e.target.value)} rows={5} placeholder={"results.csv,csv,matches\nteams.csv,csv,teams"} />
          <Button onClick={handleSubmit} disabled={!filesText.trim()}>Registrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
