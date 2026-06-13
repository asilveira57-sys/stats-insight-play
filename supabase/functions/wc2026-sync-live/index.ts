// Sincroniza jogos AO VIVO (e os que começam em até 60 min) da Copa 2026.
// Atualiza status, placar, eventos, escalações.
// Roda a cada 60s via cron. Custo: 1 chamada lista + ~3 chamadas por jogo live (events, lineups, stats).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;

function mapStatus(short: string): "scheduled" | "live" | "finished" | "postponed" | "cancelled" {
  const live = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"];
  const finished = ["FT", "AET", "PEN"];
  const cancelled = ["CANC", "ABD", "AWD", "WO"];
  const postponed = ["PST", "TBD"];
  if (live.includes(short)) return "live";
  if (finished.includes(short)) return "finished";
  if (cancelled.includes(short)) return "cancelled";
  if (postponed.includes(short)) return "postponed";
  return "scheduled";
}

async function apiGet(path: string, apiKey: string) {
  const r = await fetch(`${API_BASE}${path}`, {
    headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "v3.football.api-sports.io" },
  });
  if (!r.ok) throw new Error(`API-Football ${path} ${r.status}`);
  return (await r.json()).response ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");

  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "live", provider: "api-football", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    if (!apiKey) throw new Error("API_FOOTBALL_KEY not configured");

    // 1) Pegar candidatos: live no nosso DB OU scheduled nos próximos 90 minutos OU que deveriam ter começado nas últimas 4h
    const nowIso = new Date().toISOString();
    const in90Iso = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const back4hIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    const { data: candidates } = await supabase
      .from("world_cup_2026_matches")
      .select("id, external_fixture_id, status, match_date, home_team_id, away_team_id")
      .or(`status.eq.live,and(status.eq.scheduled,match_date.gte.${back4hIso},match_date.lte.${in90Iso})`);

    const list = candidates ?? [];
    if (list.length === 0) {
      await supabase.from("world_cup_2026_sync_logs").update({
        status: "success", finished_at: new Date().toISOString(), records_processed: 0,
        payload_snapshot: { msg: "no live or imminent matches" },
      }).eq("id", logId);
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Buscar status atual desses fixtures (uma chamada batch)
    const ids = list.map((m) => m.external_fixture_id).filter(Boolean).join("-");
    const fixtures = await apiGet(`/fixtures?ids=${ids}`, apiKey);

    const transitionedToFinished: string[] = [];
    let updated = 0;
    let eventsSynced = 0;
    let lineupsSynced = 0;

    for (const fx of fixtures) {
      const our = list.find((m) => m.external_fixture_id === fx.fixture.id);
      if (!our) continue;
      const newStatus = mapStatus(fx.fixture.status.short);

      let winner_team_id: string | null = null;
      if (newStatus === "finished") {
        if (fx.teams.home.winner === true) winner_team_id = our.home_team_id;
        else if (fx.teams.away.winner === true) winner_team_id = our.away_team_id;
      }

      await supabase.from("world_cup_2026_matches").update({
        status: newStatus,
        home_score: fx.goals.home,
        away_score: fx.goals.away,
        winner_team_id,
        attendance: typeof fx.fixture.attendance === "number" ? fx.fixture.attendance : undefined,
      }).eq("id", our.id);
      updated++;

      if (our.status !== "finished" && newStatus === "finished") {
        transitionedToFinished.push(our.id);
      }

      // Para jogos live ou recém-finalizados: sincronizar eventos + lineups
      if (newStatus === "live" || newStatus === "finished") {
        try {
          const evs = await apiGet(`/fixtures/events?fixture=${fx.fixture.id}`, apiKey);
          // Limpar e regravar (idempotente sem necessidade de unique)
          await supabase.from("world_cup_2026_match_events").delete().eq("match_id", our.id);
          if (evs.length) {
            const rows = evs.map((e: any) => ({
              match_id: our.id,
              team_id: e.team?.id === fx.teams.home.id ? our.home_team_id : our.away_team_id,
              event_type: (e.type ?? "event").toLowerCase(),
              minute: e.time?.elapsed ?? 0,
              extra_minute: e.time?.extra ?? null,
              description: [
                e.detail,
                e.player?.name ? `— ${e.player.name}` : "",
                e.assist?.name ? ` (assist: ${e.assist.name})` : "",
              ].filter(Boolean).join(" "),
            }));
            await supabase.from("world_cup_2026_match_events").insert(rows);
            eventsSynced += rows.length;
          }
        } catch (err) {
          console.error("events sync error", err);
        }

        try {
          const lns = await apiGet(`/fixtures/lineups?fixture=${fx.fixture.id}`, apiKey);
          if (lns.length) {
            await supabase.from("world_cup_2026_lineups").delete().eq("match_id", our.id);
            const rows: any[] = [];
            for (const team of lns) {
              const teamUuid = team.team.id === fx.teams.home.id ? our.home_team_id : our.away_team_id;
              for (const p of team.startXI ?? []) {
                rows.push({
                  match_id: our.id, team_id: teamUuid,
                  position: p.player.pos, formation: team.formation,
                  is_starter: true, is_official: true, source: "api-football",
                  // player_id deixado nulo; nome via description não disponível neste schema
                });
              }
              for (const p of team.substitutes ?? []) {
                rows.push({
                  match_id: our.id, team_id: teamUuid,
                  position: p.player.pos, formation: team.formation,
                  is_starter: false, is_official: true, source: "api-football",
                });
              }
            }
            if (rows.length) {
              await supabase.from("world_cup_2026_lineups").insert(rows);
              lineupsSynced += rows.length;
            }
          }
        } catch (err) {
          console.error("lineups sync error", err);
        }
      }
    }

    // Disparar postgame para os recém-encerrados
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    for (const mid of transitionedToFinished) {
      fetch(`${supaUrl}/functions/v1/wc2026-generate-postgame`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ match_id: mid }),
      }).catch(() => {});
    }

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: updated,
      payload_snapshot: { updated, eventsSynced, lineupsSynced, finished_now: transitionedToFinished.length },
    }).eq("id", logId);

    return new Response(JSON.stringify({
      success: true, updated, eventsSynced, lineupsSynced,
      finished_now: transitionedToFinished.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("world_cup_2026_sync_logs").update({
      status: "error", finished_at: new Date().toISOString(), error_message: msg,
    }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
