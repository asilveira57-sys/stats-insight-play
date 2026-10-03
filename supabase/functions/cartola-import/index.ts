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

function cleanCsvVal(val: string | undefined): string {
  return (val || "").replace(/^"|"$/g, "").trim();
}

// ---- caRtola repo helpers ----

// Fetch raw file from GitHub
async function fetchGitHubFile(owner: string, repo: string, path: string, branch = "main"): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const res = await fetch(url);
  if (res.ok) return await res.text();
  // Try master
  const url2 = `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`;
  const res2 = await fetch(url2);
  if (res2.ok) return await res2.text();
  return null;
}

// Parse times_ids.csv to build club name -> ID mapping
function parseTimesIds(content: string): Map<string, number> {
  const map = new Map<string, number>();
  const lines = content.split("\n").filter(l => l.trim());
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], ",");
    const nomeCbf = cleanCsvVal(cols[0]); // "América - MG"
    const nomeCartola = cleanCsvVal(cols[1]); // "América-MG"
    const id = parseInt(cleanCsvVal(cols[6])); // id column
    const abrev = cleanCsvVal(cols[7]); // abreviacao
    if (!isNaN(id) && id > 0) {
      map.set(nomeCbf.toLowerCase(), id);
      map.set(nomeCartola.toLowerCase(), id);
      if (abrev) map.set(abrev.toLowerCase(), id);
    }
  }
  return map;
}

// Parse partidas CSV from caRtola format: game,round,date,home_team,score,away_team,arena
interface CartolaPartida {
  game: number;
  round: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  arena: string;
}

function parseCartolaPartidas(content: string): CartolaPartida[] {
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const results: CartolaPartida[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], ",");
    const game = parseInt(cleanCsvVal(cols[0]));
    const round = parseInt(cleanCsvVal(cols[1]));
    const date = cleanCsvVal(cols[2]); // "14/04/2018 - 16:00"
    const homeTeam = cleanCsvVal(cols[3]); // "Cruzeiro - MG"
    const scoreStr = cleanCsvVal(cols[4]); // "0 x 1"
    const awayTeam = cleanCsvVal(cols[5]);
    const arena = cleanCsvVal(cols[6]);
    
    if (isNaN(round) || !homeTeam || !awayTeam) continue;
    
    let homeGoals: number | null = null;
    let awayGoals: number | null = null;
    if (scoreStr) {
      const scoreParts = scoreStr.split(/\s*x\s*/i);
      if (scoreParts.length === 2) {
        homeGoals = parseInt(scoreParts[0].trim());
        awayGoals = parseInt(scoreParts[1].trim());
        if (isNaN(homeGoals)) homeGoals = null;
        if (isNaN(awayGoals)) awayGoals = null;
      }
    }
    
    // Normalize date: "14/04/2018 - 16:00" -> "2018-04-14"
    let normalizedDate = "";
    const dateMatch = date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      normalizedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }
    
    results.push({ game, round, date: normalizedDate, homeTeam, awayTeam, homeGoals, awayGoals, arena });
  }
  return results;
}

// Parse rodada CSV from caRtola: scouts per player
interface CartolaScout {
  atletaId: number;
  nome: string;
  apelido: string;
  clubeAbrev: string;
  clubeNome: string;
  posicao: string;
  statusId: string;
  pontos: number;
  preco: number;
  variacao: number;
  campos: Record<string, number>;
}

