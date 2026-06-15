import { useState, useEffect } from "react";
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
import { Trash2, Plus, Sparkles, Save, Search } from "lucide-react";
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

export default function AdminTeamCurriculum() {
  const { isAdmin, isLoading: loadingAuth } = useAdminAccess();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: teams } = useQuery({
    queryKey: ["admin-curriculum-search", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("times")
        .select("id, nome, pais, slug")
        .ilike("nome", `%${search}%`)
        .order("priority_score", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: bundle, refetch } = useQuery({
    queryKey: ["admin-curriculum", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const [team, profile, titles, parts] = await Promise.all([
        supabase.from("times").select("id, nome, pais, slug").eq("id", teamId!).maybeSingle(),
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
        body: { team_id: teamId, dry_run: false },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha na geração");
      toast.success(`Currículo gerado: ${data.titles_count} títulos, ${data.participations_count} participações`);
      // refresh
      setLoadedTeamId(null);
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
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
        await supabase.from("team_titles").insert(
          titles.map(({ id, ...t }) => ({ ...t, team_id: teamId }))
        );
      }

      await supabase.from("team_participations").delete().eq("team_id", teamId);
      if (parts.length) {
        await supabase.from("team_participations").insert(
          parts.map(({ id, ...p }) => ({ ...p, team_id: teamId }))
        );
      }

      toast.success("Currículo salvo!");
      setLoadedTeamId(null);
      await refetch();
      qc.invalidateQueries({ queryKey: ["team-curriculum"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loadingAuth) return <AdminLayout><div className="p-8">Carregando...</div></AdminLayout>;
  if (!isAdmin) return <AdminLayout><div className="p-8">Acesso negado</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Currículo de Times</h1>
          <p className="text-muted-foreground">Gere via IA ou preencha manualmente títulos, participações e perfil histórico.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Selecione o time</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Search className="w-4 h-4 self-center text-muted-foreground" />
              <Input
                placeholder="Buscar time (mínimo 2 letras)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {teams && teams.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <Button
                    key={t.id}
                    size="sm"
                    variant={teamId === t.id ? "default" : "outline"}
                    onClick={() => { setTeamId(t.id); (profile as any).__teamId = null; }}
                  >
                    {t.nome} {t.pais ? <span className="text-xs opacity-60 ml-1">({t.pais})</span> : null}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {teamId && bundle?.team && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{bundle.team.nome}</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleGenerate} disabled={generating} variant="secondary">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {generating ? "Gerando..." : "Gerar com IA (OpenAI)"}
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar tudo"}
                  </Button>
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
                }])}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar título
                </Button>
                {titles.map((t, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-6 gap-2">
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
                      <Button variant="ghost" size="icon" onClick={() => setTitles(titles.filter((_, j) => j !== i))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {titles.length === 0 && <p className="text-muted-foreground text-sm">Nenhum título cadastrado.</p>}
              </TabsContent>

              <TabsContent value="participations" className="space-y-3">
                <Button size="sm" variant="outline" onClick={() => setParts([...parts, {
                  competition_name: "", competition_tier: "nacional", year_from: null, year_to: null,
                  total_editions: null, notes: null,
                }])}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar participação
                </Button>
                {parts.map((p, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-6 gap-2">
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
                        <Button variant="ghost" size="icon" onClick={() => setParts(parts.filter((_, j) => j !== i))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {parts.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma participação cadastrada.</p>}
              </TabsContent>

              <TabsContent value="profile" className="space-y-3">
                <Card>
                  <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label>Fundação</Label><Input type="number" value={profile.founded_year ?? ""} onChange={(e) => setProfile({ ...profile, founded_year: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Apelido</Label><Input value={profile.nickname ?? ""} onChange={(e) => setProfile({ ...profile, nickname: e.target.value || null })} /></div>
                    <div><Label>Estádio</Label><Input value={profile.stadium_name ?? ""} onChange={(e) => setProfile({ ...profile, stadium_name: e.target.value || null })} /></div>
                    <div><Label>Capacidade</Label><Input type="number" value={profile.stadium_capacity ?? ""} onChange={(e) => setProfile({ ...profile, stadium_capacity: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div className="md:col-span-2"><Label>Mascote</Label><Input value={profile.mascot ?? ""} onChange={(e) => setProfile({ ...profile, mascot: e.target.value || null })} /></div>
                    <div className="md:col-span-2"><Label>História (HTML)</Label><Textarea rows={5} value={profile.history_text ?? ""} onChange={(e) => setProfile({ ...profile, history_text: e.target.value || null })} /></div>
                    <div className="md:col-span-2"><Label>Estádio (HTML)</Label><Textarea rows={3} value={profile.stadium_text ?? ""} onChange={(e) => setProfile({ ...profile, stadium_text: e.target.value || null })} /></div>
                    <div className="md:col-span-2"><Label>Cultura/Torcida</Label><Textarea rows={3} value={profile.culture_text ?? ""} onChange={(e) => setProfile({ ...profile, culture_text: e.target.value || null })} /></div>
                    <div className="md:col-span-2"><Label>Rivalidades</Label><Textarea rows={3} value={profile.rivalries_text ?? ""} onChange={(e) => setProfile({ ...profile, rivalries_text: e.target.value || null })} /></div>
                    <div className="md:col-span-2"><Label>Legado</Label><Textarea rows={3} value={profile.legacy_text ?? ""} onChange={(e) => setProfile({ ...profile, legacy_text: e.target.value || null })} /></div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
