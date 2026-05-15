// Generates SVG-based article cover cards (zero AI cost).
// Renders SVG → PNG via @resvg/resvg-wasm with stadium background + Inter font.
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

// ---- Font cache (Inter Bold + Black via jsdelivr) ----
let fontBuffersPromise: Promise<Uint8Array[]> | null = null;
async function getFontBuffers(): Promise<Uint8Array[]> {
  if (!fontBuffersPromise) {
    fontBuffersPromise = (async () => {
      const urls = [
        "https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-Bold.ttf",
        "https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-Black.ttf",
        "https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-SemiBold.ttf",
      ];
      const bufs = await Promise.all(urls.map(async (u) => {
        const r = await fetch(u);
        if (!r.ok) throw new Error(`font fetch ${u}: ${r.status}`);
        return new Uint8Array(await r.arrayBuffer());
      }));
      return bufs;
    })();
  }
  return fontBuffersPromise;
}

// ---- Stadium image cache (8 backgrounds as base64 data URIs) ----
const STADIUM_BASE = "https://wlvwcbxegrmobefloikr.supabase.co/storage/v1/object/public/card-backgrounds";
const STADIUM_FILES = ["01.jpg","02.jpg","03.jpg","04.jpg","05.jpg","06.jpg","07.jpg","08.jpg"];
let stadiumCache: Map<string, string> = new Map();
let stadiumLoadPromise: Promise<void> | null = null;