function parseCartolaRodada(content: string): CartolaScout[] {
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const headers = parseCsvLine(lines[0], ",").map(h => cleanCsvVal(h));
  const results: CartolaScout[] = [];
  
  // Find column indices
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex(h => h === n || h.endsWith(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  
  const atletaIdIdx = idx(["atletas.atleta_id"]);
  const nomeIdx = idx(["atletas.nome"]);
  const apelidoIdx = idx(["atletas.apelido"]);
  const clubeIdIdx = idx(["atletas.clube_id"]);
  const clubeNomeIdx = idx(["atletas.clube.id.full.name"]);
  const posicaoIdx = idx(["atletas.posicao_id"]);
  const statusIdx = idx(["atletas.status_id"]);
  const pontosIdx = idx(["atletas.pontos_num"]);
  const precoIdx = idx(["atletas.preco_num"]);
  const variacaoIdx = idx(["atletas.variacao_num"]);
  
  // Scout columns
  const scoutNames = ["FC", "FD", "FF", "FS", "G", "I", "RB", "CA", "PE", "A", "SG", "DD", "FT", "GS", "CV", "GC", "PP", "DP"];
  const scoutIndices: { name: string; idx: number }[] = [];
  for (const s of scoutNames) {
    const si = headers.indexOf(s);
    if (si >= 0) scoutIndices.push({ name: s, idx: si });
  }
  
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], ",");
    const atletaId = parseInt(cleanCsvVal(cols[atletaIdIdx]));
    if (isNaN(atletaId)) continue;
    
    const campos: Record<string, number> = {};
    for (const { name, idx: si } of scoutIndices) {
      const val = cleanCsvVal(cols[si]);
      if (val && val !== "NA" && val !== "") {
        const n = parseFloat(val);
        if (!isNaN(n) && n !== 0) campos[name] = n;
      }
    }
    
    results.push({
      atletaId,
      nome: nomeIdx >= 0 ? cleanCsvVal(cols[nomeIdx]) : "",
      apelido: apelidoIdx >= 0 ? cleanCsvVal(cols[apelidoIdx]) : "",
      clubeAbrev: clubeIdIdx >= 0 ? cleanCsvVal(cols[clubeIdIdx]) : "",
      clubeNome: clubeNomeIdx >= 0 ? cleanCsvVal(cols[clubeNomeIdx]) : "",
      posicao: posicaoIdx >= 0 ? cleanCsvVal(cols[posicaoIdx]) : "",
      statusId: statusIdx >= 0 ? cleanCsvVal(cols[statusIdx]) : "",
      pontos: pontosIdx >= 0 ? parseFloat(cleanCsvVal(cols[pontosIdx])) || 0 : 0,
      preco: precoIdx >= 0 ? parseFloat(cleanCsvVal(cols[precoIdx])) || 0 : 0,
      variacao: variacaoIdx >= 0 ? parseFloat(cleanCsvVal(cols[variacaoIdx])) || 0 : 0,
      campos,
    });
  }
  return results;
}

// Position name to ID mapping for caRtola
function posicaoToId(pos: string): number | null {
  const map: Record<string, number> = {
    "gol": 1, "goleiro": 1,
    "lat": 2, "lateral": 2,
    "zag": 3, "zagueiro": 3,
    "mei": 4, "meia": 4,
    "ata": 5, "atacante": 5,
    "tec": 6, "técnico": 6, "tecnico": 6,
  };
  return map[pos.toLowerCase()] ?? null;
}

