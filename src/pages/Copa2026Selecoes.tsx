import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useWC2026Teams } from "@/hooks/useCopa2026";
import { TeamCard } from "@/components/copa2026/TeamCard";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

export default function Copa2026Selecoes() {
  const [group, setGroup] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const { data, isLoading } = useWC2026Teams({ group: group || undefined, status: status || undefined });
  const filtered = useMemo(() => (data ?? []).filter(t => !q || t.name.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const groups = ["A","B","C","D","E","F","G","H","I","J","K","L"];

  return (
    <Layout>
      <Helmet><title>Seleções — Copa 2026 | Statball</title></Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Seleções da Copa 2026</h1>
        <p className="text-muted-foreground mb-6">{filtered.length} seleções</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <Input placeholder="Buscar seleção..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="bg-card border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Todos os grupos</option>
            {groups.map(g => <option key={g} value={g}>Grupo {g}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-card border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="qualified">Classificadas</option>
            <option value="eliminated">Eliminadas</option>
            <option value="champion">Campeão</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            Nenhuma seleção carregada ainda. Use o painel admin para sincronizar com a API.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(t => <TeamCard key={t.id} team={t} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
