// Dynamic sitemap generator for Statball
// Routes:
//   /sitemap.xml                 -> sitemap index
//   /sitemap-static.xml          -> static pages
//   /sitemap-noticias-{n}.xml    -> news (paginated)
//   /sitemap-partidas-{n}.xml    -> matches (paginated)
//   /sitemap-times.xml           -> teams (profile + analises + global)
//   /sitemap-estatisticas.xml    -> league stats + team season stats + variations + rankings

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SITE = "https://www.statball.com.br";
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

async function countTable(table: string, filter?: (q: any) => any): Promise<number> {
  let q: any = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count || 0;
}

async function fetchPage<T>(
  table: string,
  select: string,
  page: number,
  filter?: (q: any) => any,
  orderBy: { column: string; ascending?: boolean } = { column: "created_at", ascending: false },
): Promise<T[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let q: any = supabase.from(table).select(select).order(orderBy.column, { ascending: orderBy.ascending ?? false }).range(from, to);
  if (filter) q = filter(q);
  const { data } = await q;
  return (data as T[]) || [];
}

// ---------- builders ----------

async function buildIndex(): Promise<string> {
  const today = new Date().toISOString();
  const entries: { loc: string; lastmod?: string }[] = [
    { loc: `${SITE}/sitemap-static.xml`, lastmod: today },
  ];

  const noticiasCount = await countTable("noticias", (q) => q.eq("publicada", true));
  for (let i = 0; i < Math.ceil(noticiasCount / PAGE_SIZE); i++) {
    entries.push({ loc: `${SITE}/sitemap-noticias-${i + 1}.xml`, lastmod: today });
  }

  const partidasCount = await countTable("partidas", (q) => q.not("slug", "is", null));
  for (let i = 0; i < Math.ceil(partidasCount / PAGE_SIZE); i++) {
    entries.push({ loc: `${SITE}/sitemap-partidas-${i + 1}.xml`, lastmod: today });
  }

  entries.push({ loc: `${SITE}/sitemap-times.xml`, lastmod: today });
  entries.push({ loc: `${SITE}/sitemap-estatisticas.xml`, lastmod: today });

  const pesquisasCount = await countTable("search_posts");
  for (let i = 0; i < Math.ceil(pesquisasCount / PAGE_SIZE); i++) {
    entries.push({ loc: `${SITE}/sitemap-pesquisas-${i + 1}.xml`, lastmod: today });
  }

  return wrapIndex(entries);
}

function buildStatic(): string {
  const today = new Date().toISOString().split("T")[0];
  const pages: [string, string, number][] = [
    ["/", "daily", 1.0],
    ["/dashboard", "daily", 0.9],
    ["/noticias", "daily", 0.9],
    ["/campeonatos", "weekly", 0.8],
    ["/times", "weekly", 0.8],
    ["/estatisticas", "daily", 0.9],
    ["/artilheiros", "weekly", 0.7],
    ["/ranking", "weekly", 0.7],
    ["/ranking-selecoes", "weekly", 0.6],
    ["/palpites", "daily", 0.8],
    ["/resultados", "daily", 0.8],
    ["/evolucao", "weekly", 0.6],
    ["/pesquisa", "daily", 0.8],
    ["/trends", "daily", 0.7],
    ["/precos", "monthly", 0.7],
    ["/auth", "monthly", 0.5],
    ["/termos", "yearly", 0.3],
    ["/privacidade", "yearly", 0.3],
  ];
  let body = "";
  for (const [path, freq, prio] of pages) {
    body += urlEntry(`${SITE}${path}`, today, freq, prio);
  }
  return wrapUrlset(body);
}

async function buildNoticias(page: number): Promise<string> {
  const rows = await fetchPage<{ slug: string; data_publicacao: string | null; created_at: string }>(
    "noticias",
    "slug, data_publicacao, created_at",
    page,
    (q) => q.eq("publicada", true).not("slug", "is", null),
    { column: "data_publicacao", ascending: false },
  );
  let body = "";
  for (const r of rows) {
    if (!r.slug) continue;
    body += urlEntry(`${SITE}/noticias/${r.slug}`, r.data_publicacao || r.created_at, "weekly", 0.7);
  }
  return wrapUrlset(body);
}

