import { useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Download, Target, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useCopa2026Realtime } from "@/hooks/useCopa2026Realtime";
import { AuditDashboard } from "@/components/audit/AuditDashboard";
import { computeAuditMetrics } from "@/lib/auditMetrics";


const STAGE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "32 avos",
  round_of_16: "Oitavas",
  quarter_final: "Quartas",
  semi_final: "Semifinais",
  third_place: "3º lugar",
  final: "Final",
};

type Row = {
  match_id: string;
  match_date: string | null;
  stage: string;
  group_letter: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: { name: string; slug: string; flag_url: string | null } | null;
  away: { name: string; slug: string; flag_url: string | null } | null;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  confidence_score: number | null;
  title: string | null;
};

function confidenceBucket(c: number | null) {
  if (c == null) return { key: "low", label: "Baixa", className: "bg-muted text-muted-foreground" };
  if (c >= 0.7) return { key: "high", label: "Alta", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };
  if (c >= 0.5) return { key: "medium", label: "Média", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
  return { key: "low", label: "Baixa", className: "bg-muted text-muted-foreground" };
}

function predictedResult(h: number | null, a: number | null) {
  if (h == null || a == null) return "—";
  if (h > a) return "Casa";
  if (a > h) return "Fora";
  return "Empate";
}

function csvEscape(v: any) {
  const s = v == null ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(rows: Row[]) {
  const headers = ["Data UTC-3", "Fase", "Grupo", "Casa", "Fora", "Placar previsto", "Resultado previsto", "Confiança", "Placar real", "Status"];
  const lines = [headers.join(";")];
  for (const r of rows) {
    const d = r.match_date ? new Date(r.match_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
    const pred = (r.predicted_home_score != null && r.predicted_away_score != null) ? `${r.predicted_home_score} x ${r.predicted_away_score}` : "";
    const real = (r.home_score != null && r.away_score != null) ? `${r.home_score} x ${r.away_score}` : "";
    lines.push([
      d, STAGE_LABELS[r.stage] ?? r.stage, r.group_letter ?? "",
      r.home?.name ?? "", r.away?.name ?? "",
      pred, predictedResult(r.predicted_home_score, r.predicted_away_score),
      r.confidence_score != null ? `${Math.round(r.confidence_score * 100)}%` : "",
      real, r.status,
    ].map(csvEscape).join(";"));
  }
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `copa2026-palpites-ia-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function Copa2026PalpitesIA() {
  useCopa2026Realtime();
  const [stage, setStage] = useState<string>("all");
  const [group, setGroup] = useState<string>("all");
  const [conf, setConf] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");


  const { data, isLoading } = useQuery({
    queryKey: ["wc2026", "palpites-ia"],
    queryFn: async () => {
      // Fetch all pre_match analyses with predicted scores, join match info
      const { data: analyses, error } = await supabase
        .from("world_cup_2026_ai_analyses")
        .select(`match_id, predicted_home_score, predicted_away_score, confidence_score, title,
          match:match_id(id, match_date, stage, group_letter, status, home_score, away_score,
            home:home_team_id(name, slug, flag_url),
            away:away_team_id(name, slug, flag_url))`)
        .eq("analysis_type", "pre_match")
        .not("predicted_home_score", "is", null);
      if (error) throw error;
      const rows: Row[] = (analyses ?? [])
        .filter((a: any) => a.match)
        .map((a: any) => ({
          match_id: a.match.id,
          match_date: a.match.match_date,
          stage: a.match.stage,
          group_letter: a.match.group_letter,
          status: a.match.status,
          home_score: a.match.home_score,
          away_score: a.match.away_score,
          home: a.match.home,
          away: a.match.away,
          predicted_home_score: a.predicted_home_score,
          predicted_away_score: a.predicted_away_score,
          confidence_score: a.confidence_score,
          title: a.title,
        }))
        .sort((a, b) => (a.match_date ?? "").localeCompare(b.match_date ?? ""));
      return rows;
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(r => {
      if (stage !== "all" && r.stage !== stage) return false;
      if (group !== "all" && r.group_letter !== group) return false;
      if (status !== "all" && r.status !== status) return false;
      if (conf !== "all" && confidenceBucket(r.confidence_score).key !== conf) return false;
      return true;
    });
  }, [data, stage, group, conf, status]);

  const audit = useMemo(
    () =>
      computeAuditMetrics(
        filtered
          .filter((r) => r.status === "finished")
          .map((r) => ({
            predHome: r.predicted_home_score,
            predAway: r.predicted_away_score,
            realHome: r.home_score,
            realAway: r.away_score,
          }))
      ),
    [filtered]
  );

  const stats = useMemo(() => ({ total: filtered.length }), [filtered]);


  const groups = useMemo(() => Array.from(new Set((data ?? []).map(r => r.group_letter).filter(Boolean) as string[])).sort(), [data]);

  return (
    <Layout>
      <Helmet>
        <title>Palpites IA em Lote — Copa do Mundo 2026 | Aleball</title>
        <meta name="description" content="Veja em uma única tela os placares previstos pelo Aleball para todos os jogos da Copa 2026 com confiança, taxa de acerto e exportação em CSV." />
        <link rel="canonical" href="https://www.aleball.com/copa-2026/palpites-ia" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-1">
              <Sparkles className="w-4 h-4" /> Inteligência Aleball
            </div>
            <h1 className="text-3xl font-bold">Palpites IA em lote — Copa 2026</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
              Placares previstos pelo modelo estatístico do Aleball para cada um dos jogos da Copa, com nível de confiança e cruzamento com o resultado real.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadCSV(filtered)} disabled={!filtered.length}>
              <Download className="w-4 h-4 mr-2" />Exportar CSV
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <AuditDashboard
            metrics={audit}
            title="Dashboard de auditoria — Copa do Mundo 2026"
            subtitle={`${stats.total} jogos no filtro atual · percentuais sobre jogos encerrados com palpite registrado.`}
          />
        </div>


        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger><SelectValue placeholder="Fase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {Object.entries(STAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map(g => <SelectItem key={g} value={g}>Grupo {g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={conf} onValueChange={setConf}>
            <SelectTrigger><SelectValue placeholder="Confiança" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda confiança</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="scheduled">Agendados</SelectItem>
              <SelectItem value="live">Ao vivo</SelectItem>
              <SelectItem value="finished">Encerrados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center">Carregando previsões…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhuma previsão encontrada com os filtros atuais.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Fase</th>
                  <th className="px-3 py-2 font-medium">Jogo</th>
                  <th className="px-3 py-2 font-medium text-center">Previsto</th>
                  <th className="px-3 py-2 font-medium text-center">Confiança</th>
                  <th className="px-3 py-2 font-medium text-center">Real</th>
                  <th className="px-3 py-2 font-medium text-right">Análise</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const c = confidenceBucket(r.confidence_score);
                  const finished = r.status === "finished";
                  const exact = finished && r.home_score === r.predicted_home_score && r.away_score === r.predicted_away_score;
                  return (
                    <tr key={r.match_id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {r.match_date ? new Date(r.match_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {STAGE_LABELS[r.stage] ?? r.stage}{r.group_letter ? ` · ${r.group_letter}` : ""}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamFlag team={r.home ?? undefined} size="sm" />
                          <span className="truncate">{r.home?.name ?? "—"}</span>
                          <span className="text-muted-foreground mx-1">×</span>
                          <TeamFlag team={r.away ?? undefined} size="sm" />
                          <span className="truncate">{r.away?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-semibold tabular-nums">
                        {r.predicted_home_score} - {r.predicted_away_score}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline" className={c.className}>{c.label}</Badge>
                      </td>
                      <td className="px-3 py-2 text-center font-mono tabular-nums">
                        {finished ? (
                          <span className={exact ? "text-emerald-500 font-bold" : ""}>{r.home_score} - {r.away_score}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link to={`/copa-2026/jogos/${r.match_id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <LinkIcon className="w-3 h-3" /> Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-xs text-muted-foreground flex items-center gap-2">
          <Target className="w-3.5 h-3.5" />
          Previsões geradas a partir de histórico, elencos e desempenho recente. Conteúdo editorial / estatístico — não constitui aconselhamento de apostas.
        </div>
      </div>
    </Layout>
  );
}

function StatBox({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
