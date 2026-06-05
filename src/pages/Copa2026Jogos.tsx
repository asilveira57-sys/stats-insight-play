import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useWC2026Matches } from "@/hooks/useCopa2026";
import { MatchCard } from "@/components/copa2026/MatchCard";
import { useState } from "react";

export default function Copa2026Jogos() {
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const { data, isLoading } = useWC2026Matches({
    stage: stage || undefined, status: status || undefined, group: group || undefined,
  });

  return (
    <Layout>
      <Helmet><title>Jogos — Copa 2026 | Statball</title></Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Jogos da Copa 2026</h1>
        <p className="text-muted-foreground mb-6">{(data ?? []).length} partidas</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="bg-card border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Todas as fases</option>
            <option value="group">Fase de grupos</option>
            <option value="r32">Oitavas (R32)</option>
            <option value="r16">Oitavas</option>
            <option value="qf">Quartas</option>
            <option value="sf">Semifinais</option>
            <option value="third">Disputa 3º</option>
            <option value="final">Final</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-card border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Todos status</option>
            <option value="scheduled">Agendados</option>
            <option value="live">Ao vivo</option>
            <option value="finished">Encerrados</option>
          </select>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="bg-card border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Todos grupos</option>
            {["A","B","C","D","E","F","G","H","I","J","K","L"].map(g => <option key={g} value={g}>Grupo {g}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : (data ?? []).length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Nenhuma partida encontrada.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data!.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
