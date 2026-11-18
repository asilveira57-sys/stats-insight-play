// Atualiza placares pela Sportmonks (API v3).
//
// Modos (body JSON):
//   { "mode": "leagues" }
//       Lista os campeonatos liberados na assinatura (id, nome, país, temporada atual)
//       e sugere a liga do Aleball com o mesmo nome. Serve para montar o mapeamento.
//   { "mode": "sync", "from"?: "YYYY-MM-DD", "to"?: "YYYY-MM-DD" }   (padrão)
//       Busca os jogos do período (padrão: 7 dias atrás até 14 dias à frente) dos
//       campeonatos mapeados em app_settings.sportmonks_leagues e atualiza o banco.
//       Períodos maiores que 100 dias são quebrados em pedaços.
//
// Mapeamento (app_settings, key = 'sportmonks_leagues'):
//   [{ "sm_id": 648, "liga_id": "<uuid da liga>", "tipo": "liga" | "copa", "nome": "Série A" }]
//
// Segurança contra duplicatas (mesma linha do sync-brasileirao-fd):
//   - times são achados por nome/apelido (find_team_by_name) e NUNCA criados;
//   - o jogo é procurado pelo par mandante/visitante na liga, até 4 dias de distância;
//     em ligas de pontos corridos ("liga") também vale o mesmo par no mesmo ano, mas só
//     se aquele jogo ainda não tiver placar (evita confundir turno com mata-mata);
//   - jogo encerrado nunca volta para "agendado"; placar só é gravado se o jogo começou;
//   - só cria um jogo novo quando nenhum desses casa.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BASE = "https://api.sportmonks.com/v3/football";

type MapItem = { sm_id: number; liga_id: string; tipo?: "liga" | "copa"; nome?: string };

// Estados da Sportmonks (developer_name) → status do Aleball
function mapState(dev: string | undefined): string {
  const s = (dev ?? "").toUpperCase();
  if (["FT", "AET", "FT_PEN", "AWARDED", "WO"].includes(s)) return "finished";
  if (["NS", "TBA"].includes(s)) return "scheduled";
  if (["POSTPONED", "POSTP", "DELAYED", "SUSPENDED", "INTERRUPTED"].includes(s)) return "postponed";
  if (["CANCELLED", "CANCL", "ABANDONED", "DELETED"].includes(s)) return "cancelled";
  if (s.startsWith("INPLAY") || ["HT", "BREAK", "EXTRA_TIME_BREAK", "PEN_BREAK", "LIVE"].includes(s)) return "live";
  return "scheduled";
}

// "YYYY-MM-DD HH:MM:SS" (UTC) → data e hora de Brasília
function brDateTime(startingAt: string) {
  const utc = startingAt.includes("T") ? startingAt : startingAt.replace(" ", "T") + "Z";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(utc));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { data: `${get("year")}-${get("month")}-${get("day")}`, hora: `${hour}:${get("minute")}:00` };
}

