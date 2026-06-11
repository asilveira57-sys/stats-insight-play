// Background batch: for every WC2026 match in a given stage, ensure a rich pre_match
// AI analysis exists (Statball editorial standard), generate a UNIQUE OG image (1536x1024)
// via OpenAI Images, upload to storage and publish a noticia linked to the match.
// Resilient: retries, idempotent, resumable. Use force=true to fully regenerate text+image.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const STAGE_PT: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "Segunda Fase",
  round_of_16: "Oitavas de Final",
  quarter_final: "Quartas de Final",
  semi_final: "Semifinal",
  third_place: "Disputa do 3º Lugar",
  final: "Final",
};

const HOST_CITIES = [
  "Kansas City", "Dallas", "Miami", "Toronto", "Vancouver",
  "Monterrey", "Guadalajara", "Cidade do México", "Atlanta",
  "Seattle", "Los Angeles", "Houston", "Philadelphia", "Boston",
  "New York/New Jersey",
];
const LIGHTING = ["entardecer dourado", "noite com refletores", "céu crepuscular roxo", "amanhecer azulado", "luz dramática lateral"];
const ANGLES = ["vista aérea baixa", "ângulo lateral próximo ao gramado", "plano contra-plongée atrás do gol", "panorâmica do círculo central", "diagonal do túnel dos jogadores"];

