// Generates SVG-based article cover cards (zero AI cost).
// Renders SVG → PNG via @resvg/resvg-js and uploads to news-thumbnails bucket.
// Body: { article_ids?: string[], limit?: number, mode?: 'preview'|'execute' }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";

let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const res = await fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm");
      const buf = await res.arrayBuffer();
      await initWasm(buf);
    })();
  }
  await wasmReady;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const W = 1200;
const H = 630;

function escapeXml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fitText(text: string, maxChars: number): string {
  const t = (text || "").trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars - 1) + "…";
}

function pickColor(c: any, fallback: string): string {
  const v = c?.primary || c?.principal || c?.primaria;
  if (typeof v === "string" && /^#?[0-9a-f]{3,8}$/i.test(v)) {
    return v.startsWith("#") ? v : `#${v}`;
  }
  return fallback;
}

function buildSvg(args: {
  timeCasa: string;
  timeFora: string;
  corCasa: string;
  corFora: string;
  liga: string;
  data: string;
  ligaLogo?: string | null;
}): string {
  const { timeCasa, timeFora, corCasa, corFora, liga, data, ligaLogo } = args;
  const tc = escapeXml(fitText(timeCasa.toUpperCase(), 22));
  const tf = escapeXml(fitText(timeFora.toUpperCase(), 22));
  const lg = escapeXml(fitText(liga, 40));
  const dt = escapeXml(data);

  const logoBlock = ligaLogo
    ? `<image href="${escapeXml(ligaLogo)}" x="${W - 140}" y="${H - 140}" width="100" height="100" preserveAspectRatio="xMidYMid meet" opacity="0.95"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${corCasa}"/>
      <stop offset="50%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="${corFora}"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#overlay)"/>

  <!-- Top bar -->
  <text x="60" y="80" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="700" fill="#22D3EE" letter-spacing="2">${lg}</text>
  <text x="60" y="115" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#E2E8F0" opacity="0.85">${dt}</text>

  <!-- Center matchup -->
  <text x="${W/2}" y="${H/2 - 30}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="68" font-weight="900" fill="#FFFFFF">${tc}</text>
  <text x="${W/2}" y="${H/2 + 40}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="42" font-weight="700" fill="#22D3EE" letter-spacing="8">VS</text>
  <text x="${W/2}" y="${H/2 + 110}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="68" font-weight="900" fill="#FFFFFF">${tf}</text>

  <!-- Footer brand -->
  <text x="60" y="${H - 50}" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF" opacity="0.9">statball.com.br</text>
  <text x="60" y="${H - 25}" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#94A3B8">análise estatística de futebol</text>

  ${logoBlock}
</svg>`;
}

function slugify(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildAlt(args: { timeCasa: string; timeFora: string; liga: string; data: string }): string {
  const parts = [`Capa do artigo: ${args.timeCasa} vs ${args.timeFora}`];
  if (args.liga) parts.push(`pela ${args.liga}`);
  if (args.data) parts.push(`em ${args.data}`);
  parts.push("— análise estatística Statball");
  return parts.join(" ");
}

function fmtDateBR(dStr: string | null): string {
  if (!dStr) return "";
  try {
    const d = new Date(dStr + "T12:00:00Z");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  } catch { return dStr; }
}

async function renderPng(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const r = new Resvg(svg, { fitTo: { mode: "width", value: W } });
  const png = r.render();
  return png.asPng();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, KEY);

    let limit = 50;
    let articleIds: string[] | null = null;
    let mode: "preview" | "execute" = "execute";
    try {
      const body = await req.json();
      limit = Math.max(1, Math.min(body?.limit || 50, 500));
      articleIds = Array.isArray(body?.article_ids) ? body.article_ids : null;
      mode = body?.mode === "preview" ? "preview" : "execute";
    } catch {}

    let q = supabase
      .from("noticias")
      .select("id, titulo, slug, partida_id, image_source, imagem_url")
      .eq("publicada", true);

    if (articleIds && articleIds.length) {
      q = q.in("id", articleIds);
    } else {
      // Pendentes: nunca regenerados OU sem imagem OU svg/unsplash
      q = q.or("image_regenerated_at.is.null,imagem_url.is.null,imagem_url.like.%unsplash%");
    }

    const { data: articles, error } = await q.order("data_publicacao", { ascending: false }).limit(limit);
    if (error) throw error;

    const { count: pending } = await supabase
      .from("noticias")
      .select("*", { count: "exact", head: true })
      .eq("publicada", true)
      .or("image_regenerated_at.is.null,imagem_url.is.null,imagem_url.like.%unsplash%");

    if (mode === "preview") {
      return new Response(JSON.stringify({ success: true, mode, pending: pending || 0, count: articles?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!articles?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0, fixed: 0, pending: 0, results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pré-carrega partidas
    const partidaIds = articles.map(a => a.partida_id).filter(Boolean) as string[];
    const matchInfo = new Map<string, any>();
    if (partidaIds.length) {
      const { data: partidas } = await supabase
        .from("partidas")
        .select("id, data, time_casa:time_casa_id(nome, cores), time_fora:time_fora_id(nome, cores), liga:liga_id(nome, logo_url)")
        .in("id", partidaIds);
      (partidas || []).forEach((p: any) => matchInfo.set(p.id, p));
    }

    const results: any[] = [];
    let fixed = 0;

    for (const art of articles) {
      try {
        const m = art.partida_id ? matchInfo.get(art.partida_id) : null;
        const corCasa = pickColor(m?.time_casa?.cores, "#1e3a8a");
        const corFora = pickColor(m?.time_fora?.cores, "#7f1d1d");
        const timeCasa = m?.time_casa?.nome || "STATBALL";
        const timeFora = m?.time_fora?.nome || "ANÁLISE";
        const liga = m?.liga?.nome || "Futebol";
        const dataStr = fmtDateBR(m?.data) || "";
        const ligaLogo = m?.liga?.logo_url || null;

        const svg = buildSvg({ timeCasa, timeFora, corCasa, corFora, liga, data: dataStr, ligaLogo });
        const png = await renderPng(svg);

        const fileName = `svg-${art.id}.png`;
        const { error: upErr } = await supabase.storage
          .from("news-thumbnails")
          .upload(fileName, png, { contentType: "image/png", upsert: true });
        if (upErr) throw new Error(`upload: ${upErr.message}`);

        const { data: urlData } = supabase.storage.from("news-thumbnails").getPublicUrl(fileName);
        const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

        const { error: updErr } = await supabase
          .from("noticias")
          .update({
            imagem_url: publicUrl,
            image_source: "svg",
            image_regenerated_at: new Date().toISOString(),
          })
          .eq("id", art.id);
        if (updErr) throw new Error(`update: ${updErr.message}`);

        fixed++;
        results.push({ id: art.id, titulo: art.titulo, success: true, imagem_url: publicUrl });
      } catch (err) {
        results.push({ id: art.id, titulo: art.titulo, success: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: articles.length,
        fixed,
        errors: articles.length - fixed,
        pending: Math.max((pending || 0) - fixed, 0),
        results: results.slice(0, 20), // só primeiros 20 pro response
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-article-card-svg error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