function addDays(d: string, n: number) {
  const x = new Date(d + "T12:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

async function sm(path: string, token: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: token, Accept: "application/json" } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Sportmonks ${r.status} ${path}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

async function smAll(path: string, token: string, maxPages = 40) {
  const out: any[] = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= maxPages; page++) {
    const j = await sm(`${path}${sep}per_page=50&page=${page}`, token);
    const data = Array.isArray(j.data) ? j.data : j.data ? [j.data] : [];
    out.push(...data);
    if (!j.pagination?.has_more) break;
  }
  return out;
}

function goals(fx: any, side: "home" | "away"): number | null {
  const scores = (fx.scores ?? []) as any[];
  const cur = scores.find((s) => s.description === "CURRENT" && s.score?.participant === side);
  return typeof cur?.score?.goals === "number" ? cur.score.goals : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const token = Deno.env.get("SPORTMONKS_API_TOKEN");
    if (!token) return json({ ok: false, error: "SPORTMONKS_API_TOKEN não configurado" }, 500);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? "sync";

    // ---------- Listar campeonatos da assinatura ----------
    if (mode === "leagues") {
      const leagues = await smAll("/leagues?include=country;currentSeason", token);
      const { data: ligas } = await supabase.from("ligas").select("id, nome, slug, pais");
      const norm = (s: string) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const out = leagues.map((l: any) => {
        const country = l.country?.name ?? null;
        const sugestao = (ligas ?? []).filter((x: any) =>
          norm(x.nome).includes(norm(l.name)) && (!country || !x.pais || norm(x.pais) === norm(country))
        ).slice(0, 3).map((x: any) => ({ id: x.id, nome: x.nome, slug: x.slug }));
        return { sm_id: l.id, nome: l.name, pais: country, tipo: l.type, sub_tipo: l.sub_type, temporada_atual: l.currentseason?.name ?? null, sugestao };
      });
      return json({ ok: true, total: out.length, leagues: out });
    }

    // ---------- Sincronizar placares ----------
    const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "sportmonks_leagues").maybeSingle();
    const map: MapItem[] = Array.isArray(setting?.value) ? setting!.value : [];
    if (map.length === 0) return json({ ok: false, error: "app_settings.sportmonks_leagues vazio — rode o modo 'leagues' e cadastre o mapeamento" }, 400);
    const bySm = new Map(map.map((m) => [Number(m.sm_id), m]));

    const today = new Date().toISOString().slice(0, 10);
    const from: string = body.from ?? addDays(today, -7);
    const to: string = body.to ?? addDays(today, 14);

    // Quebra em janelas de até 100 dias
    const windows: [string, string][] = [];
    for (let a = from; a <= to; a = addDays(a, 100)) {
      const b = addDays(a, 99) < to ? addDays(a, 99) : to;
      windows.push([a, b]);
    }

    const ids = [...bySm.keys()].join(",");
    const fixtures: any[] = [];
    for (const [a, b] of windows) {
      fixtures.push(...await smAll(`/fixtures/between/${a}/${b}?filters=fixtureLeagues:${ids}&include=participants;scores;state`, token));
    }

    const teamCache = new Map<string, string | null>();
    const findTeam = async (name: string) => {
      if (teamCache.has(name)) return teamCache.get(name)!;
      const { data } = await supabase.rpc("find_team_by_name", { p_nome: name });
      const id = (data as string | null) ?? null;
      teamCache.set(name, id);
      return id;
    };

    const counts: Record<string, number> = {};
    const bump = (k: string) => (counts[k] = (counts[k] ?? 0) + 1);
    const naoEncontrados = new Set<string>();

    for (const fx of fixtures) {
      const cfg = bySm.get(Number(fx.league_id));
      if (!cfg) { bump("liga_nao_mapeada"); continue; }
      const parts = (fx.participants ?? []) as any[];
      const home = parts.find((p) => p.meta?.location === "home");
      const away = parts.find((p) => p.meta?.location === "away");
      if (!home || !away || !fx.starting_at) { bump("sem_times"); continue; }

      const h = await findTeam(home.name);
      const aw = await findTeam(away.name);
      if (!h || !aw) {
        if (!h) naoEncontrados.add(home.name);
        if (!aw) naoEncontrados.add(away.name);
        bump("time_nao_encontrado");
        continue;
      }

      const { data: dt, hora } = brDateTime(fx.starting_at);
      const status = mapState(fx.state?.developer_name ?? fx.state?.state);
      const temPlacar = status === "finished" || status === "live";
      const gc = temPlacar ? goals(fx, "home") : null;
      const gf = temPlacar ? goals(fx, "away") : null;

      // 1) mesmo par, até 4 dias de distância
      let { data: cand } = await supabase.from("partidas")
        .select("id, data, hora, status, gols_casa, gols_fora")
        .eq("liga_id", cfg.liga_id).eq("time_casa_id", h).eq("time_fora_id", aw)
        .gte("data", addDays(dt, -4)).lte("data", addDays(dt, 4))
        .limit(5);
      // 2) pontos corridos: mesmo par no mesmo ano
      if ((!cand || cand.length === 0) && (cfg.tipo ?? "liga") === "liga") {
        const y = dt.slice(0, 4);
        ({ data: cand } = await supabase.from("partidas")
          .select("id, data, hora, status, gols_casa, gols_fora")
          .eq("liga_id", cfg.liga_id).eq("time_casa_id", h).eq("time_fora_id", aw)
          .gte("data", `${y}-01-01`).lte("data", `${y}-12-31`)
          .is("gols_casa", null)
          .limit(5));
      }
      const dist = (d: string) => Math.abs(new Date(d).getTime() - new Date(dt).getTime());
      const match = (cand ?? []).sort((x: any, y: any) => dist(x.data) - dist(y.data))[0];

      if (!match) {
        const { error } = await supabase.from("partidas").insert({
          liga_id: cfg.liga_id, time_casa_id: h, time_fora_id: aw, data: dt, hora,
          status, gols_casa: gc, gols_fora: gf, api_source: "sportmonks",
        });
        if (error) { bump("erro"); console.error("insert", fx.id, error.message); } else bump("criada");
        continue;
      }

      if (match.gols_casa != null && match.status === "finished" && status !== "finished" && status !== "live") {
        bump("ignorado_encerrado");
        continue;
      }
      const novo = {
        data: dt,
        hora,
        status,
        gols_casa: gc ?? match.gols_casa,
        gols_fora: gf ?? match.gols_fora,
      };
      const mudou = match.data !== novo.data || String(match.hora ?? "") !== novo.hora || match.status !== novo.status ||
        match.gols_casa !== novo.gols_casa || match.gols_fora !== novo.gols_fora;
      if (!mudou) { bump("sem_mudanca"); continue; }
      const { error } = await supabase.from("partidas").update({ ...novo, updated_at: new Date().toISOString() }).eq("id", match.id);
      if (error) { bump("erro"); console.error("update", fx.id, error.message); } else bump("atualizada");
    }

    const resumo = { from, to, recebidas: fixtures.length, ...counts, nao_encontrados: [...naoEncontrados].slice(0, 200) };
    await supabase.from("sync_logs").insert({
      entity_type: "sportmonks",
      status: counts.erro ? "partial" : "completed",
      items_processed: fixtures.length,
      items_created: counts.criada ?? 0,
      items_failed: (counts.erro ?? 0) + (counts.time_nao_encontrado ?? 0),
      details: resumo,
    });
    return json({ ok: true, ...resumo });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
