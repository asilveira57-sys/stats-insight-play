import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIME_LIMIT_MS = 120_000;
let REQUEST_START_TIME = Date.now();
function isTimeLimitClose(): boolean {
  return Date.now() - REQUEST_START_TIME > TIME_LIMIT_MS;
}

// Paginated fetch to avoid 1000-row limit
async function fetchAll(supabase: any, table: string, select: string, filters?: Record<string, any>) {
  const allRows: any[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (filters) {
      for (const [col, val] of Object.entries(filters)) {
        query = query.eq(col, val);
      }
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  REQUEST_START_TIME = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { action, seasons } = body as {
      action: "import_history" | "list_available";
      seasons?: number[];
    };

    if (action === "list_available") {
      // Return available seasons from both repos
      return new Response(JSON.stringify({
        cartolafcdados: [2014, 2015, 2016, 2017],
        cartola_caRtola: Array.from({ length: 13 }, (_, i) => 2014 + i), // 2014-2026
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action !== "import_history" || !seasons?.length) {
      return new Response(JSON.stringify({ error: "action must be 'import_history' with seasons array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log start
    const { data: logEntry } = await supabase.from("sync_logs").insert({
      entity_type: "cartola_history_import",
      status: "running",
      started_at: new Date().toISOString(),
      details: { seasons, source: "CartolaFCDados" },
    }).select("id").single();
    const logId = logEntry?.id;

    let totalInserted = 0, totalUpdated = 0, totalSkipped = 0, totalFailed = 0;
    const errors: string[] = [];

    // Pre-load existing cartola_clubes
    const existingClubes = await fetchAll(supabase, "cartola_clubes", "cartola_clube_id, nome");
    const clubeCache = new Map<number, string>();
    for (const c of existingClubes) clubeCache.set(c.cartola_clube_id, c.nome);

    for (const season of seasons) {
      if (isTimeLimitClose()) {
        errors.push(`⏱ Tempo limite atingido na temporada ${season}`);
        break;
      }

      // Ensure temporada exists
      await supabase.from("cartola_temporadas").upsert(
        { season, fonte_historico: "CartolaFCDados" },
        { onConflict: "season" }
      );

      const available = [2014, 2015, 2016, 2017];
      if (!available.includes(season)) {
        // For seasons not in CartolaFCDados, skip (caRtola only has scouts, not structured partidas)
        errors.push(`Temporada ${season}: não disponível no CartolaFCDados (apenas 2014-2017)`);
        totalSkipped++;
        continue;
      }

      const baseUrl = `https://raw.githubusercontent.com/thevtm/CartolaFCDados/master/${season}`;

      // 1. Import Clubes
      try {
        const clubesRes = await fetch(`${baseUrl}/Clubes.csv`);
        if (clubesRes.ok) {
          const clubesCsv = await clubesRes.text();
          const lines = clubesCsv.split("\n").filter(l => l.trim());
          // Header: "ID","Nome","Abreviacao","Slug"
          for (let i = 1; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i], ",");
            const id = parseInt(cols[0]);
            const nome = cols[1]?.replace(/^"|"$/g, "") || "";
            const abreviacao = cols[2]?.replace(/^"|"$/g, "") || "";
            const slug = cols[3]?.replace(/^"|"$/g, "") || "";
            if (isNaN(id) || !nome) continue;

            await supabase.from("cartola_clubes").upsert(
              { cartola_clube_id: id, nome, abreviacao, slug },
              { onConflict: "cartola_clube_id" }
            );
            clubeCache.set(id, nome);
          }
        }
      } catch (e) {
        errors.push(`${season}/Clubes.csv: ${e.message}`);
      }

      // 2. Import Atletas
      try {
        const atletasRes = await fetch(`${baseUrl}/Atletas.csv`);
        if (atletasRes.ok) {
          const atletasCsv = await atletasRes.text();
          const lines = atletasCsv.split("\n").filter(l => l.trim());
          // Header: "ID","Apelido","ClubeID","PosicaoID"
          const BATCH_SIZE = 50;
          for (let i = 1; i < lines.length; i += BATCH_SIZE) {
            if (isTimeLimitClose()) break;
            const batch = [];
            for (let j = i; j < Math.min(i + BATCH_SIZE, lines.length); j++) {
              const cols = parseCsvLine(lines[j], ",");
              const id = parseInt(cols[0]);
              const apelido = cols[1]?.replace(/^"|"$/g, "") || "";
              const clubeId = parseInt(cols[2]) || null;
              const posicaoId = parseInt(cols[3]) || null;
              if (isNaN(id) || !apelido) continue;
              batch.push({ cartola_atleta_id: id, apelido, clube_id: clubeId, posicao_id: posicaoId });
            }
            if (batch.length > 0) {
              await supabase.from("cartola_atletas").upsert(batch, { onConflict: "cartola_atleta_id" });
            }
          }
        }
      } catch (e) {
        errors.push(`${season}/Atletas.csv: ${e.message}`);
      }

      // 3. Import Partidas
      try {
        const partidasRes = await fetch(`${baseUrl}/Partidas.csv`);
        if (partidasRes.ok) {
          const partidasCsv = await partidasRes.text();
          const lines = partidasCsv.split("\n").filter(l => l.trim());
          // Header: "ID","Rodada","CasaID","VisitanteID","PlacarCasa","PlacarVisitante"
          let inserted = 0, updated = 0;
          
          const BATCH_SIZE = 50;
          for (let i = 1; i < lines.length; i += BATCH_SIZE) {
            if (isTimeLimitClose()) break;
            const batch = [];
            for (let j = i; j < Math.min(i + BATCH_SIZE, lines.length); j++) {
              const cols = parseCsvLine(lines[j], ",");
              const partidaId = parseInt(cols[0]) || null;
              const rodada = parseInt(cols[1]);
              const casaId = parseInt(cols[2]);
              const visitanteId = parseInt(cols[3]);
              const placarCasa = parseInt(cols[4]);
              const placarVisitante = parseInt(cols[5]);
              if (isNaN(rodada) || isNaN(casaId) || isNaN(visitanteId)) continue;
              batch.push({
                cartola_partida_id: partidaId,
                season,
                rodada,
                casa_clube_id: casaId,
                visitante_clube_id: visitanteId,
                placar_casa: isNaN(placarCasa) ? null : placarCasa,
                placar_visitante: isNaN(placarVisitante) ? null : placarVisitante,
                status_partida: "finished",
              });
            }
            if (batch.length > 0) {
              const { data, error } = await supabase.from("cartola_partidas").upsert(
                batch,
                { onConflict: "season,rodada,casa_clube_id,visitante_clube_id" }
              );
              if (error) {
                errors.push(`${season}/Partidas batch ${i}: ${error.message}`);
                totalFailed += batch.length;
              } else {
                inserted += batch.length;
              }
            }
          }
          totalInserted += inserted;
        }
      } catch (e) {
        errors.push(`${season}/Partidas.csv: ${e.message}`);
        totalFailed++;
      }

      // 4. Import Scouts
      try {
        const scoutsRes = await fetch(`${baseUrl}/Scouts.csv`);
        if (scoutsRes.ok) {
          const scoutsCsv = await scoutsRes.text();
          const lines = scoutsCsv.split("\n").filter(l => l.trim());
          // Header: "Rodada","ClubeID","AtletaID","Participou","Pontos","PontosMedia","Preco","PrecoVariacao","FS","PE","A",...
          const headers = parseCsvLine(lines[0], ",").map(h => h.replace(/^"|"$/g, ""));
          
          const BATCH_SIZE = 100;
          for (let i = 1; i < lines.length; i += BATCH_SIZE) {
            if (isTimeLimitClose()) break;
            const batch = [];
            for (let j = i; j < Math.min(i + BATCH_SIZE, lines.length); j++) {
              const cols = parseCsvLine(lines[j], ",");
              const rodada = parseInt(cols[0]);
              const clubeId = parseInt(cols[1]);
              const atletaId = parseInt(cols[2]);
              const participou = cols[3]?.toUpperCase() === "TRUE";
              const pontos = parseFloat(cols[4]) || 0;
              const preco = parseFloat(cols[6]) || 0;
              const variacao = parseFloat(cols[7]) || 0;

              if (isNaN(rodada) || isNaN(atletaId)) continue;

              // Build scout fields from remaining columns
              const campos_scout: Record<string, number> = {};
              const scoutCols = ["FS", "PE", "A", "FT", "FD", "FF", "G", "I", "PP", "RB", "FC", "GC", "CA", "CV", "SG", "DD", "DP", "GS"];
              for (let k = 0; k < scoutCols.length; k++) {
                const idx = 8 + k; // starts at column 8
                if (idx < cols.length) {
                  const val = parseInt(cols[idx]);
                  if (!isNaN(val) && val !== 0) campos_scout[scoutCols[k]] = val;
                }
              }

              batch.push({
                season,
                rodada,
                cartola_atleta_id: atletaId,
                clube_id: isNaN(clubeId) ? null : clubeId,
                participou,
                pontos,
                preco,
                variacao_preco: variacao,
                campos_scout,
              });
            }
            if (batch.length > 0) {
              const { error } = await supabase.from("cartola_scouts_rodada").upsert(
                batch,
                { onConflict: "season,rodada,cartola_atleta_id" }
              );
              if (error) {
                errors.push(`${season}/Scouts batch ${i}: ${error.message}`);
              }
            }
          }
        }
      } catch (e) {
        errors.push(`${season}/Scouts.csv: ${e.message}`);
      }

      // 5. Map Cartola clubs to Statball teams via external_id_map
      await mapClubesStatball(supabase, clubeCache, errors);
    }

    // 6. Map Cartola partidas to Statball partidas
    await mapPartidasStatball(supabase, seasons, errors);

    // Final log
    const finalStatus = totalFailed > 0 && totalInserted === 0 ? "failed" : "completed";
    if (logId) {
      await supabase.from("sync_logs").update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        items_processed: totalInserted + totalUpdated + totalSkipped + totalFailed,
        items_created: totalInserted,
        items_updated: totalUpdated,
        items_failed: totalFailed,
        error_message: errors.length > 0 ? errors.slice(0, 10).join("; ") : null,
        details: { seasons, inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped, failed: totalFailed, errors: errors.slice(0, 50) },
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({
      success: true,
      status: finalStatus,
      inserted: totalInserted,
      updated: totalUpdated,
      skipped: totalSkipped,
      failed: totalFailed,
      errors: errors.slice(0, 20),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Cartola import error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Map cartola_clubes -> times via external_id_map
async function mapClubesStatball(supabase: any, clubeCache: Map<number, string>, errors: string[]) {
  try {
    // Get existing mappings
    const existingMaps = await fetchAll(supabase, "external_id_map", "external_id, internal_id", {
      entity_type: "team",
    });
    const mappedExternalIds = new Set(existingMaps.filter(m => m.external_id?.startsWith("cartola:")).map(m => m.external_id));

    // Get all teams for fuzzy matching
    const allTeams = await fetchAll(supabase, "times", "id, nome, slug, name_normalized");
    const teamAliases = await fetchAll(supabase, "team_aliases", "team_id, normalized_alias");

    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

    for (const [cartolaId, nome] of clubeCache.entries()) {
      if (cartolaId === 1) continue; // "Outros" special entry
      const externalId = `cartola:${cartolaId}`;
      if (mappedExternalIds.has(externalId)) continue;

      const normalizedNome = normalize(nome);
      // Try matching by normalized name
      let matchedTeamId: string | null = null;
      for (const team of allTeams) {
        if (normalize(team.nome) === normalizedNome || (team.slug && team.slug === normalizedNome) ||
            (team.name_normalized && normalize(team.name_normalized) === normalizedNome)) {
          matchedTeamId = team.id;
          break;
        }
      }
      // Try aliases
      if (!matchedTeamId) {
        for (const alias of teamAliases) {
          if (alias.normalized_alias && normalize(alias.normalized_alias) === normalizedNome) {
            matchedTeamId = alias.team_id;
            break;
          }
        }
      }

      if (matchedTeamId) {
        await supabase.from("external_id_map").upsert({
          entity_type: "team",
          external_id: externalId,
          internal_id: matchedTeamId,
          confidence: "high",
          metadata: { source: "cartola", cartola_clube_id: cartolaId, nome },
        }, { onConflict: "entity_type,external_id,source_id", ignoreDuplicates: true });
      }
    }
  } catch (e) {
    errors.push(`Mapeamento clubes: ${e.message}`);
  }
}

// Map cartola_partidas -> partidas via external_id_map
async function mapPartidasStatball(supabase: any, seasons: number[], errors: string[]) {
  try {
    // Get team mappings (cartola -> statball)
    const teamMaps = await fetchAll(supabase, "external_id_map", "external_id, internal_id", {
      entity_type: "team",
    });
    const teamMap = new Map<number, string>();
    for (const m of teamMaps) {
      if (m.external_id?.startsWith("cartola:")) {
        const cartolaId = parseInt(m.external_id.split(":")[1]);
        if (!isNaN(cartolaId)) teamMap.set(cartolaId, m.internal_id);
      }
    }

    // Get Brasileirao league
    const { data: liga } = await supabase.from("ligas").select("id").ilike("nome", "%Brasileir%Série A%").maybeSingle();
    if (!liga) {
      const { data: liga2 } = await supabase.from("ligas").select("id").ilike("nome", "%Brasileir%").limit(1).maybeSingle();
      if (!liga2) {
        errors.push("Liga Brasileirão não encontrada no Statball para mapeamento");
        return;
      }
    }
    const ligaId = liga?.id;

    // For each season, get cartola_partidas that have mappable teams
    for (const season of seasons) {
      const partidas = await fetchAll(supabase, "cartola_partidas", "*", { season });
      
      for (const p of partidas) {
        if (p.partida_statball_id) continue; // already mapped
        const homeSbId = teamMap.get(p.casa_clube_id);
        const awaySbId = teamMap.get(p.visitante_clube_id);
        if (!homeSbId || !awaySbId) continue;

        // Try to find existing match in statball
        const { data: existing } = await supabase.from("partidas")
          .select("id")
          .eq("time_casa_id", homeSbId)
          .eq("time_fora_id", awaySbId)
          .gte("data", `${season}-01-01`)
          .lte("data", `${season}-12-31`)
          .maybeSingle();

        if (existing) {
          // Link and update scores
          await supabase.from("cartola_partidas").update({
            partida_statball_id: existing.id,
          }).eq("id", p.id);

          if (p.placar_casa !== null && p.placar_visitante !== null) {
            await supabase.from("partidas").update({
              gols_casa: p.placar_casa,
              gols_fora: p.placar_visitante,
              status: "finished",
            }).eq("id", existing.id);
          }
        }
      }
    }
  } catch (e) {
    errors.push(`Mapeamento partidas: ${e.message}`);
  }
}
