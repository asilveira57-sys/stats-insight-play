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

    // Modo manual: { match_ids: [uuid,...] } força reprocessar mesmo finalizados
    let forcedIds: string[] | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (Array.isArray(body?.match_ids) && body.match_ids.length) forcedIds = body.match_ids;
      } catch { /* sem body */ }
    }

    const in90Iso = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const back4hIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    let candidatesQ = supabase
      .from("world_cup_2026_matches")
      .select("id, external_fixture_id, status, match_date, home_team_id, away_team_id");
    if (forcedIds) {
      candidatesQ = candidatesQ.in("id", forcedIds);
    } else {
      candidatesQ = candidatesQ.or(`status.eq.live,and(status.eq.scheduled,match_date.gte.${back4hIso},match_date.lte.${in90Iso})`);
    }
    const { data: candidates } = await candidatesQ;

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

    // 2) Buscar status atual desses fixtures (uma chamada por id ou batch)
    const idList = list.map((m) => m.external_fixture_id).filter(Boolean);
    const fixtures = idList.length === 1
      ? await apiGet(`/fixtures?id=${idList[0]}`, apiKey)
      : await apiGet(`/fixtures?ids=${idList.join("-")}`, apiKey);
    console.log("[wc2026-sync-live] candidates:", list.length, "fixtures:", fixtures.length);

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

      // Para jogos live ou recém-finalizados: sincronizar LINEUPS (upsert players) ANTES dos eventos
      if (newStatus === "live" || newStatus === "finished") {
        // bloco lineups
        try {
          const lns = await apiGet(`/fixtures/lineups?fixture=${fx.fixture.id}`, apiKey);
          if (lns.length) {
            type ApiP = { player: { id: number; name: string; number: number | null; pos: string | null }; teamUuid: string; isStarter: boolean; formation: string | null };
            const allPlayers: ApiP[] = [];
            for (const team of lns) {
              const teamUuid = team.team.id === fx.teams.home.id ? our.home_team_id : our.away_team_id;
              for (const p of team.startXI ?? []) {
                allPlayers.push({ player: p.player, teamUuid, isStarter: true, formation: team.formation });
              }
              for (const p of team.substitutes ?? []) {
                allPlayers.push({ player: p.player, teamUuid, isStarter: false, formation: team.formation });
              }
            }
            const slugify = (s: string, extId: number) =>
              s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + `-${extId}`;
            const playerUpserts = allPlayers
              .filter(ap => ap.player?.id && ap.player?.name)
              .map(ap => ({
                team_id: ap.teamUuid,
                external_player_id: String(ap.player.id),
                name: ap.player.name,
                slug: slugify(ap.player.name, ap.player.id),
                shirt_number: ap.player.number ?? null,
                position: ap.player.pos ?? null,
                source: "api-football",
              }));
            if (playerUpserts.length) {
              await supabase
                .from("world_cup_2026_players")
                .upsert(playerUpserts, { onConflict: "team_id,external_player_id", ignoreDuplicates: false });
            }
            const teamIds = Array.from(new Set(allPlayers.map(a => a.teamUuid)));
            const extIds = Array.from(new Set(allPlayers.map(a => String(a.player.id))));
            const { data: pRows } = await supabase
              .from("world_cup_2026_players")
              .select("id, team_id, external_player_id")
              .in("team_id", teamIds)
              .in("external_player_id", extIds);
            const idMap = new Map<string, string>();
            (pRows ?? []).forEach((r: any) => idMap.set(`${r.team_id}::${r.external_player_id}`, r.id));
            await supabase.from("world_cup_2026_lineups").delete().eq("match_id", our.id);
            const rows = allPlayers.map(ap => ({
              match_id: our.id,
              team_id: ap.teamUuid,
              player_id: idMap.get(`${ap.teamUuid}::${ap.player.id}`) ?? null,
              position: ap.player?.pos ?? null,
              formation: ap.formation,
              is_starter: ap.isStarter,
              is_official: true,
              source: "api-football",
            }));
            if (rows.length) {
              await supabase.from("world_cup_2026_lineups").insert(rows);
              lineupsSynced += rows.length;
            }
          }
        } catch (err) {
          console.error("lineups sync error", err);
        }
      }

      // Eventos (depois dos lineups, pra poder linkar player_id)
      if (newStatus === "live" || newStatus === "finished") {
        try {
          const evs = await apiGet(`/fixtures/events?fixture=${fx.fixture.id}`, apiKey);
          // Limpar e regravar (idempotente sem necessidade de unique)
          await supabase.from("world_cup_2026_match_events").delete().eq("match_id", our.id);
          if (evs.length) {
            // Pre-buscar players desta partida pra linkar player_id quando possível
            const extIdsEv = Array.from(new Set(evs.map((e: any) => e.player?.id).filter(Boolean).map(String)));
            const idMapEv = new Map<string, string>();
            if (extIdsEv.length) {
              const { data: pRows } = await supabase
                .from("world_cup_2026_players")
                .select("id, external_player_id")
                .in("external_player_id", extIdsEv);
              (pRows ?? []).forEach((r: any) => idMapEv.set(String(r.external_player_id), r.id));
            }
            const rows = evs.map((e: any) => ({
              match_id: our.id,
              team_id: e.team?.id === fx.teams.home.id ? our.home_team_id : our.away_team_id,
              player_id: e.player?.id ? (idMapEv.get(String(e.player.id)) ?? null) : null,
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
