import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { Link } from "react-router-dom";
import { useBracketProjection, BracketProjectionRow } from "@/hooks/useBracketProjection";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Lock, Info } from "lucide-react";
import { ProjectionExplainDialog } from "@/components/copa2026/ProjectionExplainDialog";

type Match = {
  id: string; stage: string; bracket_position: string | null; match_date: string | null;
  status: string; home_score: number | null; away_score: number | null; winner_team_id: string | null;
  home_team?: { id: string; slug: string; name: string; flag_url: string | null } | null;
  away_team?: { id: string; slug: string; name: string; flag_url: string | null } | null;
};

const STAGES: { keys: string[]; label: string; n: number; prefix: string; projPhase: string }[] = [
  { keys: ["round_of_32", "r32"], label: "32 avos", n: 16, prefix: "R32", projPhase: "round_of_32" },
  { keys: ["round_of_16"], label: "Oitavas", n: 8, prefix: "R16", projPhase: "round_of_16" },
  { keys: ["quarter_final"], label: "Quartas", n: 4, prefix: "QF", projPhase: "quarter_final" },
  { keys: ["semi_final"], label: "Semis", n: 2, prefix: "SF", projPhase: "semi_final" },
  { keys: ["final"], label: "Final", n: 1, prefix: "F", projPhase: "final" },
];


function statusBadge(s: string) {
  if (s === "live") return <span className="text-[9px] uppercase font-bold bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded">Ao vivo</span>;
  if (s === "finished") return <span className="text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded">FT</span>;
  return <span className="text-[9px] uppercase text-muted-foreground">Agendado</span>;
}

function ConfidencePill({ c }: { c: string }) {
  const map: Record<string, string> = {
    high: "bg-emerald-500/20 text-emerald-500",
    medium: "bg-amber-500/20 text-amber-500",
    low: "bg-zinc-500/20 text-zinc-400",
  };
  const labels: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };
  return <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${map[c] ?? map.low}`}>{labels[c] ?? c}</span>;
}

function MatchCell({ m, placeholder }: { m?: Match; placeholder: string }) {
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

function ProjectionCell({ p, placeholder, onExplain }: { p?: BracketProjectionRow; placeholder: string; onExplain?: (p: BracketProjectionRow) => void }) {
  if (!p) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-2 text-xs min-w-[200px]">
        <div className="font-mono opacity-60">{placeholder}</div>
        <div className="opacity-50 italic">A definir</div>
      </div>
    );
  }
  const winnerHome = p.winner_team_id === p.home_team?.id;
  const winnerAway = p.winner_team_id === p.away_team?.id;
  return (
    <button
      type="button"
      onClick={() => onExplain?.(p)}
      className="text-left rounded-lg border border-primary/30 bg-card/70 p-2 min-w-[210px] relative hover:border-primary hover:bg-card transition-colors w-full"
      title="Clique para ver o cálculo estatístico"
    >
      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
        <span className="inline-flex items-center gap-1">
          {p.slot_code}
          {p.is_official_version && <Lock className="w-3 h-3 text-amber-500" />}
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" />
          <ConfidencePill c={p.confidence} />
        </span>
      </div>
      {[
        { team: p.home_team, score: p.home_score, pens: p.home_pens, win: winnerHome },
        { team: p.away_team, score: p.away_score, pens: p.away_pens, win: winnerAway },
      ].map((row, i) => (
        <div key={i} className={`flex items-center justify-between gap-2 py-0.5 ${row.win ? "font-bold text-primary" : "opacity-80"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <TeamFlag team={row.team ?? undefined} size="sm" />
            <span className="truncate text-sm">{row.team?.name ?? "—"}</span>
          </div>
          <span className="tabular-nums text-sm">
            {row.score ?? 0}
            {p.went_to_penalties && row.pens != null && <span className="text-[10px] text-muted-foreground ml-1">({row.pens})</span>}
          </span>
        </div>
      ))}
      <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wide flex items-center gap-1">
        <Info className="w-2.5 h-2.5" />
        Projeção IA{p.went_to_penalties ? " · pênaltis" : ""} · ver cálculo
      </div>
    </button>
  );
}

type Mode = "oficial" | "projecao" | "misto";

