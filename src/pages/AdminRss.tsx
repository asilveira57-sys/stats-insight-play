import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Copy, ExternalLink, AlertCircle, CheckCircle2, Rss } from "lucide-react";

const PROJECT = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN_BASE = `https://${PROJECT}.supabase.co/functions/v1/rss`;

const STATIC_FEEDS: { key: string; label: string; description: string }[] = [
  { key: "all", label: "RSS Geral", description: "Todas as publicações públicas (100 mais recentes)" },
  { key: "make", label: "Make / Automação", description: "Feed otimizado para automações (150 itens)" },
  { key: "noticias", label: "Notícias", description: "Conteúdo editorial geral" },
  { key: "pre-jogo", label: "Pré-jogo", description: "Análises antes da partida" },
  { key: "pos-jogo", label: "Pós-jogo", description: "Resultados e análises pós-jogo" },
  { key: "analises", label: "Análises", description: "Análises estatísticas de partidas" },
  { key: "validacao", label: "Validação Semanal", description: "Validação de palpites por rodada" },
  { key: "estatisticas", label: "Estatísticas", description: "Análises + validações" },
  { key: "times", label: "Times", description: "Publicações ligadas a times" },
  { key: "ligas", label: "Ligas", description: "Publicações ligadas a ligas" },
  { key: "arquivo", label: "Arquivo", description: "Conteúdo histórico completo" },
];

function feedUrl(key: string, refresh = false) {
  return `${FN_BASE}?feed=${encodeURIComponent(key)}${refresh ? "&refresh=1" : ""}`;
}

export default function AdminRss() {
  const [entitySlug, setEntitySlug] = useState("");
  const [entityKind, setEntityKind] = useState<"time" | "liga" | "temporada">("time");
  const [busy, setBusy] = useState<string | null>(null);

  const stats = useQuery({
    queryKey: ["rss-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rss_feed_stats")
        .select("*")
        .order("last_generated_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  const logs = useQuery({
    queryKey: ["rss-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rss_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const errors = useQuery({
    queryKey: ["rss-errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rss_logs")
        .select("*")
        .eq("event", "error")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const orphans = useQuery({
    queryKey: ["rss-orphan-noticias"],
    queryFn: async () => {
      const { count } = await supabase
        .from("noticias")
        .select("id", { count: "exact", head: true })
        .eq("publicada", true)
        .or("slug.is.null,titulo.is.null,resumo.is.null");
      return count || 0;
    },
  });

  const statByFeed = (k: string) => (stats.data || []).find((s: any) => s.feed === k);

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    toast({ title: "URL copiada", description: url });
  }

  async function regenerate(key: string) {
    setBusy(key);
    try {
      const res = await fetch(feedUrl(key, true), { headers: { "cache-control": "no-cache" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: "Feed regenerado", description: key });
      await Promise.all([stats.refetch(), logs.refetch()]);
    } catch (e: any) {
      toast({ title: "Falha ao regenerar", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  function validate(url: string) {
    window.open(`https://validator.w3.org/feed/check.cgi?url=${encodeURIComponent(url)}`, "_blank");
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rss className="h-6 w-6 text-primary" />
              RSS & Automação
            </h1>
            <p className="text-sm text-muted-foreground">
              Feeds públicos do Statball para Make, Zapier, leitores RSS e automações.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { stats.refetch(); logs.refetch(); errors.refetch(); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar painel
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Feeds configurados</div>
            <div className="text-2xl font-bold">{STATIC_FEEDS.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Acessos registrados</div>
            <div className="text-2xl font-bold">
              {(stats.data || []).reduce((a: number, s: any) => a + (s.total_requests || 0), 0)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Erros (total)</div>
            <div className="text-2xl font-bold text-destructive">
              {(stats.data || []).reduce((a: number, s: any) => a + (s.total_errors || 0), 0)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Notícias publicadas sem dados</div>
            <div className="text-2xl font-bold text-amber-500">{orphans.data ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground mt-1">não entram no RSS</div>
          </Card>
        </div>

        {/* Feeds estáticos */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Feeds disponíveis</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Última geração</TableHead>
                  <TableHead>Req / Erros</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {STATIC_FEEDS.map((f) => {
                  const s = statByFeed(f.key);
                  const url = feedUrl(f.key);
                  const ok = s ? s.last_status === 200 : null;
                  return (
                    <TableRow key={f.key}>
                      <TableCell>
                        <div className="font-medium">{f.label}</div>
                        <div className="text-xs text-muted-foreground">{f.description}</div>
                        <code className="text-[10px] text-muted-foreground break-all">{url}</code>
                      </TableCell>
                      <TableCell>
                        {ok === null ? (
                          <Badge variant="outline">Nunca acessado</Badge>
                        ) : ok ? (
                          <Badge className="bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>
                        ) : (
                          <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erro {s?.last_status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{s?.last_item_count ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {s?.last_generated_at ? new Date(s.last_generated_at).toLocaleString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {s ? `${s.total_requests} / ${s.total_errors}` : "0 / 0"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => copyUrl(url)} title="Copiar URL">
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => window.open(url, "_blank")} title="Abrir feed">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => validate(url)} title="Validar feed">
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === f.key}
                            onClick={() => regenerate(f.key)}
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${busy === f.key ? "animate-spin" : ""}`} />
                            Regenerar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Feeds por entidade */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Feed por entidade</h2>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                value={entityKind}
                onChange={(e) => setEntityKind(e.target.value as any)}
                className="block bg-background border border-border rounded px-3 py-2 text-sm"
              >
                <option value="time">Time</option>
                <option value="liga">Liga</option>
                <option value="temporada">Temporada (ano)</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">
                {entityKind === "temporada" ? "Ano (ex: 2025)" : "Slug"}
              </label>
              <Input
                value={entitySlug}
                onChange={(e) => setEntitySlug(e.target.value)}
                placeholder={entityKind === "temporada" ? "2025" : "flamengo"}
              />
            </div>
            <Button
              disabled={!entitySlug}
              onClick={() => {
                const url = feedUrl(`${entityKind}/${entitySlug}`);
                window.open(url, "_blank");
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" /> Abrir feed
            </Button>
            <Button
              disabled={!entitySlug}
              variant="outline"
              onClick={() => copyUrl(feedUrl(`${entityKind}/${entitySlug}`))}
            >
              <Copy className="h-4 w-4 mr-2" /> Copiar URL
            </Button>
          </div>
        </Card>

        {/* Histórico de erros */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" /> Histórico de erros
          </h2>
          {errors.data && errors.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Feed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.data.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{new Date(e.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><code className="text-xs">{e.feed}</code></TableCell>
                    <TableCell><Badge variant="destructive">{e.status}</Badge></TableCell>
                    <TableCell className="text-xs">{e.error_message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum erro registrado.</p>
          )}
        </Card>

        {/* Acessos recentes */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Últimos acessos</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Feed</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs.data || []).map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><code className="text-xs">{l.feed}</code></TableCell>
                    <TableCell>
                      <Badge variant={l.event === "error" ? "destructive" : "outline"}>{l.event}</Badge>
                    </TableCell>
                    <TableCell>{l.item_count ?? "—"}</TableCell>
                    <TableCell className="text-xs">{l.duration_ms ? `${l.duration_ms}ms` : "—"}</TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate" title={l.user_agent}>
                      {l.origin}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
