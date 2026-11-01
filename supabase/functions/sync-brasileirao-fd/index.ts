// Sincroniza a Série A da temporada corrente pelo football-data.org (plano gratuito, 1 chamada por execução).
// Segura contra duplicatas: times são achados por nome/apelido (nunca criados) e o jogo é
// identificado pelo par mandante/visitante dentro da temporada, não pela data em UTC.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SERIE_A_LIGA_ID = "c47cb84c-8cb0-444b-a2b7-9f328c20cc72";

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

// Data e hora no fuso de Brasília (evita jogo noturno virar "dia seguinte")
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const apiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
    if (!apiKey) return json({ ok: false, error: "FOOTBALL_DATA_API_KEY não configurada" }, 500);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let season = new Date().getFullYear();
    try {
      const body = await req.json();
      if (body?.season) season = Number(body.season);
    } catch { /* padrão */ }

    const r = await fetch(`https://api.football-data.org/v4/competitions/BSA/matches?season=${season}`, {
      headers: { "X-Auth-Token": apiKey },
    });
    if (!r.ok) return json({ ok: false, error: `football-data ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
    const data = await r.json();

    const counts: Record<string, number> = {};
    const naoEncontrados = new Set<string>();
    for (const m of data.matches ?? []) {
      const { data: dt, hora } = brDateTime(m.utcDate);
      const { data: res, error } = await supabase.rpc("upsert_partida_temporada", {
        p_liga_id: SERIE_A_LIGA_ID,
        p_casa: m.homeTeam?.name,
        p_fora: m.awayTeam?.name,
        p_data: dt,
        p_hora: hora,
        p_status: STATUS[m.status] ?? "scheduled",
        p_gols_casa: m.score?.fullTime?.home ?? null,
        p_gols_fora: m.score?.fullTime?.away ?? null,
        p_rodada: m.matchday ?? null,
      });
      const key = error ? "erro" : String(res).split(":")[0];
      counts[key] = (counts[key] ?? 0) + 1;
      if (!error && String(res).startsWith("time_nao_encontrado")) naoEncontrados.add(String(res).split(":")[1]);
      if (error) console.error("rpc", m.id, error.message);
    }

    const resumo = { season, recebidas: (data.matches ?? []).length, ...counts, nao_encontrados: [...naoEncontrados] };
    await supabase.from("sync_logs").insert({
      entity_type: "brasileirao_fd",
      status: counts.erro ? "partial" : "completed",
      items_processed: resumo.recebidas,
      items_created: counts.criada ?? 0,
      items_failed: (counts.erro ?? 0) + (counts.time_nao_encontrado ?? 0),
      details: resumo,
    });
    return json({ ok: true, ...resumo });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
