import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Github, FolderTree, Play, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeName, slugify } from "@/lib/canonicalUtils";
import {
  parseGitHubUrl,
  analyzeRepoTree,
  parseJsonMatches,
  parseCsvMatches,
  type GitHubRepoConfig,
  type DetectedCompetition,
  type ParsedMatch,
} from "@/lib/githubImportUtils";

type WizardStep = "config" | "scanning" | "review" | "importing" | "done";

export function GitHubImportWizard() {
  const { user } = useAuth();
  const [step, setStep] = useState<WizardStep>("config");
  const [repoUrl, setRepoUrl] = useState("https://github.com/ricardo-mattoss/Brazilian-Soccer-Data");
  const [provider, setProvider] = useState("github_brazilian_soccer_data");
  const [sourceName, setSourceName] = useState("Brazilian-Soccer-Data");
  const [competitions, setCompetitions] = useState<DetectedCompetition[]>([]);
  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set());
  const [scanError, setScanError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({ inserted: 0, updated: 0, skipped: 0, failed: 0, totalFiles: 0, processedFiles: 0 });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<"running" | "completed" | "failed">("running");

  // Step 1: Scan repository
  const handleScan = async () => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setScanError("URL inválida. Use o formato: https://github.com/owner/repo");
      return;
    }

    setStep("scanning");
    setScanError(null);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-github-repo", {
        body: { action: "tree", owner: parsed.owner, repo: parsed.repo },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      const tree = data.tree || [];
      const detected = analyzeRepoTree(tree);

      if (detected.length === 0) {
        setScanError("Nenhuma competição detectada no repositório. Verifique se existem arquivos .json ou .csv.");
        setStep("config");
        return;
      }

      setCompetitions(detected);
      setStep("review");
    } catch (err: any) {
      setScanError(err.message);
      setStep("config");
    }
  };

  // Toggle competition selection
  const toggleCompetition = (path: string) => {
    setCompetitions((prev) =>
      prev.map((c) =>
        c.path === path
          ? { ...c, selected: !c.selected, seasons: c.seasons.map((s) => ({ ...s, selected: !c.selected })) }
          : c
      )
    );
  };

  // Toggle season selection
  const toggleSeason = (compPath: string, seasonPath: string) => {
    setCompetitions((prev) =>
      prev.map((c) =>
        c.path === compPath
          ? {
              ...c,
              seasons: c.seasons.map((s) => (s.path === seasonPath ? { ...s, selected: !s.selected } : s)),
            }
          : c
      )
    );
  };

  // Toggle expand/collapse
  const toggleExpand = (path: string) => {
    setExpandedComps((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Count selected
  const totalSelectedSeasons = competitions.reduce(
    (sum, c) => sum + c.seasons.filter((s) => s.selected).length,
    0
  );

  // Step 3: Import
  const handleImport = async () => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) return;

    setStep("importing");
    setImportStatus("running");
    setImportProgress(0);
    setImportStats({ inserted: 0, updated: 0, skipped: 0, failed: 0, totalFiles: 0, processedFiles: 0 });
    setImportErrors([]);

    // Collect all selected season files
    const selectedFiles: { comp: DetectedCompetition; season: typeof competitions[0]["seasons"][0] }[] = [];
    for (const comp of competitions) {
      for (const season of comp.seasons) {
        if (season.selected) {
          selectedFiles.push({ comp, season });
        }
      }
    }

    const totalFiles = selectedFiles.length;
    let inserted = 0, updated = 0, skipped = 0, failed = 0;
    const errors: string[] = [];

    // Create import batch
    let batchId: string | null = null;
    try {
      const { data: batch, error: batchErr } = await supabase
        .from("csv_imports")
        .insert({
          user_id: user?.id || "",
          file_name: `github:${parsed.owner}/${parsed.repo}`,
          file_type: "matches",
          provider,
          total_rows: 0,
          status: "processing",
        })
        .select("id")
        .single();
      if (batchErr) throw new Error(batchErr.message);
      batchId = batch.id;
    } catch (err: any) {
      setImportStatus("failed");
      setImportErrors([err.message]);
      return;
    }

    // Load caches
    const { data: allTeams } = await supabase.from("times").select("id, nome, slug");
    const { data: allAliases } = await supabase.from("team_aliases").select("team_id, alias, normalized_alias");
    const { data: allLeagues } = await supabase.from("ligas").select("id, nome, slug, pais");
    const { data: allSeasons } = await supabase.from("seasons").select("id, league_id, year");

    const teamCache = new Map<string, string>();
    for (const t of allTeams || []) {
      teamCache.set(normalizeName(t.nome), t.id);
      if (t.slug) teamCache.set(t.slug, t.id);
    }
    for (const a of allAliases || []) {
      if (a.team_id && a.normalized_alias) teamCache.set(a.normalized_alias, a.team_id);
    }

    const leagueCache = new Map<string, string>();
    for (const l of allLeagues || []) {
      leagueCache.set(normalizeName(l.nome), l.id);
      if (l.slug) leagueCache.set(l.slug, l.id);
    }

    const seasonCache = new Map<string, string>();
    for (const s of allSeasons || []) {
      seasonCache.set(`${s.league_id}|${s.year}`, s.id);
    }

    // Resolver functions
    const resolveLeague = async (name: string, country?: string): Promise<string | null> => {
      const norm = normalizeName(name);
      const slug = slugify(name);
      if (leagueCache.has(norm)) return leagueCache.get(norm)!;
      if (leagueCache.has(slug)) return leagueCache.get(slug)!;
      const insertData: any = { nome: name, slug, pais: country || null };
      const { data: newLeague, error } = await supabase.from("ligas").insert(insertData).select("id").single();
      if (error || !newLeague) return null;
      leagueCache.set(norm, newLeague.id);
      leagueCache.set(slug, newLeague.id);
      return newLeague.id;
    };

    const resolveSeason = async (leagueId: string, year: number): Promise<string | null> => {
      const key = `${leagueId}|${year}`;
      if (seasonCache.has(key)) return seasonCache.get(key)!;
      const { data: newSeason, error } = await supabase.from("seasons").insert({ league_id: leagueId, year }).select("id").single();
      if (error || !newSeason) return null;
      seasonCache.set(key, newSeason.id);
      return newSeason.id;
    };

    const resolveTeam = async (name: string): Promise<string | null> => {
      const norm = normalizeName(name);
      const slug = slugify(name);
      if (teamCache.has(norm)) return teamCache.get(norm)!;
      if (teamCache.has(slug)) return teamCache.get(slug)!;
      const { data: newTeam, error } = await supabase
        .from("times")
        .insert({ nome: name, import_batch_id: batchId } as any)
        .select("id")
        .single();
      if (error || !newTeam) return null;
      teamCache.set(norm, newTeam.id);
      teamCache.set(slug, newTeam.id);
      return newTeam.id;
    };

    // Process files in batches of 3
    for (let i = 0; i < selectedFiles.length; i += 3) {
      const batch = selectedFiles.slice(i, i + 3);
      const paths = batch.map((b) => b.season.path);

      try {
        const { data: filesData, error: fetchErr } = await supabase.functions.invoke("fetch-github-repo", {
          body: {
            action: "multi_files",
            owner: parsed.owner,
            repo: parsed.repo,
            path: paths,
          },
        });

        if (fetchErr) {
          errors.push(`Erro ao buscar arquivos: ${fetchErr.message}`);
          failed += batch.length;
          continue;
        }

        const files = filesData?.files || [];

        for (let j = 0; j < files.length; j++) {
          const file = files[j];
          const { comp, season } = batch[j];

          if (!file.content) {
            errors.push(`${file.path}: ${file.error || "Conteúdo vazio"}`);
            failed++;
            continue;
          }

          // Parse file content
          let matches: ParsedMatch[] = [];
          const leagueName = comp.name.split(" / ").pop() || comp.name;

          if (season.fileType === "json") {
            matches = parseJsonMatches(file.content, leagueName, comp.country, season.year);
          } else {
            matches = parseCsvMatches(file.content, leagueName, comp.country, season.year);
          }

          if (matches.length === 0) {
            errors.push(`${file.path}: Nenhuma partida detectada`);
            skipped++;
            continue;
          }

          // Import matches
          for (const match of matches) {
            if (!match.date || !match.home_team || !match.away_team) { skipped++; continue; }
            if (normalizeName(match.home_team) === normalizeName(match.away_team)) { skipped++; continue; }

            const leagueId = await resolveLeague(match.league_name, match.country);
            if (!leagueId) { skipped++; continue; }

            const seasonYear = parseInt(match.season);
            let seasonId: string | null = null;
            if (!isNaN(seasonYear)) {
              seasonId = await resolveSeason(leagueId, seasonYear);
            }

            const homeId = await resolveTeam(match.home_team);
            const awayId = await resolveTeam(match.away_team);
            if (!homeId || !awayId) { failed++; continue; }

            const matchData: any = {
              time_casa_id: homeId,
              time_fora_id: awayId,
              data: match.date,
              liga_id: leagueId,
              status: match.status,
              import_batch_id: batchId,
            };
            if (match.home_goals !== null) matchData.gols_casa = match.home_goals;
            if (match.away_goals !== null) matchData.gols_fora = match.away_goals;
            if (match.round) {
              const roundNum = parseInt(match.round);
              if (!isNaN(roundNum)) matchData.rodada = roundNum;
            }

            // Dedup check
            const { data: existing } = await supabase
              .from("partidas")
              .select("id")
              .eq("time_casa_id", homeId)
              .eq("time_fora_id", awayId)
              .eq("data", match.date)
              .eq("liga_id", leagueId)
              .maybeSingle();

            if (existing) {
              updated++;
            } else {
              const { error: insertErr } = await supabase.from("partidas").insert(matchData);
              if (insertErr) {
                failed++;
                errors.push(`${match.home_team} vs ${match.away_team} (${match.date}): ${insertErr.message}`);
              } else {
                inserted++;
              }
            }
          }
        }
      } catch (err: any) {
        errors.push(`Batch error: ${err.message}`);
        failed += batch.length;
      }

      const processedFiles = Math.min(i + 3, selectedFiles.length);
      setImportProgress(Math.round((processedFiles / totalFiles) * 100));
      setImportStats({ inserted, updated, skipped, failed, totalFiles, processedFiles });
    }

    // Update batch record
    const totalRows = inserted + updated + skipped + failed;
    await supabase.from("csv_imports").update({
      status: failed > 0 && inserted === 0 ? "failed" : "completed",
      total_rows: totalRows,
      rows_inserted: inserted,
      rows_updated: updated,
      rows_skipped: skipped,
      rows_failed: failed,
      error_report: errors.slice(0, 500),
    }).eq("id", batchId);

    // Log to sync_logs
    await supabase.from("sync_logs").insert({
      entity_type: "github_import",
      status: "completed",
      items_processed: totalRows,
      items_created: inserted,
      items_failed: failed,
      details: {
        batch_id: batchId,
        repo: `${parsed.owner}/${parsed.repo}`,
        provider,
        competitions: competitions.filter((c) => c.selected).map((c) => c.name),
        inserted,
        updated,
        skipped,
        failed,
      },
    });

    setImportStats({ inserted, updated, skipped, failed, totalFiles, processedFiles: totalFiles });
    setImportErrors(errors);
    setImportProgress(100);
    setImportStatus(failed > 0 && inserted === 0 ? "failed" : "completed");
    setStep("done");
  };

  const handleReset = () => {
    setStep("config");
    setCompetitions([]);
    setImportProgress(0);
    setImportStats({ inserted: 0, updated: 0, skipped: 0, failed: 0, totalFiles: 0, processedFiles: 0 });
    setImportErrors([]);
  };

  return (
    <div className="space-y-4">
      {/* Step: Config */}
      {step === "config" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" /> Configurar Fonte GitHub
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Repositório</Label>
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Fonte</Label>
                <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Ex: Brazilian-Soccer-Data" />
              </div>
              <div>
                <Label>Provider ID</Label>
                <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Ex: github_brazilian_soccer_data" />
              </div>
            </div>
            {scanError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {scanError}
              </div>
            )}
            <Button onClick={handleScan} className="w-full">
              <FolderTree className="w-4 h-4 mr-2" /> Escanear Repositório
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Scanning */}
      {step === "scanning" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Escaneando repositório...</p>
          </CardContent>
        </Card>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderTree className="w-5 h-5" /> Competições Detectadas
              </span>
              <Badge variant="secondary">
                {totalSelectedSeasons} temporada(s) selecionada(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {competitions.map((comp) => (
              <div key={comp.path} className="border rounded-lg">
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(comp.path)}
                >
                  {expandedComps.has(comp.path) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Checkbox
                    checked={comp.selected}
                    onCheckedChange={() => toggleCompetition(comp.path)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{comp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {comp.country} · {comp.seasons.length} temporada(s)
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {comp.seasons.filter((s) => s.selected).length}/{comp.seasons.length}
                  </Badge>
                </div>
                {expandedComps.has(comp.path) && (
                  <div className="border-t px-3 py-2 space-y-1 bg-muted/20">
                    {comp.seasons.map((season) => (
                      <div key={season.path} className="flex items-center gap-3 text-sm py-1">
                        <Checkbox
                          checked={season.selected}
                          onCheckedChange={() => toggleSeason(comp.path, season.path)}
                        />
                        <span>{season.year}</span>
                        <Badge variant="outline" className="text-xs">
                          {season.fileType.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{season.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("config")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={totalSelectedSeasons === 0}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" /> Importar {totalSelectedSeasons} Temporada(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Importing / Done */}
      {(step === "importing" || step === "done") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importStatus === "running" && <Loader2 className="w-5 h-5 animate-spin" />}
              {importStatus === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
              {importStatus === "failed" && <XCircle className="w-5 h-5 text-destructive" />}
              {importStatus === "running"
                ? `Importando... (${importStats.processedFiles}/${importStats.totalFiles} arquivos)`
                : importStatus === "completed"
                ? "Importação Concluída!"
                : "Falha na Importação"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={importProgress} />

            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <p className="text-xl font-bold text-green-500">{importStats.inserted}</p>
                <p className="text-xs text-muted-foreground">Inseridos</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                <p className="text-xl font-bold text-blue-500">{importStats.updated}</p>
                <p className="text-xs text-muted-foreground">Existentes</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xl font-bold">{importStats.skipped}</p>
                <p className="text-xs text-muted-foreground">Ignorados</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 text-center">
                <p className="text-xl font-bold text-destructive">{importStats.failed}</p>
                <p className="text-xs text-muted-foreground">Falhas</p>
              </div>
            </div>

            {importErrors.length > 0 && (
              <div className="max-h-40 overflow-auto border rounded p-2 text-xs text-muted-foreground">
                {importErrors.slice(0, 50).map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
                {importErrors.length > 50 && (
                  <p className="text-destructive">... e mais {importErrors.length - 50} erros</p>
                )}
              </div>
            )}

            {step === "done" && (
              <Button onClick={handleReset} className="w-full">
                Nova Importação
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
