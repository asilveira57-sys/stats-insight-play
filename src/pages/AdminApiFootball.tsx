import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Play, ListPlus, Star } from "lucide-react";

type Depth = "fixtures" | "events" | "lineups" | "stats";

interface InventoryRow {
  league_id: number;
  league_name: string;
  league_type: string | null;
  country: string | null;
  logo_url: string | null;
  flag_url: string | null;
  seasons: { year: number; current?: boolean }[];
  is_priority: boolean;
}

interface JobRow {
  id: string;
  league_id: number;
  league_name: string | null;
  season: number;
  depth: Depth;
  status: string;
  fixtures_total: number | null;
  fixtures_processed: number | null;
  requests_used: number | null;
  error: string | null;
  created_at: string;
}

interface QuotaRow {
  day: string;
  requests_used: number;
  daily_limit: number;
  last_check: string;
}

const DEPTH_LABEL: Record<Depth, string> = {
  fixtures: "Fixtures",
  events: "Eventos",
  lineups: "Escalações",
  stats: "Estatísticas",
};

export default function AdminApiFootball() {
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const { toast } = useToast();

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [quota, setQuota] = useState<QuotaRow | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [refreshingApi, setRefreshingApi] = useState(false);
  const [enqueuing, setEnqueuing] = useState(false);
  const [enqueuingAll, setEnqueuingAll] = useState(false);
  const [runningWorker, setRunningWorker] = useState(false);

  const [depths, setDepths] = useState<Record<Depth, boolean>>({
    fixtures: true, events: false, lineups: false, stats: false,
  });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<number, Set<number>>>({});
  const [queuePage, setQueuePage] = useState(1);
  const PAGE_SIZE = 50;

  async function loadInventory() {
    setLoadingInventory(true);
    const { data } = await supabase
      .from("api_football_inventory" as any)
      .select("*")
      .order("country")
      .order("league_name");
    setInventory((data ?? []) as any);
    setLoadingInventory(false);
  }

  async function loadJobs() {
    const all: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("api_football_import_jobs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) break;
      if (!data?.length) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    setJobs(all as any);
  }

  async function loadQuota() {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("api_football_quota_log" as any)
      .select("*")
      .eq("day", today)
      .maybeSingle();
    setQuota((data ?? null) as any);
  }

  useEffect(() => {
    if (!isAdmin) return;
    loadInventory(); loadJobs(); loadQuota();

    const ch = supabase
      .channel("af-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "api_football_import_jobs" }, loadJobs)
      .on("postgres_changes", { event: "*", schema: "public", table: "api_football_quota_log" }, loadQuota)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  async function refreshFromApi() {
    setRefreshingApi(true);
    try {
      const { data, error } = await supabase.functions.invoke("apifootball-inventory");
      if (error) throw error;
      toast({ title: "Inventário atualizado", description: `${data?.leagues ?? 0} ligas. Quota: ${data?.quota?.used}/${data?.quota?.limit_day}` });
      await loadInventory(); await loadQuota();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setRefreshingApi(false); }
  }

  function toggleSeason(leagueId: number, year: number) {
    setSelected(prev => {
      const set = new Set(prev[leagueId] ?? []);
      if (set.has(year)) set.delete(year); else set.add(year);
      return { ...prev, [leagueId]: set };
    });
  }
  function toggleAllSeasons(league: InventoryRow) {
    setSelected(prev => {
      const set = prev[league.league_id] ?? new Set();
      const all = league.seasons.map(s => s.year);
      if (set.size === all.length) return { ...prev, [league.league_id]: new Set() };
      return { ...prev, [league.league_id]: new Set(all) };
    });
  }

  function selectAleballPriority() {
    const next: Record<number, Set<number>> = {};
    inventory.filter(l => l.is_priority).forEach(l => {
      next[l.league_id] = new Set(l.seasons.map(s => s.year));
    });
    setSelected(next);
    toast({ title: "Prioridade Aleball selecionada", description: `${Object.keys(next).length} ligas marcadas` });
  }

  const totals = useMemo(() => {
    const depthsSelected = (Object.keys(depths) as Depth[]).filter(d => depths[d]);
    let leagueSeasons = 0;
    for (const k of Object.keys(selected)) leagueSeasons += selected[Number(k)].size;
    const fixtureReqs = depths.fixtures ? leagueSeasons : 0;
    // estimativa: 380 jogos médios × N depths não-fixtures por temporada
    const detailDepths = depthsSelected.filter(d => d !== "fixtures").length;
    const detailReqs = detailDepths * leagueSeasons * 380;
    const total = fixtureReqs + detailReqs;
    const days = quota ? (total / quota.daily_limit) : (total / 75000);
    return { leagueSeasons, total, days, depthsSelected };
  }, [selected, depths, quota]);

  async function enqueue() {
    const depthsSelected = totals.depthsSelected;
    if (depthsSelected.length === 0 || totals.leagueSeasons === 0) {
      toast({ title: "Nada selecionado", description: "Marque ligas e profundidades", variant: "destructive" });
      return;
    }
    setEnqueuing(true);
    try {
      const selections = Object.entries(selected)
        .filter(([, v]) => v.size > 0)
        .map(([lid, v]) => {
          const lg = inventory.find(l => l.league_id === Number(lid));
          return {
            league_id: Number(lid),
            league_name: lg?.league_name,
            seasons: Array.from(v).sort(),
            depths: depthsSelected,
          };
        });
      const { data, error } = await supabase.functions.invoke("apifootball-enqueue", { body: { selections } });
      if (error) throw error;
      toast({ title: "Adicionado à fila", description: `${data?.enqueued} jobs novos (${data?.total_requested} solicitados)` });
      await loadJobs();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setEnqueuing(false); }
  }

  async function enqueueAll() {
    if (inventory.length === 0) {
      toast({ title: "Inventário vazio", description: "Atualize o inventário primeiro", variant: "destructive" });
      return;
    }
    const totalJobs = inventory.reduce((acc, l) => acc + l.seasons.length * 4, 0);
    if (!confirm(`Enfileirar TUDO: ${inventory.length} ligas × todas temporadas × 4 profundidades = ~${totalJobs.toLocaleString()} jobs. Jobs já existentes serão pulados. Continuar?`)) return;
    setEnqueuingAll(true);
    try {
      const allDepths: Depth[] = ["fixtures", "events", "lineups", "stats"];
      const selections = inventory
        .filter(l => l.seasons.length > 0)
        .map(l => ({
          league_id: l.league_id,
          league_name: l.league_name,
          seasons: l.seasons.map(s => s.year),
          depths: allDepths,
        }));
      // enviar em lotes de 200 ligas para não estourar payload
      let enqueued = 0, skipped = 0, requested = 0;
      const BATCH = 200;
      for (let i = 0; i < selections.length; i += BATCH) {
        const slice = selections.slice(i, i + BATCH);
        const { data, error } = await supabase.functions.invoke("apifootball-enqueue", { body: { selections: slice } });
        if (error) throw error;
        enqueued += data?.enqueued ?? 0;
        skipped += data?.skipped_existing ?? 0;
        requested += data?.total_requested ?? 0;
      }
      toast({ title: "Fila atualizada", description: `${enqueued} novos · ${skipped} já existiam · ${requested} avaliados` });
      await loadJobs();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setEnqueuingAll(false); }
  }

  async function runWorkerNow() {
    setRunningWorker(true);
    try {
      const { data, error } = await supabase.functions.invoke("apifootball-worker");
      if (error) throw error;
      toast({ title: "Worker executado", description: `Processados: ${data?.processed ?? 0} | Quota: ${data?.quota?.used}/${data?.quota?.limit_day}` });
      await loadJobs(); await loadQuota();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setRunningWorker(false); }
  }

  const filteredInventory = inventory.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.league_name.toLowerCase().includes(s) || (l.country ?? "").toLowerCase().includes(s);
  });
  const byCountry = useMemo(() => {
    const map = new Map<string, InventoryRow[]>();
    for (const l of filteredInventory) {
      const c = l.country ?? "—";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(l);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredInventory]);

  const stats = useMemo(() => {
    const by: Record<string, number> = { queued: 0, running: 0, done: 0, failed: 0 };
    for (const j of jobs) by[j.status] = (by[j.status] ?? 0) + 1;
    return by;
  }, [jobs]);

  if (adminLoading) return <AdminLayout><div className="p-8">Carregando...</div></AdminLayout>;
  if (!isAdmin) return <AdminLayout><div className="p-8">Acesso negado.</div></AdminLayout>;

  const quotaPct = quota ? (quota.requests_used / quota.daily_limit) * 100 : 0;

  return (
    <AdminLayout>
      <Helmet><title>API-Football | Admin</title></Helmet>
      <div className="p-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API-Football</h1>
            <p className="text-muted-foreground">Inventário e importação histórica em massa</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshFromApi} disabled={refreshingApi}>
              {refreshingApi ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Atualizar inventário
            </Button>
            <Button onClick={runWorkerNow} disabled={runningWorker}>
              {runningWorker ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Rodar worker agora
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quota de hoje</CardTitle>
            <CardDescription>
              {quota ? `${quota.requests_used.toLocaleString()} / ${quota.daily_limit.toLocaleString()} requisições` : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={quotaPct} />
            <div className="text-xs text-muted-foreground mt-2">
              Última verificação: {quota ? new Date(quota.last_check).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="select">
          <TabsList>
            <TabsTrigger value="select">Inventário & Seleção</TabsTrigger>
            <TabsTrigger value="queue">Fila ({jobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profundidade dos dados</CardTitle>
                <CardDescription>Cada item extra adiciona ~380 reqs por temporada</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {(Object.keys(DEPTH_LABEL) as Depth[]).map(d => (
                  <label key={d} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={depths[d]} onCheckedChange={v => setDepths(s => ({ ...s, [d]: !!v }))} />
                    <span>{DEPTH_LABEL[d]}</span>
                  </label>
                ))}
                <div className="ml-auto text-sm">
                  <Badge variant="secondary">{totals.leagueSeasons} liga-temporadas</Badge>{" "}
                  <Badge variant="secondary">{totals.total.toLocaleString()} reqs</Badge>{" "}
                  <Badge>{totals.days < 1 ? `${Math.ceil(totals.days * 24 * 60)} min` : `${totals.days.toFixed(1)} dias`}</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 items-center flex-wrap">
              <Input placeholder="Filtrar por liga ou país..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
              <Button variant="outline" onClick={selectAleballPriority}>
                <Star className="h-4 w-4 mr-2" /> Prioridade Aleball
              </Button>
              <Button variant="outline" onClick={() => setSelected({})}>Limpar seleção</Button>
              <Button variant="secondary" onClick={enqueueAll} disabled={enqueuingAll || inventory.length === 0}>
                {enqueuingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListPlus className="h-4 w-4 mr-2" />}
                Enfileirar TUDO (todas ligas × temporadas × 4 profundidades)
              </Button>
              <Button className="ml-auto" onClick={enqueue} disabled={enqueuing || totals.leagueSeasons === 0}>
                {enqueuing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListPlus className="h-4 w-4 mr-2" />}
                Adicionar {totals.leagueSeasons * totals.depthsSelected.length} jobs à fila
              </Button>
            </div>

            {loadingInventory ? (
              <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
            ) : inventory.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Inventário vazio. Clique em "Atualizar inventário" para buscar da API.
              </CardContent></Card>
            ) : (
              <ScrollArea className="h-[600px] border rounded-md">
                <div className="p-4 space-y-6">
                  {byCountry.map(([country, leagues]) => (
                    <div key={country}>
                      <h3 className="font-semibold mb-2">{country} <span className="text-muted-foreground text-sm">({leagues.length})</span></h3>
                      <div className="space-y-2">
                        {leagues.map(lg => {
                          const sel = selected[lg.league_id] ?? new Set<number>();
                          const allSelected = sel.size === lg.seasons.length && lg.seasons.length > 0;
                          return (
                            <div key={lg.league_id} className="border rounded-md p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox checked={allSelected} onCheckedChange={() => toggleAllSeasons(lg)} />
                                <span className="font-medium">{lg.league_name}</span>
                                {lg.is_priority && <Badge variant="default" className="text-xs"><Star className="h-3 w-3 mr-1" />priority</Badge>}
                                <Badge variant="outline" className="text-xs">{lg.league_type}</Badge>
                                <span className="text-xs text-muted-foreground ml-auto">id={lg.league_id} · {lg.seasons.length} temporadas</span>
                              </div>
                              <div className="flex flex-wrap gap-1 pl-7">
                                {lg.seasons.map(s => (
                                  <button
                                    key={s.year}
                                    onClick={() => toggleSeason(lg.league_id, s.year)}
                                    className={`text-xs px-2 py-0.5 rounded border ${sel.has(s.year) ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                                  >
                                    {s.year}{s.current ? "•" : ""}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
              {Object.entries(stats).map(([k, v]) => (
                <Badge key={k} variant={k === "failed" ? "destructive" : k === "done" ? "default" : "secondary"}>
                  {k}: {v}
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground ml-auto">
                Total: {jobs.length.toLocaleString()} jobs
              </span>
            </div>
            {(() => {
              const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
              const page = Math.min(queuePage, totalPages);
              const slice = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
              return (
                <>
                  <ScrollArea className="h-[600px] border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Liga</th>
                          <th className="text-left p-2">Temporada</th>
                          <th className="text-left p-2">Profundidade</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Progresso</th>
                          <th className="text-left p-2">Reqs</th>
                          <th className="text-left p-2">Erro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slice.map(j => (
                          <tr key={j.id} className="border-t">
                            <td className="p-2">{j.league_name ?? j.league_id}</td>
                            <td className="p-2">{j.season}</td>
                            <td className="p-2">{DEPTH_LABEL[j.depth]}</td>
                            <td className="p-2">
                              <Badge variant={j.status === "failed" ? "destructive" : j.status === "done" ? "default" : "secondary"}>
                                {j.status}
                              </Badge>
                            </td>
                            <td className="p-2">{j.fixtures_processed ?? 0}/{j.fixtures_total ?? 0}</td>
                            <td className="p-2">{j.requests_used ?? 0}</td>
                            <td className="p-2 text-destructive max-w-xs truncate">{j.error ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setQueuePage(p => Math.max(1, p - 1))}>Anterior</Button>
                      <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setQueuePage(p => p + 1)}>Próxima</Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
