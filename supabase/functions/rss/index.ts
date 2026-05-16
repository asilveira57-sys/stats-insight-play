// Statball RSS feeds — public, cacheable, multi-tipo.
// Routes (via ?feed=... or path segments after /rss):
//   all | make | noticias | pre-jogo | pos-jogo | analises | validacao
//   estatisticas | times | ligas | arquivo
//   time/{slug} | liga/{slug} | temporada/{ano}
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = "https://www.statball.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(d: string | Date | null | undefined): string {
  if (!d) return new Date().toUTCString();
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toUTCString();
}

interface FeedItem {
  id: string;
  titulo: string;
  resumo: string | null;
  slug: string | null;
  imagem_url: string | null;
  imagem_alt: string | null;
  data_publicacao: string | null;
  updated_at: string | null;
  tipo: string | null;
  partida_id: string | null;
  partidas?: {
    data: string | null;
    liga_id: string | null;
    time_casa_id: string | null;
    time_fora_id: string | null;
    time_casa?: { nome: string; slug: string } | null;
    time_fora?: { nome: string; slug: string } | null;
    ligas?: { nome: string; slug: string } | null;
  } | null;
}

const TIPO_CATEGORIA: Record<string, string> = {
  "pre-jogo": "Pré-jogo",
  "pos-jogo": "Pós-jogo",
  "analise": "Análise",
  "validacao": "Validação",
  "noticia": "Notícia",
};

function articleUrl(slug: string | null, id: string): string {
  return `${SITE}/noticia/${slug || id}`;
}