export default function Copa2026Chaveamento() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [thirdPlace, setThirdPlace] = useState<Match | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [mode, setMode] = useState<Mode>("misto");
  const [regenerating, setRegenerating] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainProj, setExplainProj] = useState<BracketProjectionRow | undefined>();
  const openExplain = (p: BracketProjectionRow) => { setExplainProj(p); setExplainOpen(true); };

  const { rows: projRows, loading: loadingProj, generatedAt, regenerate } = useBracketProjection("live");

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
      setMatches(list.filter((m) => m.stage !== "third_place"));
      setThirdPlace(list.find((m) => m.stage === "third_place") ?? null);
      setLoadingMatches(false);
    })();
  }, []);

  const projByPhaseSlot = useMemo(() => {
    const m = new Map<string, BracketProjectionRow>();
    for (const r of projRows) m.set(`${r.phase}:${r.slot_code}`, r);
    return m;
  }, [projRows]);

  const loading = loadingMatches || loadingProj;

  const handleRegenerate = async () => {
    setRegenerating(true);
    try { await regenerate(); } finally { setRegenerating(false); }
  };

  const champion = projByPhaseSlot.get("final:F-1");

  return (
    <Layout>
      <Helmet>
        <title>Chaveamento Copa do Mundo 2026 — Projeção IA | Statball</title>
        <meta name="description" content="Chaveamento completo da Copa do Mundo 2026 com projeção automática da IA: campeão, vice, 3º lugar e todos os confrontos do mata-mata projetados em tempo real." />
        <link rel="canonical" href="https://www.statball.com.br/copa-2026/chaveamento" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Chaveamento Copa 2026 — Fases Finais</h1>
        <p className="text-muted-foreground mb-4">
          Resultados oficiais quando confirmados; projeção da IA preenche o restante do chaveamento automaticamente.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {(["oficial", "misto", "projecao"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "oficial" ? "Apenas oficial" : m === "misto" ? "Oficial + Projeção" : "Apenas projeção IA"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${regenerating ? "animate-spin" : ""}`} />
            Atualizar projeção
          </Button>
          {generatedAt && (
            <span className="text-[10px] text-muted-foreground">
              Projeção gerada em {new Date(generatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
        </div>

        {champion?.winner_team && mode !== "oficial" && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-primary/10 p-4 flex items-center gap-4">
            <Sparkles className="w-8 h-8 text-amber-500" />
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Campeão projetado pela IA</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                <TeamFlag team={champion.winner_team} size="md" />
                {champion.winner_team.name}
              </div>
              <div className="text-xs text-muted-foreground">
                Final projetada: {champion.home_team?.name} {champion.home_score}
                {champion.went_to_penalties && champion.home_pens != null ? ` (${champion.home_pens})` : ""}
                {" × "}
                {champion.away_score}
                {champion.went_to_penalties && champion.away_pens != null ? ` (${champion.away_pens})` : ""} {champion.away_team?.name}
              </div>
            </div>
          </div>
        )}

        {loading && <div className="text-muted-foreground">Carregando…</div>}

        {!loading && (
          <>
            <div className="overflow-x-auto">
              <div className="flex gap-6 min-w-max pb-4">
                {STAGES.map((s) => {
                  const list = matches.filter((m) => m.stage === s.key);
                  return (
                    <div key={s.key} className="flex flex-col gap-3">
                      <h2 className="text-sm font-bold uppercase tracking-wide text-primary">{s.label}</h2>
                      <div className="flex flex-col gap-3 justify-around h-full">
                        {Array.from({ length: s.n }, (_, i) => {
                          const placeholder = `${s.prefix}-${i + 1}`;
                          const m = list.find((x) => x.bracket_position === placeholder) ?? list[i];
                          const officialHasTeams = !!(m?.home_team && m?.away_team);
                          const proj = projByPhaseSlot.get(`${s.projPhase}:${placeholder}`);

                          if (mode === "oficial") {
                            return <MatchCell key={placeholder} m={m as any} placeholder={placeholder} />;
                          }
                          if (mode === "projecao") {
                            return <ProjectionCell key={placeholder} p={proj} placeholder={placeholder} onExplain={openExplain} />;
                          }
                          // misto: oficial se tiver times reais, senão projeção
                          if (officialHasTeams) {
                            return <MatchCell key={placeholder} m={m as any} placeholder={placeholder} />;
                          }
                          return <ProjectionCell key={placeholder} p={proj} placeholder={placeholder} onExplain={openExplain} />;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <section className="mt-10">
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary mb-3">Disputa do 3º lugar</h2>
              <div className="max-w-md">
                {mode === "oficial" ? (
                  <MatchCell m={thirdPlace ?? undefined} placeholder="TP" />
                ) : (
                  (() => {
                    const proj = projByPhaseSlot.get("third_place:TP-1");
                    const officialHasTeams = !!(thirdPlace?.home_team && thirdPlace?.away_team);
                    if (mode === "misto" && officialHasTeams) {
                      return <MatchCell m={thirdPlace ?? undefined} placeholder="TP" />;
                    }
                    return <ProjectionCell p={proj} placeholder="TP-1" onExplain={openExplain} />;
                  })()
                )}
              </div>
            </section>
          </>
        )}
      </div>
      <ProjectionExplainDialog open={explainOpen} onOpenChange={setExplainOpen} proj={explainProj} />
    </Layout>
  );
}
