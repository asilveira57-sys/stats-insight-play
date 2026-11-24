// Dynamic sitemap generator for Aleball
// Routes:
//   /sitemap.xml                 -> sitemap index
//   /sitemap-static.xml          -> static pages
//   /sitemap-noticias-{n}.xml    -> news (paginated)
//   /sitemap-partidas-{n}.xml    -> matches (paginated)
//   /sitemap-times.xml           -> teams (profile + analises + global)
//   /sitemap-estatisticas.xml    -> league stats + team season stats + variations + rankings

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SITE = "https://www.aleball.com.br";
const PAGE_SIZE = 10000; // urls per sub-sitemap (well under 50k cap)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const xmlHeaders = {
  ...corsHeaders,
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------- helpers ----------

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: number): string {
  let s = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n`;
  if (lastmod) s += `    <lastmod>${lastmod.split("T")[0]}</lastmod>\n`;
  if (changefreq) s += `    <changefreq>${changefreq}</changefreq>\n`;
  if (priority !== undefined) s += `    <priority>${priority.toFixed(1)}</priority>\n`;
  s += `  </url>\n`;
  return s;
}

function wrapUrlset(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}</urlset>\n`;
}

function wrapIndex(entries: { loc: string; lastmod?: string }[]): string {
  let body = "";
  for (const e of entries) {
    body += `  <sitemap>\n    <loc>${escapeXml(e.loc)}</loc>\n`;
    if (e.lastmod) body += `    <lastmod>${e.lastmod.split("T")[0]}</lastmod>\n`;
    body += `  </sitemap>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}</sitemapindex>\n`;
}

// ---------- foco editorial ----------
// Só entram no sitemap páginas do futebol brasileiro principal (mesma lista de
// src/lib/seoFocus.ts). Jogos e estatísticas recentes; nada de variações rasas.
const FOCUS_LIGA_SLUGS = ["campeonato-brasileiro-serie-a", "campeonato-brasileiro-serie-b", "copa-do-brasil"];
const CHUNK = 1000; // limite de linhas por consulta do PostgREST

function sinceYear(): number {
  return new Date().getFullYear() - 1; // temporada atual + anterior
}

async function fetchAll<T>(build: (from: number, to: number) => any, max = 20000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += CHUNK) {
    const { data, error } = await build(from, from + CHUNK - 1);
    if (error) throw error;
    const rows = (data as T[]) || [];
    out.push(...rows);
    if (rows.length < CHUNK) break;
  }
  return out;
}

async function focusLigas(): Promise<{ id: string; slug: string }[]> {
  const { data } = await supabase.from("ligas").select("id, slug").in("slug", FOCUS_LIGA_SLUGS);
  return (data as { id: string; slug: string }[]) || [];
}

type FocusMatch = {
  slug: string | null;
  data: string;
  updated_at: string | null;
  gols_casa: number | null;
  gols_fora: number | null;
  liga_id: string;
  casa: { slug: string | null } | null;
  fora: { slug: string | null } | null;
};

// Jogos do foco desde o início da temporada anterior: com placar, ou nos próximos 30 dias.
async function focusMatches(): Promise<FocusMatch[]> {
  const ligas = await focusLigas();
  const ids = ligas.map((l) => l.id);
  if (ids.length === 0) return [];
  const since = `${sinceYear()}-01-01`;
  const until = new Date(Date.now() + 30 * 86400000).toISOString();
  const rows = await fetchAll<FocusMatch>((from, to) =>
    supabase
      .from("partidas")
      .select("slug, data, updated_at, gols_casa, gols_fora, liga_id, casa:times!partidas_time_casa_id_fkey(slug), fora:times!partidas_time_fora_id_fkey(slug)")
      .in("liga_id", ids)
      .gte("data", since)
      .lte("data", until)
      .order("data", { ascending: false })
      .range(from, to)
  );
  const now = Date.now();
  return rows.filter((r) => {
    const hasScore = r.gols_casa != null && r.gols_fora != null;
    const t = new Date(r.data).getTime();
    return hasScore || t >= now - 86400000;
  });
}