async function ensureStadiums() {
  if (!stadiumLoadPromise) {
    stadiumLoadPromise = (async () => {
      await Promise.all(STADIUM_FILES.map(async (name) => {
        const r = await fetch(`${STADIUM_BASE}/${name}`);
        if (!r.ok) throw new Error(`stadium ${name}: ${r.status}`);
        const buf = new Uint8Array(await r.arrayBuffer());
        // base64 encode
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        const b64 = btoa(bin);
        stadiumCache.set(name, `data:image/jpeg;base64,${b64}`);
      }));
    })();
  }
  await stadiumLoadPromise;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickStadium(seed: string): string {
  const idx = hashString(seed) % STADIUM_FILES.length;
  return stadiumCache.get(STADIUM_FILES[idx]) || "";
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

function detectTipo(titulo: string): "PRÉVIA" | "PÓS-JOGO" | "ANÁLISE" {
  const t = (titulo || "").toLowerCase();
  if (/\b(pr[ée]via|preview|antes|antevis[aã]o)\b/.test(t)) return "PRÉVIA";
  if (/\b(p[óo]s[\s-]?jogo|resultado|encerrad|terminou|venceu|perdeu|empat|placar|goleada)\b/.test(t)) return "PÓS-JOGO";
  return "ANÁLISE";
}

function buildSvg(args: {
  timeCasa: string;
  timeFora: string;
  corCasa: string;
  corFora: string;
  liga: string;
  data: string;
  ligaLogo?: string | null;
  tipo: string;
  stadium: string;
}): string {
  const { timeCasa, timeFora, corCasa, corFora, liga, data, ligaLogo, tipo, stadium } = args;
  const tc = escapeXml(fitText(timeCasa.toUpperCase(), 22));
  const tf = escapeXml(fitText(timeFora.toUpperCase(), 22));
  const lg = escapeXml(fitText(liga, 40));
  const dt = escapeXml(data);
  const tp = escapeXml(tipo.toUpperCase());

  const badgeW = Math.max(120, tp.length * 16 + 40);
  const badgeBlock = `
  <g>
    <rect x="${W - badgeW - 60}" y="55" width="${badgeW}" height="48" rx="24" fill="#22D3EE"/>
    <text x="${W - badgeW/2 - 60}" y="88" text-anchor="middle" font-family="Inter" font-size="22" font-weight="900" fill="#0F172A" letter-spacing="2">${tp}</text>
  </g>`;

  const logoBlock = ligaLogo
    ? `<image href="${escapeXml(ligaLogo)}" x="${W - 140}" y="${H - 140}" width="100" height="100" preserveAspectRatio="xMidYMid meet" opacity="0.95"/>`
    : "";

  const stadiumBlock = stadium
    ? `<image href="${stadium}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="teamOverlay" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${corCasa}" stop-opacity="0.75"/>
      <stop offset="50%" stop-color="#0F172A" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${corFora}" stop-opacity="0.75"/>
    </linearGradient>
    <linearGradient id="darkOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#000000" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.65"/>
    </linearGradient>
  </defs>

  ${stadiumBlock}
  <rect width="${W}" height="${H}" fill="url(#teamOverlay)"/>
  <rect width="${W}" height="${H}" fill="url(#darkOverlay)"/>

  <!-- Top bar -->
  <text x="60" y="80" font-family="Inter" font-size="28" font-weight="700" fill="#22D3EE" letter-spacing="2">${lg}</text>
  <text x="60" y="115" font-family="Inter" font-size="22" font-weight="600" fill="#E2E8F0" opacity="0.9">${dt}</text>

  <!-- Center matchup with subtle text shadow via duplicate dark text -->
  <text x="${W/2}" y="${H/2 - 27}" text-anchor="middle" font-family="Inter" font-size="68" font-weight="900" fill="#000000" opacity="0.45">${tc}</text>
  <text x="${W/2}" y="${H/2 - 30}" text-anchor="middle" font-family="Inter" font-size="68" font-weight="900" fill="#FFFFFF">${tc}</text>

  <text x="${W/2}" y="${H/2 + 43}" text-anchor="middle" font-family="Inter" font-size="42" font-weight="700" fill="#000000" opacity="0.45" letter-spacing="8">VS</text>
  <text x="${W/2}" y="${H/2 + 40}" text-anchor="middle" font-family="Inter" font-size="42" font-weight="700" fill="#22D3EE" letter-spacing="8">VS</text>

  <text x="${W/2}" y="${H/2 + 113}" text-anchor="middle" font-family="Inter" font-size="68" font-weight="900" fill="#000000" opacity="0.45">${tf}</text>
  <text x="${W/2}" y="${H/2 + 110}" text-anchor="middle" font-family="Inter" font-size="68" font-weight="900" fill="#FFFFFF">${tf}</text>

  <!-- Footer brand -->
  <text x="60" y="${H - 50}" font-family="Inter" font-size="24" font-weight="700" fill="#FFFFFF" opacity="0.95">statball.com.br</text>
  <text x="60" y="${H - 25}" font-family="Inter" font-size="16" font-weight="600" fill="#94A3B8">análise estatística de futebol</text>

  ${badgeBlock}
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

function buildAlt(args: { timeCasa: string; timeFora: string; liga: string; data: string; tipo: string }): string {
  const tipoLabel = args.tipo === "PRÉVIA" ? "Prévia" : args.tipo === "PÓS-JOGO" ? "Pós-jogo" : "Análise";
  const parts = [`${tipoLabel}: ${args.timeCasa} vs ${args.timeFora}`];
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
  const fontBuffers = await getFontBuffers();
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: {
      fontBuffers,
      defaultFontFamily: "Inter",
      loadSystemFonts: false,
    },
  });
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

    // Pré-carrega assets pesados (font + estádios) uma única vez por cold-start
    await Promise.all([ensureWasm(), getFontBuffers(), ensureStadiums()]);

    let q = supabase
      .from("noticias")
      .select("id, titulo, slug, partida_id, image_source, imagem_url")
      .eq("publicada", true);

    if (articleIds && articleIds.length) {
      q = q.in("id", articleIds);
    } else {
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
        const tipo = detectTipo(art.titulo || "");
        const stadium = pickStadium(art.partida_id || art.id);

        const svg = buildSvg({ timeCasa, timeFora, corCasa, corFora, liga, data: dataStr, ligaLogo, tipo, stadium });
        const png = await renderPng(svg);

        const tipoSlug = tipo === "PRÉVIA" ? "previa" : tipo === "PÓS-JOGO" ? "pos-jogo" : "analise";
        const baseSlug = art.slug
          ? slugify(art.slug)
          : slugify(`${timeCasa}-vs-${timeFora}-${liga}-${tipoSlug}`);
        const shortId = String(art.id).replace(/-/g, "").slice(0, 6);
        const fileName = `${baseSlug || "statball-card"}-${shortId}.png`;

        const { error: upErr } = await supabase.storage
          .from("news-thumbnails")
          .upload(fileName, png, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
        if (upErr) throw new Error(`upload: ${upErr.message}`);

        const { data: urlData } = supabase.storage.from("news-thumbnails").getPublicUrl(fileName);
        const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

        const imagemAlt = buildAlt({ timeCasa, timeFora, liga, data: dataStr, tipo });

        const { error: updErr } = await supabase
          .from("noticias")
          .update({
            imagem_url: publicUrl,
            imagem_alt: imagemAlt,
            image_source: "svg",
            image_regenerated_at: new Date().toISOString(),
          })
          .eq("id", art.id);
        if (updErr) throw new Error(`update: ${updErr.message}`);

        fixed++;
        results.push({ id: art.id, titulo: art.titulo, success: true, imagem_url: publicUrl, imagem_alt: imagemAlt });
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
        results: results.slice(0, 20),
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
