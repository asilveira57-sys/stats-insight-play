import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Trash2, Plus, Sparkles, Save, Search, Rocket, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { toast } from "sonner";

const TIERS = ["mundial", "continental", "nacional", "regional", "estadual", "copa"] as const;
type Tier = typeof TIERS[number];

type Title = {
  id?: string;
  competition_name: string;
  competition_tier: Tier;
  edition_year: number;
  position: string;
  confederation: string | null;
  source_url: string | null;
  notes: string | null;
};
type Participation = {
  id?: string;
  competition_name: string;
  competition_tier: Tier;
  year_from: number | null;
  year_to: number | null;
  total_editions: number | null;
  notes: string | null;
};
type Profile = {
  founded_year: number | null;
  stadium_name: string | null;
  stadium_capacity: number | null;
  mascot: string | null;
  nickname: string | null;
  history_text: string | null;
  stadium_text: string | null;
  culture_text: string | null;
  rivalries_text: string | null;
  legacy_text: string | null;
};
const emptyProfile: Profile = {
  founded_year: null, stadium_name: null, stadium_capacity: null,
  mascot: null, nickname: null, history_text: null, stadium_text: null,
  culture_text: null, rivalries_text: null, legacy_text: null,
};

type LeagueTeam = {
  id: string;
  nome: string;
  estado: string | null;
  pais: string | null;
  titles_count: number;
  parts_count: number;
  profile_filled: boolean;
  league_matches: number;
  total_matches: number;
};

