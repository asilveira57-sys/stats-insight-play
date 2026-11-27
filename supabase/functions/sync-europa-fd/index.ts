// Sincroniza campeonatos europeus pelo football-data.org (plano gratuito: 10 chamadas/min).
// Uma chamada por campeonato. Times são achados por nome/apelido (nunca criados).
// O jogo é identificado pelo par mandante/visitante dentro da janela da temporada
// (ligas) ou de poucos dias em volta da data (copas, onde o par pode se repetir).
//
// Corpo opcional: { "competitions": ["PL","PD","CL"], "season": 2026 }
// season = ano em que a temporada começa (2026 = 2026/27).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Competicao = { ligaId: string; copa: boolean };

// Ligas que já guardam a temporada corrente no banco
const COMPETICOES: Record<string, Competicao> = {
  PL: { ligaId: "a24cb871-c117-4e33-b65a-70bfee62acb5", copa: false }, // Premier League (England)
  PD: { ligaId: "331d66fd-6c1c-4f58-b5b1-3bb4658b7383", copa: false }, // Primera Division (Spain)
  CL: { ligaId: "2a51f48b-0a9c-486e-a0e9-c2c9068e2159", copa: true }, // UEFA Champions League
};

const STATUS: Record<string, string> = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  IN_PLAY: "live",
  PAUSED: "live",
  LIVE: "live",
  FINISHED: "finished",
  AWARDED: "finished",
  POSTPONED: "postponed",
  SUSPENDED: "postponed",
  CANCELLED: "cancelled",
};

function brDateTime(utc: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(utc));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { data: `${get("year")}-${get("month")}-${get("day")}`, hora: `${hour}:${get("minute")}:00` };
}

function somaDias(iso: string, dias: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Temporada europeia: de julho a junho
function temporadaAtual() {
  const hoje = new Date();
  return hoje.getUTCMonth() >= 6 ? hoje.getUTCFullYear() : hoje.getUTCFullYear() - 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const apiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
    if (!apiKey) return json({ ok: false, error: "FOOTBALL_DATA_API_KEY não configurada" }, 500);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let codigos = Object.keys(COMPETICOES);
    let season = temporadaAtual();
    try {
      const body = await req.json();
      if (Array.isArray(body?.competitions)) codigos = body.competitions.filter((c: string) => COMPETICOES[c]);
      if (body?.season) season = Number(body.season);
    } catch { /* padrão */ }

    const resultado: Record<string, unknown> = {};
    for (const codigo of codigos) {
      const comp = COMPETICOES[codigo];
      const r = await fetch(`https://api.football-data.org/v4/competitions/${codigo}/matches?season=${season}`, {
        headers: { "X-Auth-Token": apiKey },
      });
      if (!r.ok) {
        resultado[codigo] = { erro: `football-data ${r.status}: ${(await r.text()).slice(0, 200)}` };
        continue;
      }
      const data = await r.json();
      const jogos = (data.matches ?? []).map((m: any) => ({ m, ...brDateTime(m.utcDate) }));
      const datas = jogos.map((j: any) => j.data).sort();
      const iniTemporada = datas[0] ? somaDias(datas[0], -7) : `${season}-07-01`;
      const fimTemporada = datas.length ? somaDias(datas[datas.length - 1], 30) : `${season + 1}-07-31`;

      const counts: Record<string, number> = {};
      const naoEncontrados = new Set<string>();
      for (const { m, data: dt, hora } of jogos) {
        if (!m.homeTeam?.name || !m.awayTeam?.name) {
          counts.sem_times = (counts.sem_times ?? 0) + 1; // mata-mata ainda sem classificados
          continue;
        }
        const { data: res, error } = await supabase.rpc("upsert_partida_janela", {
          p_liga_id: comp.ligaId,
          p_casa: m.homeTeam?.name,
          p_fora: m.awayTeam?.name,
          p_data: dt,
          p_hora: hora,
          p_status: STATUS[m.status] ?? "scheduled",
          p_gols_casa: m.score?.fullTime?.home ?? null,
          p_gols_fora: m.score?.fullTime?.away ?? null,
          p_rodada: m.matchday ?? null,
          p_ini: comp.copa ? somaDias(dt, -5) : iniTemporada,
          p_fim: comp.copa ? somaDias(dt, 5) : fimTemporada,
        });
        const key = error ? "erro" : String(res).split(":")[0];
        counts[key] = (counts[key] ?? 0) + 1;
        if (!error && String(res).startsWith("time_nao_encontrado")) naoEncontrados.add(String(res).split(":")[1]);
        if (error) console.error("rpc", codigo, m.id, error.message);
      }
      resultado[codigo] = { recebidas: jogos.length, ...counts, nao_encontrados: [...naoEncontrados] };

      await supabase.from("sync_logs").insert({
        entity_type: `football_data_${codigo.toLowerCase()}`,
        status: counts.erro ? "partial" : "completed",
        items_processed: jogos.length,
        items_created: counts.criada ?? 0,
        items_failed: (counts.erro ?? 0) + (counts.time_nao_encontrado ?? 0),
        details: { season, ...(resultado[codigo] as object) },
      });
    }

    return json({ ok: true, season, ...resultado });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