// Resolve club ID from team name using times_ids mapping
function resolveClubId(teamName: string, timesMap: Map<string, number>, clubeCache: Map<number, string>): number | null {
  const lower = teamName.toLowerCase().trim();
  const id = timesMap.get(lower);
  if (id) return id;
  
  // Try without state suffix: "Cruzeiro - MG" -> "Cruzeiro"
  const withoutState = lower.replace(/\s*-\s*[a-z]{2}$/i, "").trim();
  for (const [key, val] of timesMap.entries()) {
    if (key.startsWith(withoutState) || key.replace(/\s*-\s*[a-z]{2}$/i, "").trim() === withoutState) {
      return val;
    }
  }
  
  // Try matching by existing clubeCache values
  for (const [cid, nome] of clubeCache.entries()) {
    if (nome.toLowerCase() === lower || nome.toLowerCase() === withoutState) {
      return cid;
    }
  }
  
  return null;
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
      return new Response(JSON.stringify({
        cartolafcdados: [2014, 2015, 2016, 2017],
        cartola_caRtola: [2014, 2015, 2016, 2017, 2018, 2019, 2020],
        note: "Temporadas 2021+ devem ser sincronizadas via API pública do Cartola",
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
      details: { seasons, source: "caRtola" },
    }).select("id").single();
    const logId = logEntry?.id;

    let totalInserted = 0, totalUpdated = 0, totalSkipped = 0, totalFailed = 0;
    const errors: string[] = [];

    // Pre-load existing cartola_clubes
    const existingClubes = await fetchAll(supabase, "cartola_clubes", "cartola_clube_id, nome");
    const clubeCache = new Map<number, string>();
    for (const c of existingClubes) clubeCache.set(c.cartola_clube_id, c.nome);

    // Load times_ids.csv for team name -> ID resolution
    const timesIdsCsv = await fetchGitHubFile("henriquepgomide", "caRtola", "data/times_ids.csv");
    const timesMap = timesIdsCsv ? parseTimesIds(timesIdsCsv) : new Map<string, number>();
    console.log(`Loaded times_ids.csv with ${timesMap.size} entries`);

    const CARTOLA_FCDADOS_SEASONS = [2014, 2015, 2016, 2017];
    const CARTOLA_REPO_SEASONS = [2014, 2015, 2016, 2017, 2018, 2019, 2020];

    for (const season of seasons) {
      if (isTimeLimitClose()) {
        errors.push(`⏱ Tempo limite atingido na temporada ${season}`);
        break;
      }

      const useCartolaFCDados = CARTOLA_FCDADOS_SEASONS.includes(season);
      const useCartolaRepo = CARTOLA_REPO_SEASONS.includes(season);

      if (!useCartolaFCDados && !useCartolaRepo) {
        errors.push(`Temporada ${season}: não disponível nos repositórios GitHub (disponíveis: 2014-2020). Use a sincronização via API para temporadas 2021+.`);
        totalSkipped++;
        continue;
      }

      const source = useCartolaRepo ? "caRtola" : "CartolaFCDados";
      console.log(`Importando temporada ${season} via ${source}...`);

      // Ensure temporada exists
      await supabase.from("cartola_temporadas").upsert(
        { season, fonte_historico: source },
        { onConflict: "season" }
      );

      if (useCartolaFCDados && !useCartolaRepo) {
        // Use old CartolaFCDados format (2014-2017 only)
        await importFromCartolaFCDados(supabase, season, clubeCache, errors, { inserted: 0, updated: 0, failed: 0 });
      } else {
        // Use caRtola format (2014-2020)
        const result = await importFromCaRtola(supabase, season, timesMap, clubeCache, errors);
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        totalFailed += result.failed;
      }
    }

    // Map Cartola clubs to Aleball teams via external_id_map
    await mapClubesAleball(supabase, clubeCache, errors);

    // Map Cartola partidas to Aleball partidas
    await mapPartidasAleball(supabase, seasons, errors);

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

// =============================================
// Import from caRtola repo (henriquepgomide/caRtola)
// Supports: 2014-2020
// =============================================
async function importFromCaRtola(
  supabase: any,
  season: number,
  timesMap: Map<string, number>,
  clubeCache: Map<number, string>,
  errors: string[]
): Promise<{ inserted: number; updated: number; failed: number }> {
  let inserted = 0, updated = 0, failed = 0;
  const owner = "henriquepgomide";
  const repo = "caRtola";

  // 1. Import clubs from times_ids.csv (already loaded globally, but also register in cartola_clubes)
  for (const [name, id] of timesMap.entries()) {
    if (id <= 0 || clubeCache.has(id)) continue;
    const cleanName = name.replace(/\s*-\s*[a-z]{2}$/i, "").trim();
    const properName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    await supabase.from("cartola_clubes").upsert(
      { cartola_clube_id: id, nome: properName },
      { onConflict: "cartola_clube_id" }
    );
    clubeCache.set(id, properName);
  }

  // 2. Import Partidas
  console.log(`  Fetching partidas for ${season}...`);
  const partidasCsv = await fetchGitHubFile(owner, repo, `data/${season}/${season}_partidas.csv`);
  if (!partidasCsv) {
    errors.push(`${season}: arquivo de partidas não encontrado`);
    return { inserted: 0, updated: 0, failed: 1 };
  }

  const partidas = parseCartolaPartidas(partidasCsv);
  console.log(`  Parsed ${partidas.length} partidas for ${season}`);

  if (partidas.length === 0) {
    errors.push(`${season}: nenhuma partida parseada do CSV`);
    return { inserted: 0, updated: 0, failed: 1 };
  }

  // Resolve team names to club IDs and batch upsert
  const BATCH_SIZE = 50;
  for (let i = 0; i < partidas.length; i += BATCH_SIZE) {
    if (isTimeLimitClose()) { errors.push(`⏱ Tempo limite em partidas ${season}`); break; }
    const batch = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, partidas.length); j++) {
      const p = partidas[j];
      const homeId = resolveClubId(p.homeTeam, timesMap, clubeCache);
      const awayId = resolveClubId(p.awayTeam, timesMap, clubeCache);
      
      if (!homeId || !awayId) {
        if (!homeId) errors.push(`${season} R${p.round}: clube não encontrado: "${p.homeTeam}"`);
        if (!awayId) errors.push(`${season} R${p.round}: clube não encontrado: "${p.awayTeam}"`);
        failed++;
        continue;
      }
      
      batch.push({
        season,
        rodada: p.round,
        casa_clube_id: homeId,
        visitante_clube_id: awayId,
        placar_casa: p.homeGoals,
        placar_visitante: p.awayGoals,
        data_partida: p.date || null,
        status_partida: p.homeGoals !== null ? "finished" : "scheduled",
      });
    }
    if (batch.length > 0) {
      const { error } = await supabase.from("cartola_partidas").upsert(
        batch,
        { onConflict: "season,rodada,casa_clube_id,visitante_clube_id" }
      );
      if (error) {
        errors.push(`${season} partidas batch ${i}: ${error.message}`);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }
    }
  }

  // 3. Import Jogadores
  console.log(`  Fetching jogadores for ${season}...`);
  const jogadoresCsv = await fetchGitHubFile(owner, repo, `data/${season}/${season}_jogadores.csv`);
  if (jogadoresCsv) {
    const lines = jogadoresCsv.split("\n").filter(l => l.trim());
    const headers = parseCsvLine(lines[0], ",").map(h => cleanCsvVal(h));
    
    const atletaIdIdx = headers.findIndex(h => h.includes("atleta_id"));
    const apelidoIdx = headers.findIndex(h => h.includes("apelido"));
    const clubeNomeIdx = headers.findIndex(h => h.includes("clube") && (h.includes("full.name") || h.includes("nome")));
    const posicaoIdx = headers.findIndex(h => h.includes("posicao"));
    
    const atletaBatch: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i], ",");
      const atletaId = parseInt(cleanCsvVal(cols[atletaIdIdx]));
      const apelido = cleanCsvVal(cols[apelidoIdx]);
      if (isNaN(atletaId) || !apelido) continue;
      
      const clubeNome = clubeNomeIdx >= 0 ? cleanCsvVal(cols[clubeNomeIdx]) : "";
      const clubeId = clubeNome ? resolveClubId(clubeNome, timesMap, clubeCache) : null;
      const posicao = posicaoIdx >= 0 ? cleanCsvVal(cols[posicaoIdx]) : "";
      
      atletaBatch.push({
        cartola_atleta_id: atletaId,
        apelido,
        clube_id: clubeId,
        posicao_id: posicaoToId(posicao),
      });
    }
    
    // Upsert in batches
    for (let i = 0; i < atletaBatch.length; i += BATCH_SIZE) {
      if (isTimeLimitClose()) break;
      const batch = atletaBatch.slice(i, i + BATCH_SIZE);
      await supabase.from("cartola_atletas").upsert(batch, { onConflict: "cartola_atleta_id" });
    }
    console.log(`  Imported ${atletaBatch.length} jogadores for ${season}`);
  }

  // 4. Import Scouts per Rodada
  console.log(`  Importing scouts for ${season}...`);
  let scoutsImported = 0;
  for (let rodada = 1; rodada <= 38; rodada++) {
    if (isTimeLimitClose()) { errors.push(`⏱ Tempo limite em scouts ${season} rodada ${rodada}`); break; }
    
    const rodadaCsv = await fetchGitHubFile(owner, repo, `data/${season}/rodada-${rodada}.csv`);
    if (!rodadaCsv) continue; // Rodada doesn't exist
    
    const scouts = parseCartolaRodada(rodadaCsv);
    if (scouts.length === 0) continue;
    
    // Build abreviacao -> club ID mapping
    const abrevToId = new Map<string, number>();
    for (const [name, id] of timesMap.entries()) {
      if (name.length <= 3) abrevToId.set(name, id);
    }
    
    const SCOUT_BATCH = 100;
    for (let i = 0; i < scouts.length; i += SCOUT_BATCH) {
      if (isTimeLimitClose()) break;
      const batch = [];
      for (let j = i; j < Math.min(i + SCOUT_BATCH, scouts.length); j++) {
        const s = scouts[j];
        const clubeId = abrevToId.get(s.clubeAbrev.toLowerCase()) || 
                        resolveClubId(s.clubeNome, timesMap, clubeCache) || 
                        null;
        
        // Also upsert the atleta
        batch.push({
          season,
          rodada,
          cartola_atleta_id: s.atletaId,
          clube_id: clubeId,
          participou: Object.keys(s.campos).length > 0 || s.pontos !== 0,
          pontos: s.pontos,
          preco: s.preco,
          variacao_preco: s.variacao,
          campos_scout: s.campos,
        });
      }
      if (batch.length > 0) {
        const { error } = await supabase.from("cartola_scouts_rodada").upsert(
          batch,
          { onConflict: "season,rodada,cartola_atleta_id" }
        );
        if (error) {
          errors.push(`${season}/rodada-${rodada} scouts: ${error.message}`);
        } else {
          scoutsImported += batch.length;
        }
      }
    }
    
    // Also ensure all athletes from this rodada are in cartola_atletas
    const atletaUpserts = scouts
      .filter(s => s.apelido)
      .map(s => ({
        cartola_atleta_id: s.atletaId,
        apelido: s.apelido,
        nome: s.nome || null,
        posicao_id: posicaoToId(s.posicao),
        clube_id: abrevToId.get(s.clubeAbrev.toLowerCase()) || resolveClubId(s.clubeNome, timesMap, clubeCache) || null,
      }));
    
    for (let i = 0; i < atletaUpserts.length; i += BATCH_SIZE) {
      if (isTimeLimitClose()) break;
      const batch = atletaUpserts.slice(i, i + BATCH_SIZE);
      await supabase.from("cartola_atletas").upsert(batch, { onConflict: "cartola_atleta_id" });
    }
  }
  console.log(`  Imported ${scoutsImported} scouts for ${season}`);

  return { inserted, updated, failed };
}