export default function AdminTeamCurriculum() {
  const { isAdmin, isLoading: loadingAuth, failed, retry, user } = useAdminAccess();
  const qc = useQueryClient();

  // ---- Selector ----
  const [ligaId, setLigaId] = useState<string | null>(null);
  const [textFilter, setTextFilter] = useState("");
  const [hideNoise, setHideNoise] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [teamId, setTeamId] = useState<string | null>(null);

  // ---- Editor ----
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // ---- Batch ----
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Ligas list
  const { data: ligas } = useQuery({
    queryKey: ["admin-curriculum-ligas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ligas")
        .select("id, nome, pais, codigo_api, ordem_exibicao, ativa")
        .eq("ativa", true)
        .order("ordem_exibicao", { ascending: true })
        .order("nome");
      return data || [];
    },
  });

  // Teams in league with curriculum status
  const { data: leagueTeams, isLoading: loadingLeagueTeams, refetch: refetchLeagueTeams } = useQuery({
    queryKey: ["admin-curriculum-league-teams", ligaId],
    enabled: !!ligaId,
    queryFn: async (): Promise<LeagueTeam[]> => {
      // 1) distinct team ids from partidas
      const ids = new Set<string>();
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const since = new Date();
        since.setMonth(since.getMonth() - 36);
        const { data, error } = await supabase
          .from("partidas")
          .select("time_casa_id, time_fora_id")
          .eq("liga_id", ligaId!)
          .gte("data", since.toISOString().slice(0, 10))
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        data.forEach((r: any) => {
          if (r.time_casa_id) ids.add(r.time_casa_id);
          if (r.time_fora_id) ids.add(r.time_fora_id);
        });
        if (data.length < pageSize) break;
        page++;
        if (page > 20) break;
      }
      const idArr = Array.from(ids);
      if (idArr.length === 0) return [];

      // 2) team meta
      const teamsRes = await supabase
        .from("times")
        .select("id, nome, pais, estado")
        .in("id", idArr);
      const teamsArr = teamsRes.data || [];

      // 3) batch counts
      const [titlesRes, partsRes, profRes] = await Promise.all([
        supabase.from("team_titles").select("team_id").in("team_id", idArr),
        supabase.from("team_participations").select("team_id").in("team_id", idArr),
        supabase.from("team_profiles").select("team_id, history_text").in("team_id", idArr),
      ]);
      const titleMap = new Map<string, number>();
      (titlesRes.data || []).forEach((r: any) => titleMap.set(r.team_id, (titleMap.get(r.team_id) ?? 0) + 1));
      const partMap = new Map<string, number>();
      (partsRes.data || []).forEach((r: any) => partMap.set(r.team_id, (partMap.get(r.team_id) ?? 0) + 1));
      const profMap = new Map<string, boolean>();
      (profRes.data || []).forEach((r: any) => profMap.set(r.team_id, !!r.history_text));

      return teamsArr
        .map((t: any) => ({
          id: t.id, nome: t.nome, estado: t.estado, pais: t.pais,
          titles_count: titleMap.get(t.id) ?? 0,
          parts_count: partMap.get(t.id) ?? 0,
          profile_filled: profMap.get(t.id) ?? false,
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });

  const filteredTeams = useMemo(() => {
    if (!leagueTeams) return [];
    const q = textFilter.trim().toLowerCase();
    if (!q) return leagueTeams;
    return leagueTeams.filter((t) => t.nome.toLowerCase().includes(q));
  }, [leagueTeams, textFilter]);

  function teamStatus(t: LeagueTeam): { label: string; color: string } {
    if (t.titles_count + t.parts_count === 0 && !t.profile_filled) return { label: "vazio", color: "bg-gray-500" };
    if (t.titles_count > 0 && t.profile_filled) return { label: "completo", color: "bg-green-600" };
    return { label: "parcial", color: "bg-amber-500" };
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function selectAll() {
    setSelectedIds(new Set(filteredTeams.map((t) => t.id)));
  }
  function selectEmpty() {
    setSelectedIds(new Set(filteredTeams.filter((t) => teamStatus(t).label === "vazio").map((t) => t.id)));
  }
  function clearSelected() {
    setSelectedIds(new Set());
  }

  // ---- Single team editor data ----
  const { data: bundle, refetch } = useQuery({
    queryKey: ["admin-curriculum", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const [team, profile, titles, parts] = await Promise.all([
        supabase.from("times").select("id, nome, pais, slug, estado").eq("id", teamId!).maybeSingle(),
        supabase.from("team_profiles").select("*").eq("team_id", teamId!).maybeSingle(),
        supabase.from("team_titles").select("*").eq("team_id", teamId!).order("edition_year", { ascending: false }),
        supabase.from("team_participations").select("*").eq("team_id", teamId!).order("competition_tier"),
      ]);
      return {
        team: team.data,
        profile: (profile.data as Profile) || { ...emptyProfile },
        titles: (titles.data as Title[]) || [],
        participations: (parts.data as Participation[]) || [],
      };
    },
  });

  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [titles, setTitles] = useState<Title[]>([]);
  const [parts, setParts] = useState<Participation[]>([]);
  const [loadedTeamId, setLoadedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (bundle?.team && bundle.team.id !== loadedTeamId) {
      setProfile(bundle.profile);
      setTitles(bundle.titles);
      setParts(bundle.participations);
      setLoadedTeamId(bundle.team.id);
    }
  }, [bundle, loadedTeamId]);

  async function handleGenerate() {
    if (!teamId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-team-curriculum", {
        body: { team_id: teamId, model: "gpt-4o" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha");
      if (data.confidence === "low") {
        toast.warning(`Baixa confiança — não foi salvo. Identificado como: ${data.identified_as ?? "?"}`);
      } else {
        toast.success(`Gerado: ${data.titles_count} títulos, ${data.participations_count} participações`);
      }
      setLoadedTeamId(null);
      await refetch();
      refetchLeagueTeams();
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally { setGenerating(false); }
  }

  async function handleSave() {
    if (!teamId) return;
    setSaving(true);
    try {
      await supabase.from("team_profiles").upsert(
        { team_id: teamId, ...profile, updated_at: new Date().toISOString() },
        { onConflict: "team_id" }
      );
      await supabase.from("team_titles").delete().eq("team_id", teamId);
      if (titles.length) {
        await supabase.from("team_titles").insert(titles.map(({ id, ...t }) => ({ ...t, team_id: teamId })));
      }
      await supabase.from("team_participations").delete().eq("team_id", teamId);
      if (parts.length) {
        await supabase.from("team_participations").insert(parts.map(({ id, ...p }) => ({ ...p, team_id: teamId })));
      }
      toast.success("Salvo!");
      setLoadedTeamId(null);
      await refetch();
      refetchLeagueTeams();
      qc.invalidateQueries({ queryKey: ["team-curriculum"] });
    } catch (e: any) { toast.error(e.message || "Erro"); }
    finally { setSaving(false); }
  }

  async function startBatch(onlyEmpty: boolean) {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos 1 time"); return;
    }
    const liga = ligas?.find((l) => l.id === ligaId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-team-curriculum-batch", {
        body: {
          team_ids: Array.from(selectedIds),
          liga_id: ligaId,
          liga_nome: liga?.nome ?? null,
          only_empty: onlyEmpty,
          model: "gpt-4o",
          created_by: user?.id ?? null,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha");
      setActiveJobId(data.job_id);
      toast.success(`Lote iniciado: ${data.total} times. Processando em background.`);
    } catch (e: any) { toast.error(e.message || "Erro"); }
  }

  // Poll active job
  const { data: job } = useQuery({
    queryKey: ["admin-curriculum-job", activeJobId],
    enabled: !!activeJobId,
    refetchInterval: 2500,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_curriculum_jobs")
        .select("*")
        .eq("id", activeJobId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (job?.status === "done") {
      refetchLeagueTeams();
    }
  }, [job?.status]);

  // Recent jobs
  const { data: recentJobs } = useQuery({
    queryKey: ["admin-curriculum-recent-jobs"],
    refetchInterval: activeJobId ? 5000 : false,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_curriculum_jobs")
        .select("id, liga_nome, status, total, processed, succeeded, skipped_existing, skipped_low_conf, failed, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // ---- Guards ----
  if (loadingAuth) return <AdminLayout><div className="p-8">Carregando...</div></AdminLayout>;
  if (failed) return (<AdminLayout><div className="p-8 space-y-4"><p>Falha ao validar permissões.</p><Button onClick={retry}>Tentar novamente</Button></div></AdminLayout>);
  if (!user) return <AdminLayout><div className="p-8">Faça login.</div></AdminLayout>;
  if (!isAdmin) return <AdminLayout><div className="p-8">Acesso negado.</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Currículo de Times</h1>
          <p className="text-muted-foreground">Selecione uma liga, escolha os times e gere os currículos em lote.</p>
        </div>

        <Tabs defaultValue="batch" className="space-y-4">
          <TabsList>
            <TabsTrigger value="batch"><Rocket className="w-4 h-4 mr-1" /> Geração por Liga</TabsTrigger>
            <TabsTrigger value="single"><Search className="w-4 h-4 mr-1" /> Editar Time</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* BATCH */}
          <TabsContent value="batch" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>1. Escolha a liga</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={ligaId ?? ""} onValueChange={(v) => { setLigaId(v); setSelectedIds(new Set()); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma liga..." /></SelectTrigger>
                  <SelectContent className="max-h-96">
                    {ligas?.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome} {l.pais ? <span className="opacity-60 text-xs ml-1">({l.pais})</span> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {ligaId && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    2. Times participantes
                    {leagueTeams && <span className="text-sm font-normal text-muted-foreground ml-2">({leagueTeams.length})</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 flex-wrap items-center">
                    <Input placeholder="Filtrar..." value={textFilter} onChange={(e) => setTextFilter(e.target.value)} className="max-w-xs" />
                    <Button size="sm" variant="outline" onClick={selectAll}>Selecionar todos</Button>
                    <Button size="sm" variant="outline" onClick={selectEmpty}>Selecionar só os vazios</Button>
                    <Button size="sm" variant="ghost" onClick={clearSelected}>Limpar</Button>
                    <div className="ml-auto text-sm text-muted-foreground">{selectedIds.size} selecionado(s)</div>
                  </div>

                  {loadingLeagueTeams && <p className="text-sm text-muted-foreground">Carregando times...</p>}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto">
                    {filteredTeams.map((t) => {
                      const st = teamStatus(t);
                      const checked = selectedIds.has(t.id);
                      return (
                        <div key={t.id} className={`flex items-center gap-2 p-2 rounded border ${checked ? "border-primary bg-primary/5" : "border-border"}`}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleSelected(t.id)} />
                          <button className="flex-1 text-left text-sm" onClick={() => toggleSelected(t.id)}>
                            <div className="font-medium">{t.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.estado || t.pais || "—"} • {t.titles_count} títulos • {t.parts_count} part.
                            </div>
                          </button>
                          <Badge className={`${st.color} text-white`}>{st.label}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => { setTeamId(t.id); setLoadedTeamId(null); }}>
                            editar
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button onClick={() => startBatch(true)} disabled={!!activeJobId && job?.status === "running"}>
                      <Sparkles className="w-4 h-4 mr-2" /> Gerar selecionados (pular preenchidos)
                    </Button>
                    <Button variant="secondary" onClick={() => startBatch(false)} disabled={!!activeJobId && job?.status === "running"}>
                      <Sparkles className="w-4 h-4 mr-2" /> Gerar e SOBRESCREVER
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeJobId && job && (
              <Card>
                <CardHeader><CardTitle>Progresso do lote</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={job.total ? (job.processed / job.total) * 100 : 0} />
                  <div className="text-sm flex flex-wrap gap-4">
                    <span>{job.processed}/{job.total} processados</span>
                    <span className="text-green-500"><CheckCircle2 className="w-4 h-4 inline" /> {job.succeeded} ok</span>
                    <span className="text-amber-500"><AlertTriangle className="w-4 h-4 inline" /> {job.skipped_low_conf} baixa conf.</span>
                    <span className="text-muted-foreground">↷ {job.skipped_existing} já existiam</span>
                    <span className="text-red-500"><XCircle className="w-4 h-4 inline" /> {job.failed} falhas</span>
                  </div>
                  {job.current_team_nome && <div className="text-xs text-muted-foreground">Processando: {job.current_team_nome}</div>}
                  <Badge>{job.status}</Badge>
                  {job.status === "done" && (
                    <Button size="sm" variant="outline" onClick={() => setActiveJobId(null)}>Fechar</Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SINGLE */}
          <TabsContent value="single" className="space-y-4">
            {teamId && bundle?.team ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{bundle.team.nome} <span className="text-sm font-normal text-muted-foreground">{bundle.team.estado || bundle.team.pais}</span></CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={handleGenerate} disabled={generating} variant="secondary">
                        <Sparkles className="w-4 h-4 mr-2" />{generating ? "Gerando..." : "Gerar com IA"}
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />{saving ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button variant="ghost" onClick={() => setTeamId(null)}>Fechar</Button>
                    </div>
                  </CardHeader>
                </Card>

                <Tabs defaultValue="titles">
                  <TabsList>
                    <TabsTrigger value="titles">Títulos ({titles.length})</TabsTrigger>
                    <TabsTrigger value="participations">Participações ({parts.length})</TabsTrigger>
                    <TabsTrigger value="profile">Perfil</TabsTrigger>
                  </TabsList>

                  <TabsContent value="titles" className="space-y-3">
                    <Button size="sm" variant="outline" onClick={() => setTitles([...titles, {
                      competition_name: "", competition_tier: "nacional", edition_year: new Date().getFullYear(),
                      position: "campeão", confederation: null, source_url: null, notes: null,
                    }])}><Plus className="w-4 h-4 mr-1" /> Adicionar título</Button>
                    {titles.map((t, i) => (
                      <Card key={i}><CardContent className="pt-4 grid grid-cols-1 md:grid-cols-6 gap-2">
                        <Input className="md:col-span-2" placeholder="Competição" value={t.competition_name}
                          onChange={(e) => { const n = [...titles]; n[i] = { ...t, competition_name: e.target.value }; setTitles(n); }} />
                        <Select value={t.competition_tier} onValueChange={(v: Tier) => { const n = [...titles]; n[i] = { ...t, competition_tier: v }; setTitles(n); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TIERS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="Ano" value={t.edition_year}
                          onChange={(e) => { const n = [...titles]; n[i] = { ...t, edition_year: Number(e.target.value) }; setTitles(n); }} />
                        <Input placeholder="Confederação" value={t.confederation || ""}
                          onChange={(e) => { const n = [...titles]; n[i] = { ...t, confederation: e.target.value || null }; setTitles(n); }} />
                        <Button variant="ghost" size="icon" onClick={() => setTitles(titles.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
                      </CardContent></Card>
                    ))}
                    {titles.length === 0 && <p className="text-muted-foreground text-sm">Nenhum título.</p>}
                  </TabsContent>

                  <TabsContent value="participations" className="space-y-3">
                    <Button size="sm" variant="outline" onClick={() => setParts([...parts, {
                      competition_name: "", competition_tier: "nacional", year_from: null, year_to: null,
                      total_editions: null, notes: null,
                    }])}><Plus className="w-4 h-4 mr-1" /> Adicionar participação</Button>
                    {parts.map((p, i) => (
                      <Card key={i}><CardContent className="pt-4 grid grid-cols-1 md:grid-cols-6 gap-2">
                        <Input className="md:col-span-2" placeholder="Competição" value={p.competition_name}
                          onChange={(e) => { const n = [...parts]; n[i] = { ...p, competition_name: e.target.value }; setParts(n); }} />
                        <Select value={p.competition_tier} onValueChange={(v: Tier) => { const n = [...parts]; n[i] = { ...p, competition_tier: v }; setParts(n); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TIERS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="De" value={p.year_from ?? ""}
                          onChange={(e) => { const n = [...parts]; n[i] = { ...p, year_from: e.target.value ? Number(e.target.value) : null }; setParts(n); }} />
                        <Input type="number" placeholder="Até" value={p.year_to ?? ""}
                          onChange={(e) => { const n = [...parts]; n[i] = { ...p, year_to: e.target.value ? Number(e.target.value) : null }; setParts(n); }} />
                        <div className="flex gap-1">
                          <Input type="number" placeholder="Edições" value={p.total_editions ?? ""}
                            onChange={(e) => { const n = [...parts]; n[i] = { ...p, total_editions: e.target.value ? Number(e.target.value) : null }; setParts(n); }} />
                          <Button variant="ghost" size="icon" onClick={() => setParts(parts.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </CardContent></Card>
                    ))}
                    {parts.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma participação.</p>}
                  </TabsContent>

                  <TabsContent value="profile" className="space-y-3">
                    <Card><CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><Label>Fundação</Label><Input type="number" value={profile.founded_year ?? ""} onChange={(e) => setProfile({ ...profile, founded_year: e.target.value ? Number(e.target.value) : null })} /></div>
                      <div><Label>Apelido</Label><Input value={profile.nickname ?? ""} onChange={(e) => setProfile({ ...profile, nickname: e.target.value || null })} /></div>
                      <div><Label>Estádio</Label><Input value={profile.stadium_name ?? ""} onChange={(e) => setProfile({ ...profile, stadium_name: e.target.value || null })} /></div>
                      <div><Label>Capacidade</Label><Input type="number" value={profile.stadium_capacity ?? ""} onChange={(e) => setProfile({ ...profile, stadium_capacity: e.target.value ? Number(e.target.value) : null })} /></div>
                      <div className="md:col-span-2"><Label>Mascote</Label><Input value={profile.mascot ?? ""} onChange={(e) => setProfile({ ...profile, mascot: e.target.value || null })} /></div>
                      <div className="md:col-span-2"><Label>História</Label><Textarea rows={5} value={profile.history_text ?? ""} onChange={(e) => setProfile({ ...profile, history_text: e.target.value || null })} /></div>
                      <div className="md:col-span-2"><Label>Estádio</Label><Textarea rows={3} value={profile.stadium_text ?? ""} onChange={(e) => setProfile({ ...profile, stadium_text: e.target.value || null })} /></div>
                      <div className="md:col-span-2"><Label>Cultura</Label><Textarea rows={3} value={profile.culture_text ?? ""} onChange={(e) => setProfile({ ...profile, culture_text: e.target.value || null })} /></div>
                      <div className="md:col-span-2"><Label>Rivalidades</Label><Textarea rows={3} value={profile.rivalries_text ?? ""} onChange={(e) => setProfile({ ...profile, rivalries_text: e.target.value || null })} /></div>
                      <div className="md:col-span-2"><Label>Legado</Label><Textarea rows={3} value={profile.legacy_text ?? ""} onChange={(e) => setProfile({ ...profile, legacy_text: e.target.value || null })} /></div>
                    </CardContent></Card>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <Card><CardContent className="pt-6 text-muted-foreground">Selecione um time pelo botão "editar" na aba Geração por Liga.</CardContent></Card>
            )}
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="space-y-3">
            <Card>
              <CardHeader><CardTitle>Últimos lotes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {recentJobs?.map((j: any) => (
                  <div key={j.id} className="flex items-center gap-3 p-2 border rounded">
                    <Badge>{j.status}</Badge>
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{j.liga_nome || "Lote manual"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(j.created_at).toLocaleString()} • {j.processed}/{j.total} • ✓{j.succeeded} ↷{j.skipped_existing} ⚠{j.skipped_low_conf} ✗{j.failed}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setActiveJobId(j.id)}>ver</Button>
                  </div>
                ))}
                {(recentJobs?.length ?? 0) === 0 && <p className="text-muted-foreground text-sm">Nenhum lote executado ainda.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