// ---------- builders ----------

async function buildIndex(): Promise<string> {
  const today = new Date().toISOString();
  const entries: { loc: string; lastmod?: string }[] = [
    { loc: `${SITE}/sitemap-static.xml`, lastmod: today },
    { loc: `${SITE}/sitemap-noticias-1.xml`, lastmod: today },
    { loc: `${SITE}/sitemap-partidas-1.xml`, lastmod: today },
    { loc: `${SITE}/sitemap-times.xml`, lastmod: today },
    { loc: `${SITE}/sitemap-estatisticas.xml`, lastmod: today },
  ];
  // Páginas de /pesquisa ficam fora: são geradas a partir de buscas e muitas fogem do foco.
  return wrapIndex(entries);
}

function buildStatic(): string {
  const today = new Date().toISOString().split("T")[0];
  const pages: [string, string, number][] = [
    ["/", "daily", 1.0],
    ["/brasileirao", "daily", 0.9],
    ["/brasileirao/jogos", "daily", 0.9],
    ["/brasileirao/classificacao", "daily", 0.9],
    ["/brasileirao/palpites-ia", "daily", 0.8],
    ["/brasileirao/artilharia", "weekly", 0.7],
    ["/copa-do-brasil", "daily", 0.8],
    ["/copa-do-brasil/jogos", "daily", 0.8],
    ["/copa-do-brasil/palpites-ia", "daily", 0.7],
    ["/copa-do-brasil/artilharia", "weekly", 0.6],
    ["/copa-2026", "weekly", 0.7],
    ["/noticias", "daily", 0.9],
    ["/palpites", "daily", 0.8],
    ["/resultados", "daily", 0.8],
    ["/estatisticas", "daily", 0.8],
    ["/artilheiros", "weekly", 0.6],
    ["/campeonatos", "weekly", 0.6],
    ["/times", "weekly", 0.6],
    ["/transparencia", "monthly", 0.4],
    ["/sobre", "yearly", 0.4],
    ["/contato", "yearly", 0.3],
    ["/precos", "monthly", 0.4],
    ["/termos", "yearly", 0.2],
    ["/privacidade", "yearly", 0.2],
    ["/cookies", "yearly", 0.2],
  ];
  let body = "";
  for (const [path, freq, prio] of pages) {
    body += urlEntry(`${SITE}${path}`, today, freq, prio);
  }
  return wrapUrlset(body);
}

async function buildNoticias(_page: number): Promise<string> {
  const rows = await fetchAll<{ slug: string; data_publicacao: string | null; created_at: string }>((from, to) =>
    supabase
      .from("noticias")
      .select("slug, data_publicacao, created_at")
      .eq("publicada", true)
      .not("slug", "is", null)
      .order("data_publicacao", { ascending: false })
      .range(from, to)
  , PAGE_SIZE);
  let body = "";
  for (const r of rows) {
    if (!r.slug) continue;
    body += urlEntry(`${SITE}/noticias/${r.slug}`, r.data_publicacao || r.created_at, "weekly", 0.7);
  }
  return wrapUrlset(body);
}

async function buildPartidas(page: number): Promise<string> {
  if (page > 0) return wrapUrlset("");
  const rows = await focusMatches();
  let body = "";
  for (const r of rows) {
    if (!r.slug) continue;
    body += urlEntry(`${SITE}/partida/${r.slug}`, r.updated_at || r.data, "weekly", 0.6);
  }
  return wrapUrlset(body);
}

async function buildPesquisas(page: number): Promise<string> {
  if (page > 0) return wrapUrlset("");
  const rows = await fetchAll<{ slug: string; updated_at: string }>((from, to) =>
    supabase.from("search_posts").select("slug, updated_at").order("updated_at", { ascending: false }).range(from, to)
  );
  let body = "";
  for (const r of rows) {
    if (!r.slug) continue;
    body += urlEntry(`${SITE}/pesquisa/${r.slug}`, r.updated_at, "weekly", 0.6);
  }
  return wrapUrlset(body);
}

