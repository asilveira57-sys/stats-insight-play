// Gera crônica pós-jogo (Statball) para uma partida da Copa 2026.
// Usa OpenAI (gpt-4o-mini + DALL·E 3) via OPENAI_API_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion, getTextContent, generateImage } from "../_shared/lovableAI.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://v3.football.api-sports.io";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 110);
}

async function apiGet(path: string, apiKey: string) {
  const r = await fetch(`${API_BASE}${path}`, {
    headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "v3.football.api-sports.io" },
  });
  if (!r.ok) return [];
  return (await r.json()).response ?? [];
}

const HOST_CITIES = [
  "Mexico City Estadio Azteca", "Guadalajara Estadio Akron", "Monterrey Estadio BBVA",
  "Atlanta Mercedes-Benz Stadium", "Boston Gillette Stadium", "Dallas AT&T Stadium",
  "Houston NRG Stadium", "Kansas City Arrowhead", "Los Angeles SoFi Stadium",
  "Miami Hard Rock Stadium", "New York MetLife Stadium", "Philadelphia Lincoln Field",
  "San Francisco Levi's Stadium", "Seattle Lumen Field", "Toronto BMO Field",
];
const ANGLES = ["aerial wide shot", "low angle behind the goal", "press tribune view", "diagonal mid-pitch", "corner flag perspective"];
const LIGHTS = ["golden hour", "stadium floodlights at night", "blue twilight", "overcast cinematic", "dramatic sunset"];

function pickByHash(arr: string[], seed: string) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
  return arr[Math.abs(h) % arr.length];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { match_id, force = false } = body;
  if (!match_id) {
    return new Response(JSON.stringify({ error: "match_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!openaiKey) throw new Error("OPENAI_API_KEY missing");

    const { data: match } = await supabase
      .from("world_cup_2026_matches")
      .select("*, home:home_team_id(name,slug,flag_url), away:away_team_id(name,slug,flag_url)")
      .eq("id", match_id).maybeSingle();
    if (!match) throw new Error("match not found");
    if (match.status !== "finished") throw new Error(`match not finished (status=${match.status})`);

    if (!force) {
      const { data: existing } = await supabase
        .from("world_cup_2026_ai_analyses")
        .select("id").eq("match_id", match_id).eq("analysis_type", "postgame").maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "exists" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let stats: any[] = [];
    if (apiKey && match.external_fixture_id) {
      stats = await apiGet(`/fixtures/statistics?fixture=${match.external_fixture_id}`, apiKey);
    }

    const { data: events } = await supabase.from("world_cup_2026_match_events")
      .select("*").eq("match_id", match_id).order("minute");

    const homeName = match.home?.name ?? "Casa";
    const awayName = match.away?.name ?? "Visitante";
    const placar = `${match.home_score ?? 0} x ${match.away_score ?? 0}`;

    const homeStats = stats.find((s) => s.team?.name === homeName)?.statistics ?? [];
    const awayStats = stats.find((s) => s.team?.name === awayName)?.statistics ?? [];
    const statsLines = homeStats.map((s: any, i: number) => {
      const a = awayStats[i];
      return `${s.type}: ${homeName} ${s.value ?? "-"} x ${awayName} ${a?.value ?? "-"}`;
    }).join("\n");

    const eventsTimeline = (events ?? []).map((e: any) =>
      `${e.minute}' ${e.event_type.toUpperCase()} — ${e.description}`
    ).join("\n");

    const prompt = `Você é redator esportivo sênior do Statball. Escreva uma CRÔNICA PÓS-JOGO da partida da Copa do Mundo 2026.

Dados oficiais:
- Confronto: ${homeName} ${placar} ${awayName}
- Fase: ${match.stage}${match.group_letter ? ` Grupo ${match.group_letter}` : ""}
- Estádio: ${match.stadium ?? "-"} (${match.city ?? "-"})
- Data: ${match.match_date}
${match.attendance ? `- Público: ${match.attendance.toLocaleString("pt-BR")}` : ""}

Eventos:
${eventsTimeline || "(sem eventos registrados)"}

Estatísticas:
${statsLines || "(sem estatísticas)"}

ENTREGUE UM ÚNICO JSON válido (sem markdown wrapper), com este formato:
{
  "title": "Título jornalístico chamativo (60 chars)",
  "meta_description": "Resumo SEO entre 140 e 160 chars",
  "html": "HTML completo da crônica entre 400 e 800 palavras, usando <h2>, <h3>, <p>, <ul>, <table>. Inclua: introdução (lead jornalístico), como o jogo se desenvolveu, momento-chave, análise tática, estatísticas em tabela, destaque individual, perspectiva da próxima rodada. Tom: jornalista esportivo profissional brasileiro. NUNCA invente nomes de jogadores ou minutos — use SOMENTE os dados acima."
}`;

    const aiData = await chatCompletion(openaiKey, {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2500,
    });
    let raw = getTextContent(aiData) || "{}";
    // Strip markdown fences if present
    raw = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(raw);

    await supabase.from("world_cup_2026_ai_analyses").upsert({
      match_id, analysis_type: "postgame",
      title: parsed.title, content: parsed.html,
      model_used: "openai/gpt-4o-mini",
      has_enough_data: true, generated_at: new Date().toISOString(),
    }, { onConflict: "match_id,analysis_type" });

    // Imagem OG variada via DALL·E 3
    const seed = `${match.id}-${match.home_score}-${match.away_score}`;
    const city = pickByHash(HOST_CITIES, seed);
    const angle = pickByHash(ANGLES, seed + "a");
    const light = pickByHash(LIGHTS, seed + "l");
    const imgPrompt = `Editorial sports photography of an ASSOCIATION FOOTBALL (SOCCER) match — FIFA World Cup atmosphere — inside a packed soccer stadium in ${city}. Show clearly: green grass pitch with painted white lines (penalty box / center circle), a round black-and-white soccer ball on the grass, a rectangular soccer goal with a white net (NO american football uprights). ${angle}. Lighting: ${light}. Cinematic depth of field, vivid colors, dramatic crowd in the background. STRICTLY EXCLUDE: american football, NFL, helmets, shoulder pads, oval/pointed ball, field goal posts with uprights, rugby, baseball, basketball, cricket, hockey. NO text, NO logos, NO recognizable faces. Wide 16:9 cover image for a soccer news article.`;

    let imageUrl: string | null = null;
    try {
      const b64 = await generateImage(openaiKey, imgPrompt);
      if (b64) {
        const imgBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const path = `wc2026/postgame-${match.id}.png`;
        const up = await supabase.storage.from("news-thumbnails").upload(path, imgBytes, {
          contentType: "image/png", upsert: true,
        });
        if (!up.error) {
          const { data: pub } = supabase.storage.from("news-thumbnails").getPublicUrl(path);
          imageUrl = pub.publicUrl;
        }
      }
    } catch (e) {
      console.error("image gen failed (continuing without):", e);
    }

    const slug = slugify(`copa-2026-pos-jogo-${match.home?.slug}-${match.home_score}-${match.away_score}-${match.away?.slug}`);
    const { error: upErr } = await supabase.from("noticias").upsert({
      titulo: parsed.title,
      slug,
      resumo: parsed.meta_description,
      texto: parsed.html,
      imagem_url: imageUrl,
      tipo: "noticia",
      publicada: true,
      data_publicacao: new Date().toISOString(),
      world_cup_2026_match_id: match_id,
    }, { onConflict: "slug" });
    if (upErr) throw new Error(`noticias upsert: ${upErr.message}`);

    return new Response(JSON.stringify({ success: true, slug, has_image: !!imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("postgame error", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
