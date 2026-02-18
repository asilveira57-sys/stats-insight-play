import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Loader2,
  Shield,
  Trophy,
  Calendar,
  Users,
  Search,
} from "lucide-react";
import { useMergeReport, type TeamReportData, type MergeReport } from "@/hooks/useMergeReport";

interface PreMergeReportModalProps {
  open: boolean;
  onClose: () => void;
  teamAId: string | null;
  teamAName: string;
  teamBId: string | null;
  teamBName: string;
  onReportLoaded?: () => void;
}

export function PreMergeReportModal({
  open,
  onClose,
  teamAId,
  teamAName,
  teamBId,
  teamBName,
  onReportLoaded,
}: PreMergeReportModalProps) {
  const { data: report, isLoading, error, refresh } = useMergeReport(
    open ? teamAId : null,
    open ? teamBId : null
  );
  const [matchFilter, setMatchFilter] = useState("");
  const [matchPage, setMatchPage] = useState(0);
  const MATCHES_PER_PAGE = 50;

  // Notify parent when report loads
  if (report && onReportLoaded) {
    onReportLoaded();
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "baixo": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medio": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "alto": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "baixo": return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "medio": return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case "alto": return <XCircle className="h-5 w-5 text-red-400" />;
      default: return null;
    }
  };

  const exportTeamCSV = (team: TeamReportData) => {
    const headers = "Data,Liga,Mandante,Visitante,Placar Casa,Placar Fora,Status\n";
    const rows = team.matches.map(m =>
      `${m.data},"${m.liga_nome || ''}","${m.time_casa_nome}","${m.time_fora_nome}",${m.gols_casa ?? ''},${m.gols_fora ?? ''},${m.status}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partidas-${team.slug || team.nome.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportComparativeCSV = (report: MergeReport) => {
    const rows = [
      "Métrica,Time A,Time B",
      `Nome,"${report.team_a.nome}","${report.team_b.nome}"`,
      `Total Partidas,${report.team_a.total_matches},${report.team_b.total_matches}`,
      `Primeira Data,${report.team_a.first_match_date || 'N/A'},${report.team_b.first_match_date || 'N/A'}`,
      `Última Data,${report.team_a.last_match_date || 'N/A'},${report.team_b.last_match_date || 'N/A'}`,
      `Vitórias,${report.team_a.stats.wins},${report.team_b.stats.wins}`,
      `Empates,${report.team_a.stats.draws},${report.team_b.stats.draws}`,
      `Derrotas,${report.team_a.stats.losses},${report.team_b.stats.losses}`,
      `Gols Pró,${report.team_a.stats.goals_for},${report.team_b.stats.goals_for}`,
      `Gols Contra,${report.team_a.stats.goals_against},${report.team_b.stats.goals_against}`,
      `Saldo,${report.team_a.stats.goal_difference},${report.team_b.stats.goal_difference}`,
      `Score Similaridade,${report.similarity.similarity_score},`,
      `Nível Risco,${report.similarity.risk_level},`,
      `Recomendação,"${report.similarity.recommendation_text}",`,
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparativo-fusao.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório Pré-Fusão
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Gerando relatório completo...</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
            <Skeleton className="h-24" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erro ao gerar relatório: {(error as Error).message}
            </AlertDescription>
          </Alert>
        )}

        {report && (
          <div className="space-y-6">
            {/* Score + Risk Header */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-4">
                {getRiskIcon(report.similarity.risk_level)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{report.similarity.similarity_score}</span>
                    <span className="text-muted-foreground">/100</span>
                    <Badge className={getRiskColor(report.similarity.risk_level)}>
                      Risco {report.similarity.risk_level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.similarity.recommendation_text}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => refresh()}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Atualizar
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportComparativeCSV(report)}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV Comparativo
                </Button>
              </div>
            </div>

            {/* Reasons */}
            {report.similarity.top_reasons.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {report.similarity.top_reasons.map((reason, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}

            {/* Side-by-side Summary */}
            <div className="grid grid-cols-2 gap-4">
              <TeamSummaryCard team={report.team_a} label="Alvo (mantido)" variant="secondary" />
              <TeamSummaryCard team={report.team_b} label="Origem (removido)" variant="destructive" />
            </div>

            {/* Tabs for detailed views */}
            <Tabs defaultValue="leagues" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="leagues">Competições</TabsTrigger>
                <TabsTrigger value="opponents">Adversários</TabsTrigger>
                <TabsTrigger value="matches-a">Partidas {report.team_a.nome.slice(0, 15)}</TabsTrigger>
                <TabsTrigger value="matches-b">Partidas {report.team_b.nome.slice(0, 15)}</TabsTrigger>
              </TabsList>

              <TabsContent value="leagues">
                <LeaguesComparison teamA={report.team_a} teamB={report.team_b} />
              </TabsContent>

              <TabsContent value="opponents">
                <OpponentsComparison teamA={report.team_a} teamB={report.team_b} />
              </TabsContent>

              <TabsContent value="matches-a">
                <MatchesTable
                  team={report.team_a}
                  filter={matchFilter}
                  onFilterChange={setMatchFilter}
                  page={matchPage}
                  onPageChange={setMatchPage}
                  pageSize={MATCHES_PER_PAGE}
                  onExport={() => exportTeamCSV(report.team_a)}
                />
              </TabsContent>

              <TabsContent value="matches-b">
                <MatchesTable
                  team={report.team_b}
                  filter={matchFilter}
                  onFilterChange={setMatchFilter}
                  page={matchPage}
                  onPageChange={setMatchPage}
                  pageSize={MATCHES_PER_PAGE}
                  onExport={() => exportTeamCSV(report.team_b)}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TeamSummaryCard({ team, label, variant }: { team: TeamReportData; label: string; variant: "secondary" | "destructive" }) {
  return (
    <Card className={variant === "secondary" ? "border-secondary" : "border-destructive/50"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant={variant === "secondary" ? "default" : "destructive"} className={variant === "secondary" ? "bg-secondary" : ""}>
            {label}
          </Badge>
          {team.pais && <span className="text-xs text-muted-foreground">{team.pais}</span>}
        </div>
        <CardTitle className="text-lg">{team.nome}</CardTitle>
        {team.slug && <code className="text-xs text-muted-foreground">{team.slug}</code>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{team.total_matches} partidas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{team.distinct_leagues} liga(s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">{team.first_match_date || '?'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">{team.last_match_date || '?'}</span>
          </div>
        </div>

        <div className="flex gap-2 text-xs">
          <Badge variant="outline" className="bg-green-500/10 text-green-400">V {team.stats.wins}</Badge>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400">E {team.stats.draws}</Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-400">D {team.stats.losses}</Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Gols: {team.stats.goals_for} pró / {team.stats.goals_against} contra (saldo {team.stats.goal_difference > 0 ? '+' : ''}{team.stats.goal_difference})
        </div>

        {team.external_ids.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <Users className="h-3 w-3 inline mr-1" />
            {team.external_ids.length} ID(s) externo(s) • {team.distinct_providers} provider(s)
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeaguesComparison({ teamA, teamB }: { teamA: TeamReportData; teamB: TeamReportData }) {
  const allLeagues = useMemo(() => {
    const map = new Map<string, { name: string; countA: number; pctA: number; countB: number; pctB: number; shared: boolean }>();
    teamA.leagues.forEach(l => {
      const key = l.league_id || l.league_name;
      map.set(key, { name: l.league_name, countA: l.count, pctA: l.pct, countB: 0, pctB: 0, shared: false });
    });
    teamB.leagues.forEach(l => {
      const key = l.league_id || l.league_name;
      const existing = map.get(key);
      if (existing) {
        existing.countB = l.count;
        existing.pctB = l.pct;
        existing.shared = true;
      } else {
        map.set(key, { name: l.league_name, countA: 0, pctA: 0, countB: l.count, pctB: l.pct, shared: false });
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB));
  }, [teamA, teamB]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competição</TableHead>
            <TableHead className="text-center">{teamA.nome.slice(0, 20)}</TableHead>
            <TableHead className="text-center">{teamB.nome.slice(0, 20)}</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allLeagues.map((l, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{l.name}</TableCell>
              <TableCell className="text-center">{l.countA > 0 ? `${l.countA} (${l.pctA}%)` : '-'}</TableCell>
              <TableCell className="text-center">{l.countB > 0 ? `${l.countB} (${l.pctB}%)` : '-'}</TableCell>
              <TableCell className="text-center">
                {l.shared ? (
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Em comum</Badge>
                ) : l.countA > 0 ? (
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">Exclusiva A</Badge>
                ) : (
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">Exclusiva B</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
          {allLeagues.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                Sem dados de competição
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function OpponentsComparison({ teamA, teamB }: { teamA: TeamReportData; teamB: TeamReportData }) {
  const allOpponents = useMemo(() => {
    const map = new Map<string, { name: string; countA: number; countB: number; shared: boolean }>();
    teamA.top_opponents.forEach(o => {
      map.set(o.team_id, { name: o.team_name, countA: o.count, countB: 0, shared: false });
    });
    teamB.top_opponents.forEach(o => {
      const existing = map.get(o.team_id);
      if (existing) {
        existing.countB = o.count;
        existing.shared = true;
      } else {
        map.set(o.team_id, { name: o.team_name, countA: 0, countB: o.count, shared: false });
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB));
  }, [teamA, teamB]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Adversário</TableHead>
            <TableHead className="text-center">{teamA.nome.slice(0, 20)}</TableHead>
            <TableHead className="text-center">{teamB.nome.slice(0, 20)}</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOpponents.slice(0, 30).map((o, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{o.name}</TableCell>
              <TableCell className="text-center">{o.countA > 0 ? o.countA : '-'}</TableCell>
              <TableCell className="text-center">{o.countB > 0 ? o.countB : '-'}</TableCell>
              <TableCell className="text-center">
                {o.shared ? (
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Em comum</Badge>
                ) : o.countA > 0 ? (
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">Só A</Badge>
                ) : (
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">Só B</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
          {allOpponents.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                Sem dados de adversários
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function MatchesTable({
  team,
  filter,
  onFilterChange,
  page,
  onPageChange,
  pageSize,
  onExport,
}: {
  team: TeamReportData;
  filter: string;
  onFilterChange: (v: string) => void;
  page: number;
  onPageChange: (p: number) => void;
  pageSize: number;
  onExport: () => void;
}) {
  const filtered = useMemo(() => {
    if (!filter) return team.matches;
    const lower = filter.toLowerCase();
    return team.matches.filter(
      m =>
        (m.liga_nome || '').toLowerCase().includes(lower) ||
        m.time_casa_nome.toLowerCase().includes(lower) ||
        m.time_fora_nome.toLowerCase().includes(lower) ||
        m.data.includes(lower)
    );
  }, [team.matches, filter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por liga, time ou data..."
            value={filter}
            onChange={(e) => { onFilterChange(e.target.value); onPageChange(0); }}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filtered.length} partidas
          </span>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Exportar Tudo
          </Button>
        </div>
      </div>

      <div className="rounded-md border max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Liga</TableHead>
              <TableHead>Mandante</TableHead>
              <TableHead className="text-center">Placar</TableHead>
              <TableHead>Visitante</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((m) => (
              <TableRow key={m.match_id}>
                <TableCell className="text-xs whitespace-nowrap">{m.data}</TableCell>
                <TableCell className="text-xs max-w-[120px] truncate">{m.liga_nome || '-'}</TableCell>
                <TableCell className="text-xs font-medium max-w-[120px] truncate">
                  {m.time_casa_nome}
                </TableCell>
                <TableCell className="text-center text-xs font-mono">
                  {m.gols_casa !== null ? `${m.gols_casa} × ${m.gols_fora}` : '-'}
                </TableCell>
                <TableCell className="text-xs font-medium max-w-[120px] truncate">
                  {m.time_fora_nome}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {m.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  Nenhuma partida encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