function pickIdx(seed: string, salt: string, len: number) {
  const s = `${seed}|${salt}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, label = ""): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      console.error(`[retry ${i}/${attempts}] ${label}:`, e instanceof Error ? e.message : e);
      await new Promise(r => setTimeout(r, 1500 * i));
    }
  }
  throw lastErr;
}

async function invokePreview(matchId: string, force: boolean) {
  const res = await fetch(`${PROJECT_URL}/functions/v1/wc2026-generate-match-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    body: JSON.stringify({ match_id: matchId, force }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`preview ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

function extractMeta(content: string): { meta: any; body: string } {
  const m = content.match(/^<!--STATBALL_META:(.+?)-->\n?/);
  if (!m) return { meta: {}, body: content };
  try { return { meta: JSON.parse(m[1]), body: content.slice(m[0].length) }; }
  catch { return { meta: {}, body: content }; }
}

async function generateImage(supabase: any, match: any, meta: any, slug: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  const homeName = match.home?.name ?? "Seleção A";
  const awayName = match.away?.name ?? "Seleção B";
  const city = meta.host_city ?? HOST_CITIES[pickIdx(match.id, "city", HOST_CITIES.length)];
  const lighting = LIGHTING[pickIdx(match.id, "light", LIGHTING.length)];
  const angle = ANGLES[pickIdx(match.id, "angle", ANGLES.length)];
  const group = match.group_letter ? `Grupo ${match.group_letter}` : (STAGE_PT[match.stage] ?? match.stage);
  const dateLabel = match.match_date
    ? new Date(match.match_date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" })
    : "";

  const prompt = `Premium sports editorial cover, 1536x1024, ESPN FC / UEFA Champions League aesthetic for FIFA World Cup 2026.
Background: stylized stadium of ${city}, ${lighting}, ${angle}, lit grass with depth and subtle reflections, cinematic atmosphere, no spectators' faces.
Two large modern geometric color blocks on left and right (flag colors of ${homeName} and ${awayName} respectively) — abstract shapes only, NO official team crests, NO badges, NO FIFA logos, NO real flag images.
Strong centered typography overlay reading exactly:
"${homeName.toUpperCase()}"
"VS"
"${awayName.toUpperCase()}"
Smaller line below: "${group} · ${dateLabel} · ${match.stadium ?? city}".
Bold sans-serif type, high contrast, dramatic premium look. ${meta.image_concept ?? ""}`;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: prompt.slice(0, 3800),
      size: "1536x1024",
      quality: "medium",
      n: 1,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`image ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image data");

  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const path = `wc2026/${slug}.png`;
  const { error: upErr } = await supabase.storage.from("news-thumbnails").upload(path, bytes, {
    contentType: "image/png", upsert: true,
  });
  if (upErr) throw new Error(`upload: ${upErr.message}`);
  const { data: pub } = supabase.storage.from("news-thumbnails").getPublicUrl(path);
  return pub?.publicUrl ?? null;
}

async function publishOne(supabase: any, match: any, force: boolean) {
  // 1) Ensure pre_match analysis (rich format). With force we regenerate it.
  if (force) {
    await withRetry(() => invokePreview(match.id, true), 3, `preview ${match.id}`);
  }
  let { data: analysis } = await supabase.from("world_cup_2026_ai_analyses")
    .select("*").eq("match_id", match.id).eq("analysis_type", "pre_match").maybeSingle();
  if (!analysis || !/Prognóstico Statball/i.test(analysis.content ?? "")) {
    await withRetry(() => invokePreview(match.id, true), 3, `preview ${match.id}`);
    ({ data: analysis } = await supabase.from("world_cup_2026_ai_analyses")
      .select("*").eq("match_id", match.id).eq("analysis_type", "pre_match").maybeSingle());
  }
  if (!analysis) throw new Error("analysis missing after generation");

  const { meta, body } = extractMeta(analysis.content ?? "");
  const stageLabel = STAGE_PT[match.stage] ?? match.stage;
  const groupSuffix = match.group_letter ? ` · Grupo ${match.group_letter}` : "";
  const dateStr = match.match_date
    ? new Date(match.match_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" })
    : "";

  const homeName = match.home?.name ?? "Seleção A";
  const awayName = match.away?.name ?? "Seleção B";
  const seoTitle = (meta.seo_title || `Copa 2026: ${homeName} x ${awayName}${match.group_letter ? ` (Grupo ${match.group_letter})` : ""}`).slice(0, 60);
  const resumo = (meta.meta_description || `${homeName} encara ${awayName} pela Copa do Mundo 2026. Análise pré-jogo, escalações, prognóstico Statball e o que está em jogo na ${stageLabel}.`).slice(0, 160);

  const slug = `copa-2026-${slugify(match.home?.slug || homeName)}-x-${slugify(match.away?.slug || awayName)}-${match.stage}${match.group_letter ? `-grupo-${match.group_letter.toLowerCase()}` : ""}`;

  const intro = `*${stageLabel}${groupSuffix} · ${dateStr} (horário de Brasília)${match.stadium ? ` · ${match.stadium}${match.city ? ` — ${match.city}` : ""}` : ""}*\n\n`;
  const cta = `\n\n---\n[Ver detalhes da partida, palpite do usuário e escalações](/copa-2026/jogos/${match.id})`;
  const texto = intro + body + cta;

  // 2) Generate unique image (force => always regen; otherwise only if missing)
  let imagem_url: string | undefined;
  let imagem_alt: string | undefined;
  const { data: existingNoticia } = await supabase.from("noticias").select("id, imagem_url").eq("slug", slug).maybeSingle();
  const needsImage = force || !existingNoticia?.imagem_url;
  if (needsImage) {
    try {
      const url = await withRetry(() => generateImage(supabase, match, meta, slug), 2, `img ${slug}`);
      if (url) {
        imagem_url = url;
        imagem_alt = `${homeName} x ${awayName} — Copa do Mundo 2026${match.group_letter ? ` (Grupo ${match.group_letter})` : ""}`;
      }
    } catch (e) {
      console.error("image generation failed", slug, e instanceof Error ? e.message : e);
    }
  }

  // 3) Upsert noticia
  const payload: any = {
    titulo: seoTitle,
    resumo,
    texto,
    slug,
    publicada: true,
    data_publicacao: new Date().toISOString(),
    world_cup_2026_match_id: match.id,
    tipo: "wc2026_pre_match",
    image_source: imagem_url ? "openai" : (existingNoticia ? undefined : "svg"),
  };
  if (imagem_url) { payload.imagem_url = imagem_url; payload.imagem_alt = imagem_alt; payload.image_regenerated_at = new Date().toISOString(); }

  if (existingNoticia?.id) {
    const { error } = await supabase.from("noticias").update(payload).eq("id", existingNoticia.id);
    if (error) throw new Error(`noticia update: ${error.message}`);
    return { updated: true, slug, image: !!imagem_url };
  } else {
    const { error } = await supabase.from("noticias").insert(payload);
    if (error) throw new Error(`noticia insert: ${error.message}`);
    return { created: true, slug, image: !!imagem_url };
  }
}

async function runBatch(stage: string, force: boolean, logId: string) {
  const supabase = createClient(PROJECT_URL, SERVICE_KEY);

  const { data: matches } = await supabase
    .from("world_cup_2026_matches")
    .select(`id, stage, group_letter, match_date, stadium, city,
      home:home_team_id(id,name,slug),
      away:away_team_id(id,name,slug)`)
    .eq("stage", stage)
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .order("match_date");

  const list = matches ?? [];
  let ok = 0, fail = 0;
  const errors: string[] = [];

  const tick = async (extra?: string) => {
    await supabase.from("world_cup_2026_sync_logs").update({
      records_processed: ok,
      error_message: `total=${list.length} ok=${ok} fail=${fail}${extra ? ` · ${extra}` : ""}`,
    }).eq("id", logId);
  };

  for (const m of list) {
    const label = `${(m as any).home?.name} x ${(m as any).away?.name}`;
    try {
      await withRetry(() => publishOne(supabase, m, force), 2, label);
      ok++;
      await tick(`último: ${label}`);
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${label}: ${msg}`);
      console.error("publish fail", label, msg);
      await tick(`falha em ${label}`);
    }
  }

  await supabase.from("world_cup_2026_sync_logs").update({
    status: fail === 0 ? "success" : "partial",
    finished_at: new Date().toISOString(),
    records_processed: ok,
    error_message: `total=${list.length} ok=${ok} fail=${fail}${errors.length ? ` · ${errors.slice(0,3).join(" | ")}` : ""}`,
  }).eq("id", logId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(PROJECT_URL, SERVICE_KEY);
    const { stage = "group", force = false } = await req.json().catch(() => ({}));

    const { data: log } = await supabase.from("world_cup_2026_sync_logs").insert({
      sync_type: "news_publish_batch",
      provider: "openai",
      status: "running",
      started_at: new Date().toISOString(),
    }).select("id").single();

    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(runBatch(stage, !!force, log!.id));

    return new Response(JSON.stringify({ success: true, log_id: log!.id, message: `Publicando notícias da fase ${stage} em background${force ? " (force: regenera texto+imagem)" : ""}.` }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