// =============================================
// Import from CartolaFCDados repo (thevtm/CartolaFCDados)
// Supports: 2014-2017
// =============================================
async function importFromCartolaFCDados(
  supabase: any,
  season: number,
  clubeCache: Map<number, string>,
  errors: string[],
  counters: { inserted: number; updated: number; failed: number }
) {
  const baseUrl = `https://raw.githubusercontent.com/thevtm/CartolaFCDados/master/${season}`;

  // 1. Import Clubes
  try {
    const clubesRes = await fetch(`${baseUrl}/Clubes.csv`);
    if (clubesRes.ok) {
      const clubesCsv = await clubesRes.text();
      const lines = clubesCsv.split("\n").filter(l => l.trim());
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
  } catch (e) { errors.push(`${season}/Clubes.csv: ${e.message}`); }

  // 2. Import Atletas
  try {
    const atletasRes = await fetch(`${baseUrl}/Atletas.csv`);
    if (atletasRes.ok) {
      const atletasCsv = await atletasRes.text();
      const lines = atletasCsv.split("\n").filter(l => l.trim());
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
  } catch (e) { errors.push(`${season}/Atletas.csv: ${e.message}`); }

  // 3. Import Partidas
  try {
    const partidasRes = await fetch(`${baseUrl}/Partidas.csv`);
    if (partidasRes.ok) {
      const partidasCsv = await partidasRes.text();
      const lines = partidasCsv.split("\n").filter(l => l.trim());
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
          const { error } = await supabase.from("cartola_partidas").upsert(
            batch, { onConflict: "season,rodada,casa_clube_id,visitante_clube_id" }
          );
          if (error) {
            errors.push(`${season}/Partidas batch ${i}: ${error.message}`);
            counters.failed += batch.length;
          } else {
            counters.inserted += batch.length;
          }
        }
      }
    }
  } catch (e) { errors.push(`${season}/Partidas.csv: ${e.message}`); counters.failed++; }

  // 4. Import Scouts
  try {
    const scoutsRes = await fetch(`${baseUrl}/Scouts.csv`);
    if (scoutsRes.ok) {
      const scoutsCsv = await scoutsRes.text();
      const lines = scoutsCsv.split("\n").filter(l => l.trim());
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
          const campos_scout: Record<string, number> = {};
          const scoutCols = ["FS", "PE", "A", "FT", "FD", "FF", "G", "I", "PP", "RB", "FC", "GC", "CA", "CV", "SG", "DD", "DP", "GS"];
          for (let k = 0; k < scoutCols.length; k++) {
            const idx = 8 + k;
            if (idx < cols.length) {
              const val = parseInt(cols[idx]);
              if (!isNaN(val) && val !== 0) campos_scout[scoutCols[k]] = val;
            }
          }
          batch.push({
            season, rodada, cartola_atleta_id: atletaId,
            clube_id: isNaN(clubeId) ? null : clubeId,
            participou, pontos, preco, variacao_preco: variacao, campos_scout,
          });
        }
        if (batch.length > 0) {
          const { error } = await supabase.from("cartola_scouts_rodada").upsert(
            batch, { onConflict: "season,rodada,cartola_atleta_id" }
          );
          if (error) errors.push(`${season}/Scouts batch ${i}: ${error.message}`);
        }
      }
    }
  } catch (e) { errors.push(`${season}/Scouts.csv: ${e.message}`); }
}

