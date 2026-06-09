import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useWC2026Matches } from "@/hooks/useCopa2026";
import { MatchCard } from "@/components/copa2026/MatchCard";
import { useMemo, useState } from "react";

const STAGES = [
  { v: "", label: "Todas as fases" },
  { v: "group", label: "Fase de grupos" },
  { v: "round_of_32", label: "Segunda fase (32 avos)" },
  { v: "round_of_16", label: "Oitavas de final" },
  { v: "quarter_final", label: "Quartas de final" },
  { v: "semi_final", label: "Semifinais" },
  { v: "third_place", label: "Disputa do 3º lugar" },
  { v: "final", label: "Final" },
];

export default function Copa2026Jogos() {
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const { data, isLoading } = useWC2026Matches({
    stage: stage || undefined, status: status || undefined, group: group || undefined,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const m of data ?? []) {
      const key = m.stage === "group"
        ? `Grupo ${m.group_letter ?? "?"} — ${m.match_round ? `${m.match_round}ª rodada` : "Rodada a definir"}`
        : (STAGES.find(s => s.v === m.stage)?.label ?? m.stage);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <Layout>
      <Helmet>
        <title>Jogos da Copa do Mundo 2026 — Tabela completa | Statball</title>
        <meta name="description" content="Calendário completo da Copa do Mundo 2026: fase de grupos, mata-mata, datas, horários e estádios. Filtre por fase, grupo ou status." />
        <link rel="canonical" href="https://www.statball.com.br/copa-2026/jogos" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Jogos da Copa 2026</h1>
        <p className="text-muted-foreground mb-6">{(data ?? []).length} partidas</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="bg-card border border-border rounded-md px-3 py-2 text-sm">
            {STAGES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
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
          <div className="space-y-8">
            {grouped.map(([label, list]) => (
              <section key={label}>
                <h2 className="text-lg font-bold mb-3 text-primary">{label} <span className="text-muted-foreground text-sm font-normal">({list.length})</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
