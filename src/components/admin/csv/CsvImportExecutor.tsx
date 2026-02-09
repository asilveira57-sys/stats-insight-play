import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { mapRow, normalizeDate, type DryRunResult } from "@/lib/csvImportUtils";
import { normalizeName, slugify } from "@/lib/canonicalUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CsvImportExecutorProps {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
  fileType: string;
  fileName: string;
  ligaId: string | null;
  temporada: number | null;
  provider: string;
  dryRun: DryRunResult;
  newLeagueName?: string;
  onComplete: () => void;
}

export function CsvImportExecutor({
  headers, rows, mapping, fileType, fileName,
  ligaId, temporada, provider, dryRun, newLeagueName, onComplete
}: CsvImportExecutorProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"running" | "completed" | "failed">("running");
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ inserted: 0, updated: 0, skipped: 0, failed: 0 });
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runImport();
  }, []);

  async function runImport() {
    let batchId: string | null = null;
    let effectiveLigaId = ligaId;

    try {
      // Create league if needed (manual mode)
      if (!effectiveLigaId && newLeagueName) {
        const { data: newLeague, error } = await supabase
          .from("ligas")
          .insert({ nome: newLeagueName })
          .select("id")
          .single();
        if (error) throw new Error(`Falha ao criar liga: ${error.message}`);
        effectiveLigaId = newLeague.id;
      }

      // Create import batch
      const { data: batch, error: batchErr } = await supabase
        .from("csv_imports" as any)
        .insert({
          user_id: user?.id,
          file_name: fileName,
          file_type: fileType,
          liga_id: effectiveLigaId,
          temporada,
          provider,
          total_rows: rows.length,
          status: "processing",
        } as any)
        .select("id")
        .single();
      if (batchErr) throw new Error(`Falha ao criar batch: ${batchErr.message}`);
      batchId = (batch as any).id;

      // Load existing teams for resolution (including aliases)
      const { data: allTeams } = await supabase.from("times").select("id, nome, slug");
      const { data: allAliases } = await supabase.from("team_aliases").select("team_id, alias, normalized_alias");
      const teamCache = new Map<string, string>();
      for (const t of allTeams || []) {
        teamCache.set(normalizeName(t.nome), t.id);
        if (t.slug) teamCache.set(t.slug, t.id);
      }
      for (const a of allAliases || []) {
        if (a.team_id && a.normalized_alias) {
          teamCache.set(a.normalized_alias, a.team_id);
        }
      }

      // League cache for self-describing CSVs
      const { data: allLeagues } = await supabase.from("ligas").select("id, nome, slug, pais");
      const leagueCache = new Map<string, string>();
      for (const l of allLeagues || []) {
        leagueCache.set(normalizeName(l.nome), l.id);
        if (l.slug) leagueCache.set(l.slug, l.id);
      }

      // Season cache
      const { data: allSeasons } = await supabase.from("seasons").select("id, league_id, year");
      const seasonCache = new Map<string, string>();
      for (const s of allSeasons || []) {
        seasonCache.set(`${s.league_id}|${s.year}`, s.id);
      }

      const resolveLeague = async (name: string, country?: string): Promise<string | null> => {
        const norm = normalizeName(name);
        const slug = slugify(name);
        if (leagueCache.has(norm)) return leagueCache.get(norm)!;
        if (leagueCache.has(slug)) return leagueCache.get(slug)!;
        // Create new league
        const insertData: any = { nome: name, slug };
        if (country) insertData.pais = country;
        const { data: newLeague, error } = await supabase
          .from("ligas")
          .insert(insertData)
          .select("id")
          .single();
        if (error || !newLeague) return null;
        leagueCache.set(norm, newLeague.id);
        leagueCache.set(slug, newLeague.id);
        return newLeague.id;
      };

      const resolveSeason = async (leagueId: string, year: number): Promise<string | null> => {
        const key = `${leagueId}|${year}`;
        if (seasonCache.has(key)) return seasonCache.get(key)!;
        // Create new season
        const { data: newSeason, error } = await supabase
          .from("seasons")
          .insert({ league_id: leagueId, year })
          .select("id")
          .single();
        if (error || !newSeason) return null;
        seasonCache.set(key, newSeason.id);
        return newSeason.id;
      };

      const resolveTeam = async (name: string): Promise<string | null> => {
        const norm = normalizeName(name);
        const slug = slugify(name);
        if (teamCache.has(norm)) return teamCache.get(norm)!;
        if (teamCache.has(slug)) return teamCache.get(slug)!;
        // Create new team
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

      let inserted = 0, updated = 0, skipped = 0, failed = 0;
      const errors: string[] = [];

      if (fileType === "matches") {
        for (let i = 0; i < rows.length; i++) {
          const mapped = mapRow(rows[i], headers, mapping);
          const date = normalizeDate(mapped.data);
          if (!date || !mapped.time_casa || !mapped.time_fora) { skipped++; continue; }
          if (normalizeName(mapped.time_casa) === normalizeName(mapped.time_fora)) { skipped++; continue; }

          // Resolve league: from CSV column or from manual selection
          let rowLigaId = effectiveLigaId;
          if (!rowLigaId && mapped.league_name) {
            rowLigaId = await resolveLeague(mapped.league_name, mapped.country);
          }
          if (!rowLigaId) { skipped++; errors.push(`Linha ${i + 2}: Liga não definida`); continue; }

          // Resolve season
          let rowSeasonId: string | null = null;
          const seasonYear = mapped.season ? parseInt(mapped.season) : (temporada || null);
          if (seasonYear && rowLigaId) {
            rowSeasonId = await resolveSeason(rowLigaId, seasonYear);
          }

          const homeId = await resolveTeam(mapped.time_casa);
          const awayId = await resolveTeam(mapped.time_fora);
          if (!homeId || !awayId) { failed++; errors.push(`Linha ${i + 2}: Falha ao resolver times`); continue; }

          const hasScore = mapped.gols_casa !== undefined && mapped.gols_casa !== "" && mapped.gols_fora !== undefined && mapped.gols_fora !== "";
          const matchStatus = hasScore ? "finished" : "scheduled";

          const matchData: any = {
            time_casa_id: homeId,
            time_fora_id: awayId,
            data: date,
            liga_id: rowLigaId,
            status: mapped.status || matchStatus,
            import_batch_id: batchId,
          };
          if (hasScore) {
            matchData.gols_casa = parseInt(mapped.gols_casa);
            matchData.gols_fora = parseInt(mapped.gols_fora);
          }
          if (mapped.rodada) matchData.rodada = parseInt(mapped.rodada);
          if (mapped.hora) matchData.hora = mapped.hora;

          // Check for existing match (dedup by liga + date + teams)
          let existingQuery = supabase
            .from("partidas")
            .select("id")
            .eq("time_casa_id", homeId)
            .eq("time_fora_id", awayId)
            .eq("data", date);
          if (rowLigaId) existingQuery = existingQuery.eq("liga_id", rowLigaId);

          const { data: existing } = await existingQuery.maybeSingle();

          if (existing) {
            const { error: updateErr } = await supabase
              .from("partidas")
              .update({ ...matchData, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
            if (updateErr) { failed++; errors.push(`Linha ${i + 2}: ${updateErr.message}`); }
            else updated++;
          } else {
            const { error: insertErr } = await supabase.from("partidas").insert(matchData);
            if (insertErr) { failed++; errors.push(`Linha ${i + 2}: ${insertErr.message}`); }
            else inserted++;
          }

          // External ID mapping
          if (mapped.external_id && provider) {
            const matchId = existing?.id;
            if (matchId) {
              await supabase.from("external_id_map").upsert({
                source_id: provider,
                entity_type: "match",
                external_id: mapped.external_id,
                internal_id: matchId,
                confidence: "high",
              } as any, { onConflict: "source_id,entity_type,external_id" } as any);
            }
          }

          if (i % 10 === 0) {
            setProgress(Math.round((i / rows.length) * 100));
            setStats({ inserted, updated, skipped, failed });
          }
        }
      } else if (fileType === "teams") {
        for (let i = 0; i < rows.length; i++) {
          const mapped = mapRow(rows[i], headers, mapping);
          if (!mapped.nome) { skipped++; continue; }

          const slug = slugify(mapped.nome);
          const { data: existing } = await supabase.from("times").select("id").eq("slug", slug).maybeSingle();

          if (existing) {
            updated++;
          } else {
            const { error: insertErr } = await supabase.from("times").insert({
              nome: mapped.nome,
              pais: mapped.pais || null,
              escudo_url: mapped.escudo_url || null,
              import_batch_id: batchId,
            } as any);
            if (insertErr) { failed++; errors.push(`Linha ${i + 2}: ${insertErr.message}`); }
            else inserted++;
          }

          if (i % 10 === 0) {
            setProgress(Math.round((i / rows.length) * 100));
            setStats({ inserted, updated, skipped, failed });
          }
        }
      } else if (fileType === "scorers") {
        for (let i = 0; i < rows.length; i++) {
          const mapped = mapRow(rows[i], headers, mapping);
          if (!mapped.jogador_nome || !mapped.time || !mapped.data) { skipped++; continue; }

          const date = normalizeDate(mapped.data);
          if (!date) { skipped++; continue; }

          const teamId = await resolveTeam(mapped.time);
          if (!teamId) { failed++; continue; }

          // Find the match
          let matchId: string | null = null;
          if (mapped.time_casa && mapped.time_fora) {
            const homeId = await resolveTeam(mapped.time_casa);
            const awayId = await resolveTeam(mapped.time_fora);
            if (homeId && awayId) {
              const { data: match } = await supabase
                .from("partidas").select("id")
                .eq("time_casa_id", homeId).eq("time_fora_id", awayId).eq("data", date)
                .maybeSingle();
              matchId = match?.id || null;
            }
          }
          if (!matchId) {
            const { data: matches } = await supabase
              .from("partidas").select("id")
              .eq("data", date)
              .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
              .limit(1);
            matchId = matches?.[0]?.id || null;
          }
          if (!matchId) { skipped++; errors.push(`Linha ${i + 2}: Partida não encontrada`); continue; }

          const { error: insertErr } = await supabase.from("gols_partida").insert({
            partida_id: matchId,
            time_id: teamId,
            jogador_nome: mapped.jogador_nome,
            minuto: mapped.minuto ? parseInt(mapped.minuto) : 0,
            tipo: mapped.tipo || "normal",
            import_batch_id: batchId,
          } as any);
          if (insertErr) { failed++; errors.push(`Linha ${i + 2}: ${insertErr.message}`); }
          else inserted++;

          if (i % 10 === 0) {
            setProgress(Math.round((i / rows.length) * 100));
            setStats({ inserted, updated, skipped, failed });
          }
        }
      } else if (fileType === "season_scorers") {
        for (let i = 0; i < rows.length; i++) {
          const mapped = mapRow(rows[i], headers, mapping);
          if (!mapped.jogador_nome || !mapped.gols) { skipped++; continue; }

          const teamId = mapped.time ? await resolveTeam(mapped.time) : null;
          const playerSlug = slugify(mapped.jogador_nome);

          const { error: insertErr } = await supabase.from("artilharia_agregada").upsert({
            jogador_nome: mapped.jogador_nome,
            jogador_slug: playerSlug,
            gols: parseInt(mapped.gols),
            time_id: teamId,
            competicao_id: effectiveLigaId,
            temporada: temporada ? String(temporada) : null,
            partidas_com_gol: mapped.partidas_com_gol ? parseInt(mapped.partidas_com_gol) : null,
          }, { onConflict: "jogador_slug,competicao_id,temporada" } as any);

          if (insertErr) { failed++; errors.push(`Linha ${i + 2}: ${insertErr.message}`); }
          else inserted++;

          if (i % 10 === 0) {
            setProgress(Math.round((i / rows.length) * 100));
            setStats({ inserted, updated, skipped, failed });
          }
        }
      }

      // Update batch record
      await supabase.from("csv_imports" as any).update({
        status: failed > 0 && inserted === 0 ? "failed" : "completed",
        rows_inserted: inserted,
        rows_updated: updated,
        rows_skipped: skipped,
        rows_failed: failed,
        error_report: errors.slice(0, 500),
      } as any).eq("id", batchId);

      // Log to sync_logs
      await supabase.from("sync_logs").insert({
        entity_type: `csv_import_${fileType}`,
        status: "completed",
        items_processed: rows.length,
        items_created: inserted,
        items_failed: failed,
        details: { batch_id: batchId, file: fileName, provider, liga_id: effectiveLigaId, inserted, updated, skipped, failed },
      });

      setStats({ inserted, updated, skipped, failed });
      setErrorLog(errors);
      setProgress(100);
      setStatus("completed");
    } catch (err: any) {
      setStatus("failed");
      setErrorLog([err.message]);
      if (batchId) {
        await supabase.from("csv_imports" as any).update({ status: "failed", error_report: [err.message] } as any).eq("id", batchId);
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === "running" && <Loader2 className="w-5 h-5 animate-spin" />}
          {status === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
          {status === "failed" && <XCircle className="w-5 h-5 text-destructive" />}
          {status === "running" ? "Importando..." : status === "completed" ? "Importação Concluída!" : "Falha na Importação"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} />

        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <p className="text-xl font-bold text-green-500">{stats.inserted}</p>
            <p className="text-xs text-muted-foreground">Inseridos</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 text-center">
            <p className="text-xl font-bold text-blue-500">{stats.updated}</p>
            <p className="text-xs text-muted-foreground">Atualizados</p>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <p className="text-xl font-bold">{stats.skipped}</p>
            <p className="text-xs text-muted-foreground">Ignorados</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <p className="text-xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </div>
        </div>

        {errorLog.length > 0 && (
          <div className="max-h-40 overflow-auto border rounded p-2 text-xs text-muted-foreground">
            {errorLog.slice(0, 50).map((e, i) => <p key={i}>{e}</p>)}
            {errorLog.length > 50 && <p className="text-destructive">... e mais {errorLog.length - 50} erros</p>}
          </div>
        )}

        {status !== "running" && (
          <Button onClick={onComplete} className="w-full">
            {status === "completed" ? "Nova Importação" : "Tentar Novamente"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
