import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { Link } from "react-router-dom";

type Match = {
  id: string; stage: string; bracket_position: string | null; match_date: string | null;
  status: string; home_score: number | null; away_score: number | null; winner_team_id: string | null;
  home_team?: { id: string; slug: string; name: string; flag_url: string | null } | null;
  away_team?: { id: string; slug: string; name: string; flag_url: string | null } | null;
};

const STAGES: { key: string; label: string; n: number; prefix: string }[] = [
  { key: "round_of_32", label: "32 avos", n: 16, prefix: "R32" },
  { key: "round_of_16", label: "Oitavas", n: 8, prefix: "R16" },
  { key: "quarter_final", label: "Quartas", n: 4, prefix: "QF" },
  { key: "semi_final", label: "Semis", n: 2, prefix: "SF" },
  { key: "final", label: "Final", n: 1, prefix: "F" },
];

function statusBadge(s: string) {
  if (s === "live") return <span className="text-[9px] uppercase font-bold bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded">Ao vivo</span>;
  if (s === "finished") return <span className="text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded">FT</span>;
  return <span className="text-[9px] uppercase text-muted-foreground">Agendado</span>;
}

function MatchCell({ m, placeholder, idx }: { m?: Match; placeholder: string; idx: number }) {
  if (!m) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-2 text-xs min-w-[180px]">
        <div className="font-mono opacity-60">{placeholder}</div>
        <div className="opacity-50 italic">A definir</div>
      </div>
    );
  }
  const finished = m.status === "finished";
  const winnerHome = finished && m.winner_team_id === m.home_team?.id;
  const winnerAway = finished && m.winner_team_id === m.away_team?.id;
  return (
    <Link to={`/copa-2026/jogos/${m.id}`} className="block rounded-lg border border-border bg-card hover:border-primary/60 transition-colors p-2 min-w-[200px]">
      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
        <span>{m.bracket_position ?? placeholder}</span>
        {statusBadge(m.status)}
      </div>
      {[
        { team: m.home_team, score: m.home_score, win: winnerHome },
        { team: m.away_team, score: m.away_score, win: winnerAway },
      ].map((row, i) => (
        <div key={i} className={`flex items-center justify-between gap-2 py-0.5 ${row.win ? "font-bold text-primary" : ""}`}>
          <div className="flex items-center gap-2 min-w-0">
            <TeamFlag team={row.team ?? undefined} size="sm" />
            <span className="truncate text-sm">{row.team?.name ?? "A definir"}</span>
          </div>
          <span className="tabular-nums text-sm">{finished ? row.score ?? 0 : ""}</span>
        </div>
      ))}
      {!finished && m.match_date && (
        <div className="text-[10px] text-muted-foreground mt-1">
          {new Date(m.match_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
        </div>
      )}
    </Link>
  );
}

export default function Copa2026Chaveamento() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [thirdPlace, setThirdPlace] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("world_cup_2026_matches")
        .select(`id, stage, bracket_position, match_date, status, home_score, away_score, winner_team_id,
          home_team:home_team_id(id, slug, name, flag_url),
          away_team:away_team_id(id, slug, name, flag_url)`)
        .neq("stage", "group")
        .order("match_date");
      const list = (data ?? []) as any[];
      setMatches(list.filter(m => m.stage !== "third_place"));
      setThirdPlace(list.find(m => m.stage === "third_place") ?? null);
      setLoading(false);
    })();
  }, []);

  const byStage = new Map<string, Match[]>();
  for (const s of STAGES) byStage.set(s.key, []);
  for (const m of matches) {
    if (byStage.has(m.stage)) byStage.get(m.stage)!.push(m);
  }

  return (
    <Layout>
      <Helmet>
        <title>Chaveamento Copa do Mundo 2026 — Mata-mata | Statball</title>
        <meta name="description" content="Chaveamento completo do mata-mata da Copa do Mundo 2026: 32 avos, oitavas, quartas, semifinais, disputa de 3º e final. Bracket interativo atualizado em tempo real." />
        <link rel="canonical" href="https://www.statball.com.br/copa-2026/chaveamento" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Chaveamento Copa 2026 — Fases Finais</h1>
        <p className="text-muted-foreground mb-6">Acompanhe o caminho até o título. Os vencedores avançam automaticamente conforme os resultados são oficializados.</p>

        {loading && <div className="text-muted-foreground">Carregando…</div>}

        {!loading && (
          <>
            <div className="overflow-x-auto">
              <div className="flex gap-6 min-w-max pb-4">
                {STAGES.map(s => {
                  const list = byStage.get(s.key) ?? [];
                  const cells = Array.from({ length: s.n }, (_, i) => {
                    const placeholder = `${s.prefix}-${i+1}`;
                    const m = list.find(x => x.bracket_position === placeholder) ?? list[i];
                    return { placeholder, m };
                  });
                  return (
                    <div key={s.key} className="flex flex-col gap-3">
                      <h2 className="text-sm font-bold uppercase tracking-wide text-primary">{s.label}</h2>
                      <div className="flex flex-col gap-3 justify-around h-full">
                        {cells.map((c, idx) => (
                          <MatchCell key={c.placeholder} m={c.m as any} placeholder={c.placeholder} idx={idx} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {thirdPlace && (
              <section className="mt-10">
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary mb-3">Disputa do 3º lugar</h2>
                <div className="max-w-md"><MatchCell m={thirdPlace} placeholder="TP" idx={0} /></div>
              </section>
            )}

            {matches.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground mt-4">
                O chaveamento será preenchido após o término da fase de grupos. Use o admin para vincular placeholders.
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
