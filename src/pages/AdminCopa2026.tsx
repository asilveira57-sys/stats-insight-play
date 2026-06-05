import { Layout } from "@/components/layout/Layout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

export default function AdminCopa2026() {
  const { isAdmin, loading } = useAdminAccess();
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

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

  if (loading) return <Layout><div className="container mx-auto px-4 py-8">Carregando...</div></Layout>;
  if (!isAdmin) return <Layout><div className="container mx-auto px-4 py-8">Acesso negado.</div></Layout>;

  const fns = [
    { id: "wc2026-sync-fixtures", label: "Sincronizar fixtures (API-Football)" },
    { id: "wc2026-update-standings", label: "Recalcular tabela dos grupos" },
    { id: "wc2026-ai-generate", label: "Gerar análise IA (exemplo)", body: { analysis_type: "group_preview" } },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Admin Copa 2026</h1>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fns.map(f => (
            <Button key={f.id} onClick={() => run(f.id, f.body)} disabled={busy === f.id} variant="outline">
              {busy === f.id ? "Executando..." : f.label}
            </Button>
          ))}
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