function buildRss(opts: {
  title: string;
  description: string;
  selfUrl: string;
  items: FeedItem[];
}): string {
  const { title, description, selfUrl, items } = opts;
  const now = new Date().toUTCString();

  const itemsXml = items
    .map((n) => {
      const link = articleUrl(n.slug, n.id);
      const cat = TIPO_CATEGORIA[n.tipo || "noticia"] || "Notícia";
      const timeCasa = n.partidas?.time_casa?.nome;
      const timeFora = n.partidas?.time_fora?.nome;
      const liga = n.partidas?.ligas?.nome;
      const enclosure = n.imagem_url
        ? `\n      <enclosure url="${esc(n.imagem_url)}" type="image/jpeg" />`
        : "";
      const mediaContent = n.imagem_url
        ? `\n      <media:content url="${esc(n.imagem_url)}" medium="image"><media:description>${esc(n.imagem_alt || n.titulo)}</media:description></media:content>`
        : "";
      const extras = [
        timeCasa ? `<statball:home>${esc(timeCasa)}</statball:home>` : "",
        timeFora ? `<statball:away>${esc(timeFora)}</statball:away>` : "",
        liga ? `<statball:league>${esc(liga)}</statball:league>` : "",
        `<statball:type>${esc(n.tipo || "noticia")}</statball:type>`,
        `<statball:slug>${esc(n.slug || n.id)}</statball:slug>`,
      ]
        .filter(Boolean)
        .join("\n      ");

      return `    <item>
      <title>${esc(n.titulo)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <description>${esc(n.resumo || n.titulo)}</description>
      <pubDate>${rfc822(n.data_publicacao || n.updated_at)}</pubDate>
      <atom:updated>${rfc822(n.updated_at || n.data_publicacao)}</atom:updated>
      <category>${esc(cat)}</category>${enclosure}${mediaContent}
      ${extras}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:statball="https://www.statball.com.br/ns/rss">
  <channel>
    <title>${esc(title)}</title>
    <link>${SITE}</link>
    <atom:link href="${esc(selfUrl)}" rel="self" type="application/rss+xml" />
    <description>${esc(description)}</description>
    <language>pt-BR</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>Statball RSS</generator>
${itemsXml}
  </channel>
</rss>`;
}

const NOTICIA_COLS =
  "id,titulo,resumo,slug,imagem_url,imagem_alt,data_publicacao,updated_at,tipo,partida_id," +
  "partidas:partida_id(data,liga_id,time_casa_id,time_fora_id," +
  "time_casa:time_casa_id(nome,slug),time_fora:time_fora_id(nome,slug)," +
  "ligas:liga_id(nome,slug))";

async function queryItems(filter: (q: any) => any, limit: number) {
  let q = supabase
    .from("noticias")
    .select(NOTICIA_COLS)
    .eq("publicada", true)
    .not("slug", "is", null)
    .not("titulo", "is", null);
  q = filter(q);
  const { data, error } = await q
    .order("data_publicacao", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as unknown as FeedItem[];
}

function parseFeed(url: URL): { kind: string; param?: string } {
  // ?feed=... wins
  const q = url.searchParams.get("feed");
  if (q) {
    const [k, ...rest] = q.split("/");
    return { kind: k, param: rest.join("/") || undefined };
  }
  // path: /functions/v1/rss/<kind>[/<param>]
  const parts = url.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("rss");
  const rest = i >= 0 ? parts.slice(i + 1) : [];
  if (rest.length === 0) return { kind: "all" };
  return { kind: rest[0].replace(/\.xml$/, ""), param: rest[1]?.replace(/\.xml$/, "") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const { kind, param } = parseFeed(url);
  const selfUrl = url.toString();

  try {
    let items: FeedItem[] = [];
    let title = "Statball — Estatísticas e Palpites de Futebol";
    let description = "Últimas publicações do Statball";

    const TYPE_MAP: Record<string, string | string[]> = {
      "pre-jogo": "pre-jogo",
      "pos-jogo": "pos-jogo",
      "analises": "analise",
      "analise": "analise",
      "validacao": "validacao",
      "noticias": "noticia",
      "estatisticas": ["analise", "validacao"],
      "arquivo": ["validacao", "analise", "noticia"],
    };

    if (kind === "all") {
      items = await queryItems((q) => q, 100);
    } else if (kind === "make") {
      items = await queryItems((q) => q, 150);
      title = "Statball — Feed Automação (Make)";
      description = "Conteúdos públicos do Statball para automações externas";
    } else if (TYPE_MAP[kind]) {
      const t = TYPE_MAP[kind];
      const items_ = await queryItems(
        (q) => (Array.isArray(t) ? q.in("tipo", t) : q.eq("tipo", t)),
        100,
      );
      items = items_;
      title = `Statball — ${TIPO_CATEGORIA[Array.isArray(t) ? t[0] : t] || kind}`;
      description = `Últimas publicações: ${kind}`;
    } else if (kind === "times" || kind === "ligas") {
      // Catálogo: traz qualquer notícia com partida vinculada (proxy)
      items = await queryItems((q) => q.not("partida_id", "is", null), 100);
      title = `Statball — ${kind === "times" ? "Times" : "Ligas"}`;
    } else if (kind === "time" && param) {
      const { data: t } = await supabase
        .from("times")
        .select("id,nome,slug")
        .eq("slug", param)
        .maybeSingle();
      if (!t) return new Response("Time não encontrado", { status: 404, headers: corsHeaders });
      // Buscar partida_ids do time, então noticias
      const { data: partidasIds } = await supabase
        .from("partidas")
        .select("id")
        .or(`time_casa_id.eq.${t.id},time_fora_id.eq.${t.id}`)
        .order("data", { ascending: false })
        .limit(500);
      const ids = (partidasIds || []).map((p: any) => p.id);
      if (ids.length === 0) {
        items = [];
      } else {
        // chunk para evitar URL gigante
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
        const results: FeedItem[] = [];
        for (const c of chunks) {
          const r = await queryItems((q) => q.in("partida_id", c), 100);
          results.push(...r);
          if (results.length >= 100) break;
        }
        items = results.slice(0, 100);
      }
      title = `Statball — ${t.nome}`;
      description = `Últimas publicações sobre ${t.nome}`;
    } else if (kind === "liga" && param) {
      const { data: l } = await supabase
        .from("ligas")
        .select("id,nome,slug")
        .eq("slug", param)
        .maybeSingle();
      if (!l) return new Response("Liga não encontrada", { status: 404, headers: corsHeaders });
      const { data: partidasIds } = await supabase
        .from("partidas")
        .select("id")
        .eq("liga_id", l.id)
        .order("data", { ascending: false })
        .limit(500);
      const ids = (partidasIds || []).map((p: any) => p.id);
      if (ids.length === 0) {
        items = [];
      } else {
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
        const results: FeedItem[] = [];
        for (const c of chunks) {
          const r = await queryItems((q) => q.in("partida_id", c), 100);
          results.push(...r);
          if (results.length >= 100) break;
        }
        items = results.slice(0, 100);
      }
      title = `Statball — ${l.nome}`;
      description = `Últimas publicações da ${l.nome}`;
    } else if (kind === "temporada" && param) {
      const year = parseInt(param, 10);
      if (!Number.isFinite(year)) {
        return new Response("Temporada inválida", { status: 400, headers: corsHeaders });
      }
      items = await queryItems(
        (q) =>
          q
            .gte("data_publicacao", `${year}-01-01`)
            .lte("data_publicacao", `${year}-12-31T23:59:59`),
        100,
      );
      title = `Statball — Temporada ${year}`;
      description = `Publicações da temporada ${year}`;
    } else {
      return new Response("Feed desconhecido", { status: 404, headers: corsHeaders });
    }

    const xml = buildRss({ title, description, selfUrl, items });

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rss+xml; charset=utf-8",
        // Cache: 10 min CDN, 5 min browser; auto-invalida via TTL curto
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    console.error("[rss] error", err);
    return new Response(`Erro gerando feed: ${(err as Error).message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
