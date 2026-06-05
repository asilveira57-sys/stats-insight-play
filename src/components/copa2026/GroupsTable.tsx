import { useWC2026Standings } from "@/hooks/useCopa2026";
import { TeamFlag } from "./TeamCard";
import { Link } from "react-router-dom";

export function GroupsTable() {
  const { data, isLoading } = useWC2026Standings();
  if (isLoading) return <div className="text-muted-foreground text-sm">Carregando grupos...</div>;
  const groups = new Map<string, any[]>();
  for (const row of data ?? []) {
    if (!groups.has(row.group_letter)) groups.set(row.group_letter, []);
    groups.get(row.group_letter)!.push(row);
  }
  if (groups.size === 0) return <div className="text-muted-foreground text-sm">Tabela de grupos será exibida assim que a competição começar.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from(groups.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([letter, rows]) => (
        <div key={letter} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2 bg-primary/10 border-b border-border font-bold text-sm">Grupo {letter}</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 font-normal">#</th>
                <th className="text-left px-1 py-2 font-normal">Seleção</th>
                <th className="text-center py-2 font-normal">P</th>
                <th className="text-center py-2 font-normal">J</th>
                <th className="text-center py-2 font-normal">SG</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground">{r.position}</td>
                  <td className="py-2">
                    <Link to={`/copa-2026/selecoes/${r.team?.slug}`} className="flex items-center gap-2 hover:text-primary">
                      <TeamFlag team={r.team} size="sm" />
                      <span className="truncate">{r.team?.name}</span>
                    </Link>
                  </td>
                  <td className="text-center font-semibold">{r.points}</td>
                  <td className="text-center text-muted-foreground">{r.played}</td>
                  <td className="text-center text-muted-foreground">{r.goal_difference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
