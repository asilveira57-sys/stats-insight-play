import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CARTOLA_API = "https://api.cartolafc.globo.com";
const TIME_LIMIT_MS = 120_000;
let REQUEST_START_TIME = Date.now();
function isTimeLimitClose(): boolean {
  return Date.now() - REQUEST_START_TIME > TIME_LIMIT_MS;
}

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

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Statball/1.0", "Accept": "application/json" },
      });
      if (res.ok) return res;
      if (res.status === 429) {
        // Rate limited, wait
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
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
    const { action, season, rodada } = body as {
      action: "sync_season" | "sync_round" | "status";
      season?: number;
      rodada?: number;
    };

    if (action === "status") {
      // Return latest sync info
      const logs = await fetchAll(supabase, "sync_logs", "*", { entity_type: "cartola_season_sync" });
      const roundLogs = await fetchAll(supabase, "sync_logs", "*", { entity_type: "cartola_round_sync" });
      
      const clubesCount = await supabase.from("cartola_clubes").select("cartola_clube_id", { count: "exact", head: true });
      const atletasCount = await supabase.from("cartola_atletas").select("cartola_atleta_id", { count: "exact", head: true });
      const partidasCount = await supabase.from("cartola_partidas").select("id", { count: "exact", head: true });
      const temporadasCount = await supabase.from("cartola_temporadas").select("season", { count: "exact", head: true });

      // Unmapped clubs
      const allClubes = await fetchAll(supabase, "cartola_clubes", "cartola_clube_id, nome");
      const mappings = await fetchAll(supabase, "external_id_map", "external_id", { entity_type: "team" });
      const mappedIds = new Set(mappings.filter(m => m.external_id?.startsWith("cartola:")).map(m => parseInt(m.external_id.split(":")[1])));
      const unmapped = allClubes.filter(c => c.cartola_clube_id !== 1 && !mappedIds.has(c.cartola_clube_id));

      return new Response(JSON.stringify({
        clubes: clubesCount.count || 0,
        atletas: atletasCount.count || 0,
        partidas: partidasCount.count || 0,
        temporadas: temporadasCount.count || 0,
        unmapped_clubes: unmapped,
        recent_logs: [...logs, ...roundLogs].sort((a: any, b: any) => b.started_at?.localeCompare(a.started_at)).slice(0, 10),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "sync_season") {
      return await syncSeason(supabase, season || new Date().getFullYear());
    }

    if (action === "sync_round") {
      if (!season || !rodada) {
        return new Response(JSON.stringify({ error: "season and rodada required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return await syncRound(supabase, season, rodada);
    }

    return new Response(JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Cartola sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncSeason(supabase: any, season: number) {
  const { data: logEntry } = await supabase.from("sync_logs").insert({
    entity_type: "cartola_season_sync",
    status: "running",
    started_at: new Date().toISOString(),
    details: { season },
  }).select("id").single();
  const logId = logEntry?.id;

  let inserted = 0, updated = 0, failed = 0;
  const errors: string[] = [];

  try {
    // Ensure temporada
    await supabase.from("cartola_temporadas").upsert(
      { season, fonte_historico: "cartola_api" },
      { onConflict: "season" }
    );

    // Step A: Sync clubs
    try {
      const clubesRes = await fetchWithRetry(`${CARTOLA_API}/clubes`);
      if (clubesRes.ok) {
        const clubesData = await clubesRes.json();
        const batch = [];
        for (const [id, clube] of Object.entries(clubesData as Record<string, any>)) {
          batch.push({
            cartola_clube_id: parseInt(id),
            nome: clube.nome || clube.nome_fantasia || "",
            abreviacao: clube.abreviacao || "",
            slug: clube.slug || "",
            escudo_url: clube.escudos?.["60x60"] || clube.escudos?.["45x45"] || null,
          });
        }
        if (batch.length > 0) {
          const { error } = await supabase.from("cartola_clubes").upsert(batch, { onConflict: "cartola_clube_id" });
          if (error) errors.push(`Clubes: ${error.message}`);
          else inserted += batch.length;
        }
      } else {
        errors.push(`Clubes API: HTTP ${clubesRes.status}`);
      }
    } catch (e) {
      errors.push(`Clubes: ${e.message}`);
    }

    // Step B: Determine current round
    let currentRound = 1;
    try {
      const rodadaRes = await fetchWithRetry(`${CARTOLA_API}/rodadas`);
      if (rodadaRes.ok) {
        const rodadas = await rodadaRes.json();
        if (Array.isArray(rodadas)) {
          const finished = rodadas.filter((r: any) => r.fim).sort((a: any, b: any) => b.rodada_id - a.rodada_id);
          if (finished.length > 0) currentRound = finished[0].rodada_id;
        }
      }
    } catch (e) {
      errors.push(`Rodadas: ${e.message}`);
    }

    // Step C: Sync partidas for each round up to current
    for (let round = 1; round <= currentRound; round++) {
      if (isTimeLimitClose()) {
        errors.push(`⏱ Tempo limite na rodada ${round}`);
        break;
      }

      try {
        const partidasRes = await fetchWithRetry(`${CARTOLA_API}/partidas/${round}`);
        if (partidasRes.ok) {
          const data = await partidasRes.json();
          const partidas = data.partidas || data;
          if (Array.isArray(partidas)) {
            const batch = [];
            for (const p of partidas) {
              batch.push({
                cartola_partida_id: p.partida_id || null,
                season,
                rodada: round,
                casa_clube_id: p.clube_casa_id,
                visitante_clube_id: p.clube_visitante_id,
                placar_casa: p.placar_oficial_mandante ?? null,
                placar_visitante: p.placar_oficial_visitante ?? null,
                status_partida: p.partida_data ? "finished" : "scheduled",
                data_partida: p.partida_data ? new Date(p.partida_data).toISOString().split("T")[0] : null,
              });
            }
            if (batch.length > 0) {
              const { error } = await supabase.from("cartola_partidas").upsert(
                batch, { onConflict: "season,rodada,casa_clube_id,visitante_clube_id" }
              );
              if (error) errors.push(`Partidas rodada ${round}: ${error.message}`);
              else updated += batch.length;
            }
          }
        }
      } catch (e) {
        errors.push(`Partidas rodada ${round}: ${e.message}`);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    // Step D: Map clubs to Statball
    await mapClubesStatball(supabase, errors);

    const finalStatus = errors.length > 5 ? "partial" : "completed";
    if (logId) {
      await supabase.from("sync_logs").update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        items_processed: inserted + updated + failed,
        items_created: inserted,
        items_updated: updated,
        items_failed: failed,
        error_message: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
        details: { season, inserted, updated, failed, current_round: currentRound, errors: errors.slice(0, 30) },
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({
      success: true,
      status: finalStatus,
      inserted, updated, failed,
      current_round: currentRound,
      errors: errors.slice(0, 20),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    if (logId) {
      await supabase.from("sync_logs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: err.message,
      }).eq("id", logId);
    }
    throw err;
  }
}

async function syncRound(supabase: any, season: number, rodada: number) {
  const { data: logEntry } = await supabase.from("sync_logs").insert({
    entity_type: "cartola_round_sync",
    status: "running",
    started_at: new Date().toISOString(),
    details: { season, rodada },
  }).select("id").single();
  const logId = logEntry?.id;

  let inserted = 0, updated = 0, failed = 0;
  const errors: string[] = [];

  try {
    await supabase.from("cartola_temporadas").upsert(
      { season, fonte_historico: "cartola_api" },
      { onConflict: "season" }
    );

    // Fetch round data
    const partidasRes = await fetchWithRetry(`${CARTOLA_API}/partidas/${rodada}`);
    if (partidasRes.ok) {
      const data = await partidasRes.json();
      const partidas = data.partidas || data;
      if (Array.isArray(partidas)) {
        const batch = [];
        for (const p of partidas) {
          batch.push({
            cartola_partida_id: p.partida_id || null,
            season,
            rodada,
            casa_clube_id: p.clube_casa_id,
            visitante_clube_id: p.clube_visitante_id,
            placar_casa: p.placar_oficial_mandante ?? null,
            placar_visitante: p.placar_oficial_visitante ?? null,
            status_partida: p.partida_data ? "finished" : "scheduled",
            data_partida: p.partida_data ? new Date(p.partida_data).toISOString().split("T")[0] : null,
          });
        }
        if (batch.length > 0) {
          const { error } = await supabase.from("cartola_partidas").upsert(
            batch, { onConflict: "season,rodada,casa_clube_id,visitante_clube_id" }
          );
          if (error) { errors.push(error.message); failed++; }
          else updated += batch.length;
        }
      }
    } else {
      errors.push(`HTTP ${partidasRes.status}`);
      failed++;
    }

    // Try fetching pontuados for scouts
    try {
      const pontuadosRes = await fetchWithRetry(`${CARTOLA_API}/atletas/pontuados/${rodada}`);
      if (pontuadosRes.ok) {
        const pontuadosData = await pontuadosRes.json();
        const atletas = pontuadosData.atletas || pontuadosData;
        if (typeof atletas === "object") {
          const batch = [];
          for (const [atletaId, atleta] of Object.entries(atletas as Record<string, any>)) {
            const scoutFields: Record<string, number> = {};
            if (atleta.scout) {
              for (const [k, v] of Object.entries(atleta.scout)) {
                if (typeof v === "number" && v !== 0) scoutFields[k] = v;
              }
            }
            batch.push({
              season,
              rodada,
              cartola_atleta_id: parseInt(atletaId),
              clube_id: atleta.clube_id || null,
              participou: true,
              pontos: atleta.pontuacao || 0,
              preco: atleta.preco_num || null,
              variacao_preco: atleta.variacao_num || null,
              campos_scout: scoutFields,
            });
            
            // Also ensure athlete exists
            await supabase.from("cartola_atletas").upsert({
              cartola_atleta_id: parseInt(atletaId),
              apelido: atleta.apelido || `Atleta ${atletaId}`,
              nome: atleta.nome || null,
              posicao_id: atleta.posicao_id || null,
              clube_id: atleta.clube_id || null,
            }, { onConflict: "cartola_atleta_id" });
          }
          
          // Batch insert scouts
          const SCOUT_BATCH = 100;
          for (let i = 0; i < batch.length; i += SCOUT_BATCH) {
            const chunk = batch.slice(i, i + SCOUT_BATCH);
            const { error } = await supabase.from("cartola_scouts_rodada").upsert(
              chunk, { onConflict: "season,rodada,cartola_atleta_id" }
            );
            if (error) errors.push(`Scouts batch: ${error.message}`);
            else inserted += chunk.length;
          }
        }
      }
    } catch (e) {
      errors.push(`Pontuados: ${e.message}`);
    }

    const finalStatus = failed > 0 ? "partial" : "completed";
    if (logId) {
      await supabase.from("sync_logs").update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        items_processed: inserted + updated + failed,
        items_created: inserted,
        items_updated: updated,
        items_failed: failed,
        error_message: errors.length > 0 ? errors.join("; ") : null,
        details: { season, rodada, inserted, updated, failed, errors },
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({
      success: true, status: finalStatus, inserted, updated, failed, errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    if (logId) {
      await supabase.from("sync_logs").update({
        status: "failed", completed_at: new Date().toISOString(), error_message: err.message,
      }).eq("id", logId);
    }
    throw err;
  }
}

async function mapClubesStatball(supabase: any, errors: string[]) {
  try {
    const allClubes = await fetchAll(supabase, "cartola_clubes", "cartola_clube_id, nome, slug, abreviacao");
    const existingMaps = await fetchAll(supabase, "external_id_map", "external_id, internal_id", { entity_type: "team" });
    const mappedIds = new Set(existingMaps.filter(m => m.external_id?.startsWith("cartola:")).map(m => m.external_id));
    const allTeams = await fetchAll(supabase, "times", "id, nome, slug, name_normalized");
    const teamAliases = await fetchAll(supabase, "team_aliases", "team_id, normalized_alias");

    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

    for (const clube of allClubes) {
      if (clube.cartola_clube_id === 1) continue;
      const extId = `cartola:${clube.cartola_clube_id}`;
      if (mappedIds.has(extId)) continue;

      const norm = normalize(clube.nome);
      let teamId: string | null = null;
      
      for (const t of allTeams) {
        if (normalize(t.nome) === norm || (t.slug && normalize(t.slug) === norm) ||
            (t.name_normalized && normalize(t.name_normalized) === norm)) {
          teamId = t.id;
          break;
        }
      }
      if (!teamId) {
        for (const a of teamAliases) {
          if (a.normalized_alias && normalize(a.normalized_alias) === norm) {
            teamId = a.team_id;
            break;
          }
        }
      }

      if (teamId) {
        await supabase.from("external_id_map").upsert({
          entity_type: "team",
          external_id: extId,
          internal_id: teamId,
          confidence: "high",
          metadata: { source: "cartola", cartola_clube_id: clube.cartola_clube_id, nome: clube.nome },
        }, { onConflict: "entity_type,external_id,source_id", ignoreDuplicates: true });
      }
    }
  } catch (e) {
    errors.push(`MapClubes: ${e.message}`);
  }
}
