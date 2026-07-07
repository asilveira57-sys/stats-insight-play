// Sincroniza TODOS os fixtures da Copa 2026 (status, placar, palco) a partir da API-Football.
// Roda a cada 6h via cron, mas pode ser invocada manualmente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// API-Football fixture status short codes → nosso status interno.
function mapStatus(short: string): "scheduled" | "live" | "finished" | "postponed" | "cancelled" {
  const live = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"];
  const finished = ["FT", "AET", "PEN"];
  const cancelled = ["CANC", "ABD", "AWD", "WO"];
  const postponed = ["PST", "TBD"];
  if (live.includes(short)) return "live";
  if (finished.includes(short)) return "finished";
  if (cancelled.includes(short)) return "cancelled";
  if (postponed.includes(short)) return "postponed";
  return "scheduled"; // NS, etc
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  let season = 2026;
  try { const b = await req.json(); if (b.season) season = b.season; } catch {}

  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "fixtures", provider: "api-football", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    if (!apiKey) throw new Error("API_FOOTBALL_KEY not configured");

    const res = await fetch(`${API_BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${season}`, {
      headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "v3.football.api-sports.io" },
    });
    if (!res.ok) throw new Error(`API-Football ${res.status}`);
    const data = await res.json();
    const fixtures = data.response ?? [];

    let processed = 0;
    const transitionedToFinished: number[] = [];
    for (const fx of fixtures) {
      const homeName = fx.teams.home.name;
      const awayName = fx.teams.away.name;

      const teams: Record<string, string> = {};
      for (const t of [fx.teams.home, fx.teams.away]) {
        const slug = slugify(t.name);
        const { data: existing } = await supabase.from("world_cup_2026_teams")
          .select("id").eq("slug", slug).maybeSingle();
        if (existing?.id) {
          teams[t.name] = existing.id;
        } else {
          const { data: created } = await supabase.from("world_cup_2026_teams").insert({
            name: t.name, slug, flag_url: t.logo, external_team_id: t.id, status: "active",
          }).select("id").single();
          teams[t.name] = created!.id;
        }
      }

      const round: string = fx.league.round ?? "";
      const groupMatch = round.match(/Group ([A-L])/i);
      const stage = /final/i.test(round)
          ? (round.match(/quarter/i) ? "quarter_final"
             : round.match(/semi/i) ? "semi_final"
             : /3rd|third/i.test(round) ? "third_place"
             : "final")
        : /round of 32/i.test(round) ? "round_of_32"
        : /round of 16/i.test(round) ? "round_of_16"
        : "group";

      const newStatus = mapStatus(fx.fixture.status.short);

      // Detect transition scheduled/live → finished to enqueue postgame
      const { data: prev } = await supabase.from("world_cup_2026_matches")
        .select("id, status").eq("external_fixture_id", fx.fixture.id).maybeSingle();
      if (prev && prev.status !== "finished" && newStatus === "finished") {
        transitionedToFinished.push(fx.fixture.id);
      }

      // Determinar winner
      let winner_team_id: string | null = null;
      if (newStatus === "finished") {
        if (fx.teams.home.winner === true) winner_team_id = teams[homeName];
        else if (fx.teams.away.winner === true) winner_team_id = teams[awayName];
      }

      await supabase.from("world_cup_2026_matches").upsert({
        external_fixture_id: fx.fixture.id,
        home_team_id: teams[homeName],
        away_team_id: teams[awayName],
        group_letter: groupMatch ? groupMatch[1].toUpperCase() : null,
        stage, round,
        match_date: fx.fixture.date,
        stadium: fx.fixture.venue?.name ?? null,
        city: fx.fixture.venue?.city ?? null,
        status: newStatus,
        home_score: fx.goals.home,
        away_score: fx.goals.away,
        winner_team_id,
        attendance: fx.fixture.referee ? null : null,
      }, { onConflict: "external_fixture_id" });
      processed++;
    }

    // Disparar pós-jogo para partidas recém-encerradas
    if (transitionedToFinished.length > 0) {
      const supaUrl = Deno.env.get("SUPABASE_URL")!;
      for (const fxId of transitionedToFinished) {
        const { data: m } = await supabase.from("world_cup_2026_matches")
          .select("id").eq("external_fixture_id", fxId).maybeSingle();
        if (m?.id) {
          // Fire-and-forget
          fetch(`${supaUrl}/functions/v1/wc2026-generate-postgame`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ match_id: m.id }),
          }).catch(() => {});
        }
      }
    }

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(),
      records_processed: processed,
      payload_snapshot: { total: fixtures.length, finished_now: transitionedToFinished.length },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, processed, finished_now: transitionedToFinished.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
