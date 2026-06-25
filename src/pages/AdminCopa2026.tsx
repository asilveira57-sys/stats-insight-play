import { Layout } from "@/components/layout/Layout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

export default function AdminCopa2026() {
  const { isAdmin, isLoading: loading } = useAdminAccess();
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const loadLogs = async () => {
    const { data } = await supabase.from("world_cup_2026_sync_logs")
      .select("*").order("started_at", { ascending: false });
    setLogs((data ?? []).slice(0, 50));
  };
  useEffect(() => { if (isAdmin) loadLogs(); }, [isAdmin]);

  const run = async (fn: string, body: any = {}) => {
    setBusy(fn);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      toast({ title: `${fn} ok`, description: JSON.stringify(data).slice(0, 200) });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
      loadLogs();
    }
  };

  const seedAllHistory = async () => {
    setBusy("seed-history-all");
    setProgress("");
    try {
      const idx = await fetch("/data/wc-history/index.json").then(r => r.json());
      const slugs: string[] = idx.slugs ?? [];
      let ok = 0, fail = 0;
      for (let i = 0; i < slugs.length; i++) {
        const slug = slugs[i];
        setProgress(`Seed ${i + 1}/${slugs.length}: ${slug}`);
        try {
          const payload = await fetch(`/data/wc-history/${slug}.json`).then(r => r.json());
          const { error } = await supabase.functions.invoke("wc2026-seed-history", { body: { slug, payload } });
          if (error) throw error;
          ok++;
        } catch (e) { fail++; console.error("seed", slug, e); }
      }
      toast({ title: "Seed concluído", description: `${ok} ok / ${fail} falhas` });
    } catch (e: any) {
      toast({ title: "Erro seed", description: e.message ?? String(e), variant: "destructive" });
    } finally { setBusy(null); setProgress(""); loadLogs(); }
  };

  const generateSeoAll = async () => {
    setBusy("seo-all");
    setProgress("");
    try {
      const idx = await fetch("/data/wc-history/index.json").then(r => r.json());
      const slugs: string[] = idx.slugs ?? [];
      let ok = 0, fail = 0;
      for (let i = 0; i < slugs.length; i++) {
        const slug = slugs[i];
        setProgress(`SEO ${i + 1}/${slugs.length}: ${slug}`);
        try {
          const { error } = await supabase.functions.invoke("wc2026-generate-team-seo", { body: { slug } });
          if (error) throw error;
          ok++;
        } catch (e) { fail++; console.error("seo", slug, e); }
        await new Promise(r => setTimeout(r, 1500)); // rate-limit IA
      }
      toast({ title: "SEO gerado", description: `${ok} ok / ${fail} falhas` });
    } catch (e: any) {
      toast({ title: "Erro SEO", description: e.message ?? String(e), variant: "destructive" });
    } finally { setBusy(null); setProgress(""); loadLogs(); }
  };

  const generateAllPreviews = async (force = false) => {
    setBusy("previews-all");
    setProgress("Disparando batch em background...");
    try {
      const { data, error } = await supabase.functions.invoke("wc2026-batch-previews", { body: { force } });
      if (error) throw error;
      toast({
        title: "Batch iniciado",
        description: `Rodando em background (concorrência 5). Acompanhe na tabela de logs (tipo: ai_preview_batch). ${(data as any)?.log_id ?? ""}`,
      });
      // Poll logs every 5s for ~10 minutes
      let tries = 0;
      const poll = setInterval(async () => {
        tries++;
        const { data: log } = await supabase.from("world_cup_2026_sync_logs")
          .select("status, error_message, records_processed")
          .eq("id", (data as any)?.log_id).maybeSingle();
        if (log) setProgress(`Batch (${log.status}): ${log.error_message ?? `${log.records_processed} ok`}`);
        if (!log || log.status !== "running" || tries > 120) {
          clearInterval(poll);
          loadLogs();
        }
      }, 5000);
    } catch (e: any) {
      toast({ title: "Erro previews", description: e.message ?? String(e), variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (loading) return <Layout><div className="container mx-auto px-4 py-8">Carregando...</div></Layout>;
  if (!isAdmin) return <Layout><div className="container mx-auto px-4 py-8">Acesso negado.</div></Layout>;

  const fns = [
    { id: "wc2026-sync-fixtures", label: "Sincronizar fixtures (API-Football)" },
    { id: "wc2026-backfill-groups", label: "🧮 Preencher grupos + zerar classificação" },
    { id: "wc2026-update-standings", label: "Recalcular tabela dos grupos" },
    { id: "wc2026-link-bracket", label: "🔗 Vincular jogos ao chaveamento (R32→Final)" },
    { id: "wc2026-resolve-team-ids", label: "Resolver IDs API-Football (todas)" },
    { id: "wc2026-sync-flags", label: "🇧🇷 Sincronizar bandeiras coloridas (TODAS)" },
    { id: "wc2026-normalize-teams", label: "Normalizar seleções (mesclar PT/EN)" },
    { id: "wc2026-sync-squads", label: "Sincronizar elenco-base de TODAS" },
    { id: "wc2026-sync-squads", label: "Sincronizar convocação OFICIAL (mai/2026+)", body: { official: true } },
    { id: "wc2026-sync-coach", label: "Sincronizar técnicos de TODAS" },
    { id: "wc2026-seed-bracket", label: "🏆 Criar chaveamento (placeholders mata-mata)" },
    { id: "wc2026-advance-bracket", label: "Avançar chaveamento (recomputar vencedores)" },
    { id: "wc2026-ai-generate", label: "Gerar análise IA (exemplo)", body: { analysis_type: "group_preview" } },
    { id: "wc2026-sync-odds", label: "💰 Sincronizar odds (próximos jogos)" },
    { id: "wc2026-sync-odds", label: "💰 Sincronizar odds (TODOS os jogos)", body: { all: true, limit: 500 } },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Admin Copa 2026</h1>

        {progress && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">{progress}</div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fns.map((f, i) => (
            <Button key={`${f.id}-${i}`} onClick={() => run(f.id, f.body)} disabled={!!busy} variant="outline">
              {busy === f.id ? "Executando..." : f.label}
            </Button>
          ))}
          <Button onClick={seedAllHistory} disabled={!!busy} variant="default">
            {busy === "seed-history-all" ? "Seedando..." : "Seed histórico de TODAS as seleções"}
          </Button>
          <Button onClick={generateSeoAll} disabled={!!busy} variant="default">
            {busy === "seo-all" ? "Gerando SEO..." : "Gerar resumo IA + SEO de TODAS"}
          </Button>
          <Button onClick={() => generateAllPreviews(false)} disabled={!!busy} variant="default">
            {busy === "previews-all" ? "Gerando previews..." : "🤖 Análise pré-jogo IA — TODOS (background)"}
          </Button>
          <Button onClick={() => generateAllPreviews(true)} disabled={!!busy} variant="destructive">
            {busy === "previews-all" ? "Regerando..." : "♻️ Regerar TODAS as análises (force)"}
          </Button>
          <Button
            onClick={async () => {
              setBusy("publish-news");
              setProgress("Publicando notícias da Fase 1 em background...");
              try {
                const { data, error } = await supabase.functions.invoke("wc2026-publish-news-batch", { body: { stage: "group", force: false } });
                if (error) throw error;
                const logId = (data as any)?.log_id;
                toast({ title: "Publicação iniciada", description: `Acompanhe nos logs (news_publish_batch). ${logId ?? ""}` });
                let tries = 0;
                const poll = setInterval(async () => {
                  tries++;
                  const { data: log } = await supabase.from("world_cup_2026_sync_logs")
                    .select("status, error_message, records_processed")
                    .eq("id", logId).maybeSingle();
                  if (log) setProgress(`Notícias (${log.status}): ${log.error_message ?? `${log.records_processed} ok`}`);
                  if (!log || log.status !== "running" || tries > 180) { clearInterval(poll); loadLogs(); }
                }, 5000);
              } catch (e: any) {
                toast({ title: "Erro publicação", description: e.message ?? String(e), variant: "destructive" });
              } finally { setBusy(null); }
            }}
            disabled={!!busy}
            variant="default"
          >
            {busy === "publish-news" ? "Publicando..." : "📰 Publicar notícias pré-jogo — Fase 1 (group)"}
          </Button>

          <Button
            onClick={async () => {
              setBusy("regen-everything");
              setProgress("REGERANDO TUDO (textos + imagens) da Fase 1 em background...");
              try {
                const { data, error } = await supabase.functions.invoke("wc2026-publish-news-batch", { body: { stage: "group", force: true } });
                if (error) throw error;
                const logId = (data as any)?.log_id;
                toast({ title: "Regeneração total iniciada", description: `Textos e imagens. Acompanhe nos logs. ${logId ?? ""}` });
                let tries = 0;
                const poll = setInterval(async () => {
                  tries++;
                  const { data: log } = await supabase.from("world_cup_2026_sync_logs")
                    .select("status, error_message, records_processed")
                    .eq("id", logId).maybeSingle();
                  if (log) setProgress(`Regerando (${log.status}): ${log.error_message ?? `${log.records_processed} ok`}`);
                  if (!log || log.status !== "running" || tries > 360) { clearInterval(poll); loadLogs(); }
                }, 8000);
              } catch (e: any) {
                toast({ title: "Erro regen", description: e.message ?? String(e), variant: "destructive" });
              } finally { setBusy(null); }
            }}
            disabled={!!busy}
            variant="destructive"
          >
            {busy === "regen-everything" ? "Regerando..." : "♻️ REGERAR TUDO (textos + imagens únicas) — Fase 1"}
          </Button>

        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Logs de sincronização</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr><th className="px-3 py-2 text-left">Início</th><th className="text-left">Tipo</th><th className="text-left">Provider</th><th className="text-left">Status</th><th className="text-center">Registros</th><th className="text-left">Erro</th></tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-3 py-2">{new Date(l.started_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                    <td>{l.sync_type}</td>
                    <td>{l.provider}</td>
                    <td><span className={l.status === "error" ? "text-destructive" : l.status === "success" ? "text-emerald-500" : ""}>{l.status}</span></td>
                    <td className="text-center">{l.records_processed ?? 0}</td>
                    <td className="text-xs text-muted-foreground max-w-xs truncate">{l.error_message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}