// Map cartola_clubes -> times via external_id_map
async function mapClubesAleball(supabase: any, clubeCache: Map<number, string>, errors: string[]) {
  try {
    const existingMaps = await fetchAll(supabase, "external_id_map", "external_id, internal_id", {
      entity_type: "team",
    });
    const mappedExternalIds = new Set(existingMaps.filter(m => m.external_id?.startsWith("cartola:")).map(m => m.external_id));

    const allTeams = await fetchAll(supabase, "times", "id, nome, slug, name_normalized");
    const teamAliases = await fetchAll(supabase, "team_aliases", "team_id, normalized_alias");

    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

    for (const [cartolaId, nome] of clubeCache.entries()) {
      if (cartolaId === 1) continue;
      const externalId = `cartola:${cartolaId}`;
      if (mappedExternalIds.has(externalId)) continue;

      const normalizedNome = normalize(nome);
      let matchedTeamId: string | null = null;
      for (const team of allTeams) {
        if (normalize(team.nome) === normalizedNome || (team.slug && team.slug === normalizedNome) ||
            (team.name_normalized && normalize(team.name_normalized) === normalizedNome)) {
          matchedTeamId = team.id;
          break;
        }
      }
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
  } catch (e) { errors.push(`Mapeamento clubes: ${e.message}`); }
}

// Map cartola_partidas -> partidas via external_id_map
async function mapPartidasAleball(supabase: any, seasons: number[], errors: string[]) {
  try {
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

    const { data: liga } = await supabase.from("ligas").select("id").ilike("nome", "%Brasileir%Série A%").maybeSingle();
    if (!liga) {
      const { data: liga2 } = await supabase.from("ligas").select("id").ilike("nome", "%Brasileir%").limit(1).maybeSingle();
      if (!liga2) {
        errors.push("Liga Brasileirão não encontrada no Aleball para mapeamento");
        return;
      }
    }

    for (const season of seasons) {
      const partidas = await fetchAll(supabase, "cartola_partidas", "*", { season });
      
      for (const p of partidas) {
        if (isTimeLimitClose()) break;
        if (p.partida_aleball_id) continue;
        const homeSbId = teamMap.get(p.casa_clube_id);
        const awaySbId = teamMap.get(p.visitante_clube_id);
        if (!homeSbId || !awaySbId) continue;

        const { data: existing } = await supabase.from("partidas")
          .select("id")
          .eq("time_casa_id", homeSbId)
          .eq("time_fora_id", awaySbId)
          .gte("data", `${season}-01-01`)
          .lte("data", `${season}-12-31`)
          .maybeSingle();

        if (existing) {
          await supabase.from("cartola_partidas").update({
            partida_aleball_id: existing.id,
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
  } catch (e) { errors.push(`Mapeamento partidas: ${e.message}`); }
}
