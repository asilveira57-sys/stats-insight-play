import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { Link } from "react-router-dom";

type Match = {
  id: string;
  stage: string;
  bracket_position: string | null;
  match_date: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  home_team?: { id: string; slug: string; name: string; flag_url: string | null } | null;
  away_team?: { id: string; slug: string; name: string; flag_url: string | null } | null;
};

const STAGES: { key: string; label: string; positions: string[] }[] = [
  { key: "R32", label: "Round of 32", positions: Array.from({ length: 16 }, (_, i) => `R32-${i + 1}`) },
  { key: "R16", label: "Oitavas", positions: Array.from({ length: 8 }, (_, i) => `R16-${i + 1}`) },
  { key: "QF", label: "Quartas", positions: Array.from({ length: 4 }, (_, i) => `QF-${i + 1}`) },
  { key: "SF", label: "Semifinais", positions: Array.from({ length: 2 }, (_, i) => `SF-${i + 1}`) },
  { key: "F", label: "Final", positions: ["F"] },
];

function MatchCell({ m, placeholder }: { m?: Match; placeholder: string }) {
  if (!m) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-2 text-xs text-muted-foreground min-w-[160px]">
        <div className="font-mono opacity-70">{placeholder}</div>
        <div className="opacity-50">A definir</div>
      </div>
    );
  }
  const finished = m.status === "finished";
  const winnerHome = finished && m.winner_team_id === m.home_team?.id;
  const winnerAway = finished && m.winner_team_id === m.away_team?.id;
  return (
    <Link
      to={`/copa-2026/jogos/${m.id}`}
      className="block rounded-lg border border-border bg-card hover:border-primary/60 transition-colors p-2 min-w-[180px]"
    >
      <div className="text-[10px] font-mono text-muted-foreground mb-1">{m.bracket_position ?? placeholder}</div>
      {[
        { team: m.home_team, score: m.home_score, win: winnerHome },
        { team: m.away_team, score: m.away_score, win: winnerAway },
      ].map((row, i) => (
        <div key={i} className={`flex items-center justify-between gap-2 py-0.5 ${row.win ? "font-bold text-primary" : ""}`}>
          <div className="flex items-center gap-2 min-w-0">
            <TeamFlag team={row.team ?? undefined} size="sm" />
            <span className="truncate text-sm">{row.team?.name ?? "—"}</span>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("world_cup_2026_matches")
        .select(`id, stage, bracket_position, match_date, status, home_score, away_score, winner_team_id,
          home_team:home_team_id(id, slug, name, flag_url),
          away_team:away_team_id(id, slug, name, flag_url)`)
        .neq("stage", "group")
        .order("bracket_position", { ascending: true });
      setMatches((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const byPos = new Map(matches.map(m => [m.bracket_position, m]));

  return (
    <Layout>
      <Helmet>
        <title>Chaveamento Copa do Mundo 2026 — Mata-mata | Statball</title>
        <meta name="description" content="Chaveamento completo do mata-mata da Copa do Mundo 2026: round de 32, oitavas, quartas, semifinais, disputa de 3º e final. Atualizado em tempo real." />
        <link rel="canonical" href="https://www.statball.com.br/copa-2026/chaveamento" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Chaveamento Copa 2026</h1>
        <p className="text-muted-foreground mb-6">Acompanhe o mata-mata da Copa do Mundo 2026. Os jogos avançam automaticamente conforme os resultados são oficializados.</p>

        {loading && <div className="text-muted-foreground">Carregando…</div>}
        {!loading && (
          <div className="overflow-x-auto">
            <div className="flex gap-6 min-w-max pb-4">
              {STAGES.map(s => (
                <div key={s.key} className="flex flex-col gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-primary">{s.label}</h2>
                  <div className="flex flex-col gap-3 justify-around h-full">
                    {s.positions.map(pos => (
                      <MatchCell key={pos} m={byPos.get(pos) as Match | undefined} placeholder={pos} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground mt-4">
            O chaveamento será preenchido após o término da fase de grupos. Use o admin para gerar os placeholders.
          </div>
        )}
      </div>
    </Layout>
  );
}