async function buildPartidas(page: number): Promise<string> {
  const rows = await fetchPage<{ slug: string; data: string; updated_at: string }>(
    "partidas",
    "slug, data, updated_at",
    page,
    (q) => q.not("slug", "is", null),
    { column: "data", ascending: false },
  );
  let body = "";
  for (const r of rows) {
    if (!r.slug) continue;
    body += urlEntry(`${SITE}/partida/${r.slug}`, r.updated_at || r.data, "weekly", 0.6);
  }
  return wrapUrlset(body);
}

async function buildPesquisas(page: number): Promise<string> {
  const rows = await fetchPage<{ slug: string; updated_at: string }>(
    "search_posts",
    "slug, updated_at",
    page,
    undefined,
    { column: "updated_at", ascending: false },
  );
  let body = "";
  for (const r of rows) {
    if (!r.slug) continue;
    body += urlEntry(`${SITE}/pesquisa/${r.slug}`, r.updated_at, "weekly", 0.6);
  }
  return wrapUrlset(body);
}

async function buildTimes(): Promise<string> {
  // Teams are ~1k; one file is fine
  const all: { slug: string; updated_at: string }[] = [];
  let page = 0;
  while (true) {
    const rows = await fetchPage<{ slug: string; updated_at: string }>(
      "times",
      "slug, updated_at",
      page,
      (q) => q.eq("status", "active").not("slug", "is", null),
      { column: "nome", ascending: true },
    );
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    page++;
  }
  const today = new Date().toISOString().split("T")[0];
  let body = "";
  for (const t of all) {
    if (!t.slug) continue;
    const lm = t.updated_at || today;
    body += urlEntry(`${SITE}/times/${t.slug}`, lm, "weekly", 0.7);
    body += urlEntry(`${SITE}/times/${t.slug}/analises`, lm, "weekly", 0.6);
    body += urlEntry(`${SITE}/estatisticas/times/${t.slug}`, lm, "weekly", 0.6);
  }
  return wrapUrlset(body);
}

async function buildEstatisticas(): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  let body = "";

  // League hubs
  const { data: ligas } = await supabase
    .from("ligas")
    .select("slug")
    .not("slug", "is", null);
  for (const l of (ligas as { slug: string }[]) || []) {
    if (!l.slug) continue;
    body += urlEntry(`${SITE}/estatisticas/${l.slug}`, today, "weekly", 0.7);
  }

  // Team x season pages — derive from finished matches
  // Pull distinct (liga_slug, team_slug, year) via paginated matches
  const seen = new Set<string>();
  let page = 0;
  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from("partidas")
      .select("data, liga:ligas(slug), casa:times!partidas_time_casa_id_fkey(slug), fora:times!partidas_time_fora_id_fkey(slug)")
      .eq("status", "finished")
      .not("gols_casa", "is", null)
      .range(from, to);
    const rows = (data as any[]) || [];
    if (rows.length === 0) break;
    for (const r of rows) {
      const ligaSlug = r.liga?.slug;
      const year = r.data ? new Date(r.data).getFullYear() : null;
      if (!ligaSlug || !year) continue;
      for (const team of [r.casa?.slug, r.fora?.slug]) {
        if (!team) continue;
        seen.add(`${ligaSlug}|${team}|${year}`);
      }
    }
    if (rows.length < PAGE_SIZE) break;
    page++;
    if (page > 50) break; // safety
  }

  for (const key of seen) {
    const [liga, time, ano] = key.split("|");
    const base = `${SITE}/estatisticas/${liga}/${time}/${ano}`;
    body += urlEntry(base, today, "weekly", 0.6);
    body += urlEntry(`${base}/gols`, today, "monthly", 0.5);
    body += urlEntry(`${base}/mandante`, today, "monthly", 0.5);
    body += urlEntry(`${base}/visitante`, today, "monthly", 0.5);
  }

  // Rankings
  const metricas = ["pontos", "melhores-ataques", "melhores-defesas", "mais-gols", "mais-vitorias", "aproveitamento"];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) {
    for (const m of metricas) {
      body += urlEntry(`${SITE}/estatisticas/rankings/${m}/${y}`, today, "weekly", 0.6);
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