// Times que jogaram competições do foco desde a temporada anterior.
async function buildTimes(): Promise<string> {
  const matches = await focusMatches();
  const slugs = new Set<string>();
  for (const m of matches) {
    if (m.casa?.slug) slugs.add(m.casa.slug);
    if (m.fora?.slug) slugs.add(m.fora.slug);
  }
  const today = new Date().toISOString().split("T")[0];
  let body = "";
  for (const slug of [...slugs].sort()) {
    body += urlEntry(`${SITE}/times/${slug}`, today, "weekly", 0.7);
  }
  return wrapUrlset(body);
}

async function buildEstatisticas(): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const ligas = await focusLigas();
  const slugById = new Map(ligas.map((l) => [l.id, l.slug]));
  let body = "";

  for (const l of ligas) {
    body += urlEntry(`${SITE}/estatisticas/${l.slug}`, today, "weekly", 0.7);
  }

  // Time × temporada, só competições do foco e só a página principal (sem variações).
  const seen = new Set<string>();
  for (const m of await focusMatches()) {
    if (m.gols_casa == null || m.gols_fora == null) continue;
    const liga = slugById.get(m.liga_id);
    const year = new Date(m.data).getFullYear();
    if (!liga) continue;
    for (const team of [m.casa?.slug, m.fora?.slug]) {
      if (team) seen.add(`${liga}|${team}|${year}`);
    }
  }
  for (const key of [...seen].sort()) {
    const [liga, time, ano] = key.split("|");
    body += urlEntry(`${SITE}/estatisticas/${liga}/${time}/${ano}`, today, "weekly", 0.6);
  }

  const metricas = ["pontos", "melhores-ataques", "melhores-defesas", "mais-gols", "mais-vitorias", "aproveitamento"];
  const currentYear = new Date().getFullYear();
  for (const y of [currentYear, currentYear - 1]) {
    for (const m of metricas) {
      body += urlEntry(`${SITE}/estatisticas/rankings/${m}/${y}`, today, "weekly", 0.5);
    }
  }

  return wrapUrlset(body);
}

// ---------- router ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // path can be /sitemap, /sitemap-static.xml, etc. Edge functions are mounted at /functions/v1/sitemap
    // We accept ?type=... or parse the trailing segment.
    const typeParam = url.searchParams.get("type");
    const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
    let type = typeParam;
    let page = pageParam;

    if (!type) {
      const last = url.pathname.split("/").pop() || "";
      const name = last.replace(/\.xml$/, "");
      if (!name || name === "sitemap" || name === "index") {
        type = "index";
      } else if (name === "sitemap-static" || name === "static") {
        type = "static";
      } else if (name === "sitemap-times" || name === "times") {
        type = "times";
      } else if (name === "sitemap-estatisticas" || name === "estatisticas") {
        type = "estatisticas";
      } else {
        const m = name.match(/^sitemap-(noticias|partidas|pesquisas)-(\d+)$/);
        if (m) {
          type = m[1];
          page = parseInt(m[2], 10);
        } else {
          type = "index";
        }
      }
    }

    let body: string;
    switch (type) {
      case "static":
        body = buildStatic();
        break;
      case "noticias":
        body = await buildNoticias(Math.max(0, page - 1));
        break;
      case "partidas":
        body = await buildPartidas(Math.max(0, page - 1));
        break;
      case "times":
        body = await buildTimes();
        break;
      case "estatisticas":
        body = await buildEstatisticas();
        break;
      case "pesquisas":
        body = await buildPesquisas(Math.max(0, page - 1));
        break;
      case "index":
      default:
        body = await buildIndex();
    }

    return new Response(body, { headers: xmlHeaders });
  } catch (e) {
    console.error("sitemap error", e);
    return new Response(`<!-- error: ${(e as Error).message} -->`, {
      headers: xmlHeaders,
      status: 500,
    });
  }
});
