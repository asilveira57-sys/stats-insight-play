import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Download, Play, Users, Trophy, Globe } from "lucide-react";
import { mapRow, validateRow, normalizeDate, type DryRunResult } from "@/lib/csvImportUtils";
import { normalizeName, slugify } from "@/lib/canonicalUtils";
import { supabase } from "@/integrations/supabase/client";

interface CsvDryRunStepProps {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
  fileType: string;
  ligaId: string | null;
  onConfirmImport: (dryRun: DryRunResult) => void;
}

export function CsvDryRunStep({ headers, rows, mapping, fileType, ligaId, onConfirmImport }: CsvDryRunStepProps) {
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runDryRun = async () => {
    setRunning(true);
    setProgress(0);

    const result: DryRunResult = {
      totalRows: rows.length,
      validRows: 0,
      invalidRows: 0,
      newTeams: [],
      existingTeams: [],
      duplicateMatches: 0,
      newMatches: 0,
      newLeagues: [],
      existingLeagues: [],
      newSeasons: [],
      existingSeasons: [],
      rowErrors: [],
      warnings: [],
    };

    // Get existing teams
    const { data: existingTeamsData } = await supabase.from("times").select("id, nome, slug");
    const existingTeamSlugs = new Set((existingTeamsData || []).map((t) => t.slug));
    const existingTeamNames = new Set((existingTeamsData || []).map((t) => normalizeName(t.nome)));

    // Get existing leagues
    const { data: existingLeaguesData } = await supabase.from("ligas").select("id, nome, slug");
    const existingLeagueSlugs = new Set((existingLeaguesData || []).map((l) => l.slug));
    const existingLeagueNames = new Set((existingLeaguesData || []).map((l) => normalizeName(l.nome)));

    // Get existing seasons
    const { data: existingSeasonsData } = await supabase.from("seasons").select("id, league_id, year");
    const existingSeasonKeys = new Set((existingSeasonsData || []).map((s) => `${s.league_id}|${s.year}`));

    // Get existing matches for this league (if manual liga selected)
    let existingMatchKeys = new Set<string>();
    if (ligaId && fileType === "matches") {
      const { data: existingMatches } = await supabase
        .from("partidas")
        .select("data, time_casa_id, time_fora_id, times_casa:times!partidas_time_casa_id_fkey(nome), times_fora:times!partidas_time_fora_id_fkey(nome)")
        .eq("liga_id", ligaId);
      if (existingMatches) {
        for (const m of existingMatches) {
          const homeName = normalizeName((m as any).times_casa?.nome || "");
          const awayName = normalizeName((m as any).times_fora?.nome || "");
          existingMatchKeys.add(`${m.data}|${homeName}|${awayName}`);
        }
      }
    }

    const teamsSeen = new Set<string>();
    const leaguesSeen = new Set<string>();
    const seasonsSeen = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      if (i % 100 === 0) setProgress(Math.round((i / rows.length) * 100));

      const mapped = mapRow(rows[i], headers, mapping);
      const validation = validateRow(mapped, fileType);

      if (!validation.valid) {
        result.invalidRows++;
        if (result.rowErrors.length < 100) {
          result.rowErrors.push({ row: i + 2, errors: validation.errors, data: mapped });
        }
        continue;
      }
      result.validRows++;

      if (fileType === "matches") {
        // Track leagues from CSV
        if (mapped.league_name && !leaguesSeen.has(normalizeName(mapped.league_name))) {
          leaguesSeen.add(normalizeName(mapped.league_name));
          const leagueSlug = slugify(mapped.league_name);
          if (existingLeagueSlugs.has(leagueSlug) || existingLeagueNames.has(normalizeName(mapped.league_name))) {
            result.existingLeagues.push(mapped.league_name);
          } else {
            result.newLeagues.push(mapped.league_name);
          }
        }

        // Track seasons from CSV
        if (mapped.league_name && mapped.season) {
          const seasonKey = `${normalizeName(mapped.league_name)}|${mapped.season}`;
          if (!seasonsSeen.has(seasonKey)) {
            seasonsSeen.add(seasonKey);
            // Check if this season exists (approximate - full check in executor)
            const leagueMatch = (existingLeaguesData || []).find(
              (l) => normalizeName(l.nome) === normalizeName(mapped.league_name) || l.slug === slugify(mapped.league_name)
            );
            if (leagueMatch && existingSeasonKeys.has(`${leagueMatch.id}|${parseInt(mapped.season)}`)) {
              result.existingSeasons.push(`${mapped.league_name} ${mapped.season}`);
            } else {
              result.newSeasons.push(`${mapped.league_name} ${mapped.season}`);
            }
          }
        }

        // Track teams
        for (const teamField of ["time_casa", "time_fora"]) {
          const teamName = mapped[teamField];
          if (teamName && !teamsSeen.has(normalizeName(teamName))) {
            teamsSeen.add(normalizeName(teamName));
            const slug = slugify(teamName);
            if (existingTeamSlugs.has(slug) || existingTeamNames.has(normalizeName(teamName))) {
              result.existingTeams.push(teamName);
            } else {
              result.newTeams.push(teamName);
            }
          }
        }

        // Track matches
        const dateNorm = normalizeDate(mapped.data);
        if (dateNorm) {
          const key = `${dateNorm}|${normalizeName(mapped.time_casa)}|${normalizeName(mapped.time_fora)}`;
          if (existingMatchKeys.has(key)) result.duplicateMatches++;
          else result.newMatches++;
        }
      }
    }

    setProgress(100);
    setDryRun(result);
    setRunning(false);
  };

  useEffect(() => {
    runDryRun();
  }, []);

  const downloadErrors = () => {
    if (!dryRun) return;
    const lines = ["Linha,Erros,Dados"];
    for (const err of dryRun.rowErrors) {
      lines.push(`${err.row},"${err.errors.join("; ")}","${JSON.stringify(err.data).replace(/"/g, "''")}"`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "erros_importacao.csv";
    a.click();
  };

  if (running) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">Analisando {rows.length} linhas...</p>
          <Progress value={progress} className="max-w-md mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!dryRun) return null;

  const hasLeagueData = dryRun.newLeagues.length > 0 || dryRun.existingLeagues.length > 0;
  const hasSeasonData = dryRun.newSeasons.length > 0 || dryRun.existingSeasons.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" /> Pré-Checagem Concluída
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted text-center">
            <p className="text-2xl font-bold">{dryRun.totalRows}</p>
            <p className="text-xs text-muted-foreground">Total Linhas</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <p className="text-2xl font-bold text-green-500">{dryRun.validRows}</p>
            <p className="text-xs text-muted-foreground">Válidas</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive">{dryRun.invalidRows}</p>
            <p className="text-xs text-muted-foreground">Inválidas</p>
          </div>
          {fileType === "matches" && (
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-2xl font-bold">{dryRun.duplicateMatches}</p>
              <p className="text-xs text-muted-foreground">Já existentes</p>
            </div>
          )}
        </div>

        {fileType === "matches" && (
          <div className={`grid gap-3 ${hasLeagueData ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}>
            {/* Leagues from CSV */}
            {hasLeagueData && (
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4" />
                  <span className="font-medium text-sm">Ligas (CSV)</span>
                </div>
                <p className="text-sm"><span className="text-green-500 font-medium">{dryRun.existingLeagues.length}</span> existentes</p>
                <p className="text-sm"><span className="text-yellow-500 font-medium">{dryRun.newLeagues.length}</span> novas</p>
                {dryRun.newLeagues.length > 0 && (
                  <div className="mt-2 max-h-24 overflow-auto text-xs text-muted-foreground">
                    {dryRun.newLeagues.map((l) => <Badge key={l} variant="outline" className="mr-1 mb-1 text-xs">{l}</Badge>)}
                  </div>
                )}
                {hasSeasonData && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500 font-medium">{dryRun.existingSeasons.length}</span> temp. existentes · <span className="text-yellow-500 font-medium">{dryRun.newSeasons.length}</span> novas
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                <span className="font-medium text-sm">Times</span>
              </div>
              <p className="text-sm"><span className="text-green-500 font-medium">{dryRun.existingTeams.length}</span> existentes</p>
              <p className="text-sm"><span className="text-yellow-500 font-medium">{dryRun.newTeams.length}</span> novos</p>
              {dryRun.newTeams.length > 0 && (
                <div className="mt-2 max-h-24 overflow-auto text-xs text-muted-foreground">
                  {dryRun.newTeams.map((t) => <Badge key={t} variant="outline" className="mr-1 mb-1 text-xs">{t}</Badge>)}
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4" />
                <span className="font-medium text-sm">Partidas</span>
              </div>
              <p className="text-sm"><span className="text-green-500 font-medium">{dryRun.newMatches}</span> novas</p>
              <p className="text-sm"><span className="text-muted-foreground font-medium">{dryRun.duplicateMatches}</span> duplicadas (atualizar)</p>
            </div>
          </div>
        )}

        {/* Error rows */}
        {dryRun.rowErrors.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Linhas com erro ({dryRun.rowErrors.length})
              </span>
              <Button size="sm" variant="outline" onClick={downloadErrors}>
                <Download className="w-3 h-3 mr-1" /> Baixar Erros
              </Button>
            </div>
            <div className="border rounded-lg overflow-x-auto max-h-48">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Linha</TableHead>
                    <TableHead className="text-xs">Erros</TableHead>
                    <TableHead className="text-xs">Dados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dryRun.rowErrors.slice(0, 20).map((e) => (
                    <TableRow key={e.row}>
                      <TableCell className="text-xs">{e.row}</TableCell>
                      <TableCell className="text-xs text-destructive">{e.errors.join("; ")}</TableCell>
                      <TableCell className="text-xs max-w-48 truncate">{JSON.stringify(e.data)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <Button onClick={() => onConfirmImport(dryRun)} className="w-full" disabled={dryRun.validRows === 0}>
          <Play className="w-4 h-4 mr-2" /> Confirmar Importação ({dryRun.validRows} linhas válidas)
        </Button>
      </CardContent>
    </Card>
  );
}
