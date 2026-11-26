import type { Plugin } from "vite";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

/**
 * Gera, no build, um index.html próprio para cada página importante do sitemap
 * (jogos, artigos e times), já com título, descrição, endereço oficial, dados
 * estruturados e um texto básico. O Google passa a ler o conteúdo sem precisar
 * rodar o JavaScript. Quem visita não percebe diferença: o React monta a página
 * normalmente por cima.
 *
 * Falha em silêncio: se algo der errado, o site continua com o index.html único.
 */

const SITE = "https://www.aleball.com.br";

type Env = { url?: string; key?: string };

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const limpar = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>]+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();

const corta = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

function dataBR(iso?: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function rest<T>(env: Env, query: string): Promise<T[]> {
  const res = await fetch(`${env.url}/rest/v1/${query}`, {
    headers: { apikey: env.key!, Authorization: `Bearer ${env.key}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${query.slice(0, 60)}`);
  return (await res.json()) as T[];
}

async function emLotes<T>(env: Env, base: string, campo: string, valores: string[], lote = 120): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < valores.length; i += lote) {
    const lista = valores
      .slice(i, i + lote)
      .map((v) => `"${v.replace(/"/g, "")}"`)
      .join(",");
    out.push(...(await rest<T>(env, `${base}&${campo}=in.(${encodeURIComponent(lista)})`)));
  }
  return out;
}

type Pagina = {
  caminho: string; // ex.: /partida/slug
  titulo: string;
  descricao: string;
  corpo: string; // HTML simples dentro do #root
  jsonld?: object;
  ogType?: string;
  imagem?: string | null;
};

function montarHtml(modelo: string, p: Pagina): string {
  const url = SITE + p.caminho;
  const titulo = esc(p.titulo);
  const desc = esc(p.descricao);
  let html = modelo;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${titulo}</title>`);
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${desc}" data-rh="true" />`);
  html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${titulo}" data-rh="true" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}" data-rh="true" />`);
  html = html.replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${p.ogType ?? "website"}" data-rh="true" />`);
  html = html.replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${titulo}" data-rh="true" />`);
  html = html.replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${desc}" data-rh="true" />`);
  if (p.imagem && /^https?:\/\//.test(p.imagem)) {
    html = html.replace(/<meta property="og:image" [^>]*>/, `<meta property="og:image" content="${esc(p.imagem)}" data-rh="true" />`);
  }

  const extras = [
    `<link rel="canonical" href="${esc(url)}" data-rh="true" />`,
    `<meta name="robots" content="index, follow" data-rh="true" />`,
    `<meta property="og:url" content="${esc(url)}" data-rh="true" />`,
    p.jsonld ? `<script type="application/ld+json" data-rh="true">${JSON.stringify(p.jsonld).replace(/</g, "\\u003c")}</script>` : "",
  ].join("\n    ");
  html = html.replace("</head>", `    ${extras}\n  </head>`);

  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><main style="max-width:860px;margin:0 auto;padding:24px 16px;font-family:system-ui,sans-serif;color:#e5e7eb">${p.corpo}<p><a href="/" style="color:#00e5ff">Aleball — resultados e estatísticas do futebol</a></p></main></div>`,
  );
  return html;
}

function gravar(dist: string, p: Pagina, modelo: string) {
  const dir = path.join(dist, decodeURIComponent(p.caminho).replace(/^\/+/, ""));
  if (!dir.startsWith(dist + path.sep)) return; // nada fora da pasta de saída
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "index.html"), montarHtml(modelo, p));
}

async function paginasDeJogos(env: Env, caminhos: string[]): Promise<Pagina[]> {
  const slugs = caminhos.map((c) => c.replace(/^\/partida\//, ""));
  const rows = await emLotes<any>(
    env,
    "partidas?select=slug,data,hora,status,gols_casa,gols_fora,liga:ligas(nome),casa:times!partidas_time_casa_id_fkey(nome),fora:times!partidas_time_fora_id_fkey(nome)",
    "slug",
    slugs,
  );
  return rows
    .filter((r) => r.slug && r.casa?.nome && r.fora?.nome)
    .map((r) => {
      const casa = r.casa.nome as string;
      const fora = r.fora.nome as string;
      const liga = (r.liga?.nome as string) || "Futebol";
      const temPlacar = r.gols_casa != null && r.gols_fora != null;
      const placar = temPlacar ? `${casa} ${r.gols_casa} x ${r.gols_fora} ${fora}` : `${casa} x ${fora}`;
      const quando = dataBR(r.data);
      const titulo = temPlacar
        ? `${placar} — ${liga}, ${quando} | Aleball`
        : `${casa} x ${fora} — ${liga}, ${quando} | Aleball`;
      const descricao = temPlacar
        ? `Resultado de ${casa} x ${fora} (${liga}, ${quando}): ${r.gols_casa} a ${r.gols_fora}. Ficha do jogo, histórico do confronto e campanha recente dos dois times.`
        : `${casa} x ${fora} (${liga}), ${quando}${r.hora ? ` às ${String(r.hora).slice(0, 5)}` : ""}. Histórico do confronto e campanha recente dos dois times.`;
      const corpo = `<h1>${esc(placar)}</h1><p>${esc(liga)} · ${esc(quando)}${r.hora ? ` · ${esc(String(r.hora).slice(0, 5))}` : ""}</p><p>${esc(descricao)}</p>`;
      const jsonld: any = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: `${casa} x ${fora}`,
        sport: "Futebol",
        startDate: r.data,
        url: `${SITE}/partida/${r.slug}`,
        homeTeam: { "@type": "SportsTeam", name: casa },
        awayTeam: { "@type": "SportsTeam", name: fora },
        competitor: [
          { "@type": "SportsTeam", name: casa },
          { "@type": "SportsTeam", name: fora },
        ],
        superEvent: { "@type": "SportsEvent", name: liga },
      };
      return { caminho: `/partida/${r.slug}`, titulo, descricao: corta(descricao, 160), corpo, jsonld };
    });
}

async function paginasDeArtigos(env: Env, caminhos: string[]): Promise<Pagina[]> {
  const slugs = caminhos.map((c) => c.replace(/^\/noticias\//, ""));
  const rows = await emLotes<any>(
    env,
    "noticias?select=slug,titulo,resumo,texto,imagem_url,data_publicacao,updated_at&publicada=eq.true",
    "slug",
    slugs,
    60,
  );
  return rows
    .filter((r) => r.slug && r.titulo)
    .map((r) => {
      const texto = limpar(String(r.texto ?? ""));
      const resumo = limpar(String(r.resumo ?? "")) || corta(texto, 200);
      const paragrafos = String(r.texto ?? "")
        .split(/\n\s*\n/)
        .map((b) => limpar(b))
        .filter(Boolean)
        .slice(0, 40)
        .map((b) => `<p>${esc(b)}</p>`)
        .join("");
      const corpo = `<article><h1>${esc(r.titulo)}</h1>${r.data_publicacao ? `<p><time datetime="${esc(r.data_publicacao)}">${esc(dataBR(r.data_publicacao))}</time></p>` : ""}${paragrafos}</article>`;
      const jsonld = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: corta(r.titulo, 110),
        description: corta(resumo, 300),
        datePublished: r.data_publicacao ?? undefined,
        dateModified: r.updated_at ?? r.data_publicacao ?? undefined,
        image: r.imagem_url ? [r.imagem_url] : undefined,
        mainEntityOfPage: `${SITE}/noticias/${r.slug}`,
        author: { "@type": "Organization", name: "Aleball", url: SITE },
        publisher: { "@type": "Organization", name: "Aleball", logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` } },
      };
      return {
        caminho: `/noticias/${r.slug}`,
        titulo: `${r.titulo} | Aleball`,
        descricao: corta(resumo, 160),
        corpo,
        jsonld,
        ogType: "article",
        imagem: r.imagem_url,
      };
    });
}

async function paginasDeTimes(env: Env, caminhos: string[]): Promise<Pagina[]> {
  const slugs = [...new Set(caminhos.map((c) => c.split("/")[2]).filter(Boolean))];
  const rows = await emLotes<any>(env, "times?select=slug,nome", "slug", slugs);
  const nome = new Map(rows.map((r) => [r.slug, r.nome as string]));
  return caminhos
    .map((c): Pagina | null => {
      const partes = c.split("/");
      const n = nome.get(partes[2]);
      if (!n) return null;
      const analises = partes[3] === "analises";
      const titulo = analises ? `${n}: análises e estatísticas | Aleball` : `${n}: jogos, resultados e estatísticas | Aleball`;
      const descricao = analises
        ? `${n}: análises estatísticas de desempenho recente, gols, jogos como mandante e visitante, com base nos resultados oficiais.`
        : `${n}: últimos resultados, próximos jogos, campanha na temporada e histórico de confrontos.`;
      return {
        caminho: c,
        titulo,
        descricao,
        corpo: `<h1>${esc(titulo.replace(" | Aleball", ""))}</h1><p>${esc(descricao)}</p>`,
        jsonld: { "@context": "https://schema.org", "@type": "SportsTeam", name: n, sport: "Futebol", url: SITE + c },
      };
    })
    .filter((p): p is Pagina => p !== null);
}

export function seoPrerenderPlugin(env: Env): Plugin {
  let outDir = "dist";
  let root = process.cwd();
  return {
    name: "aleball-seo-prerender",
    apply: "build",
    configResolved(cfg) {
      outDir = path.resolve(cfg.root, cfg.build.outDir);
      root = cfg.root;
    },
    async closeBundle() {
      try {
        if (!env.url || !env.key) {
          console.warn("[seo-prerender] sem VITE_SUPABASE_URL/KEY — pulando");
          return;
        }
        const modeloPath = path.join(outDir, "index.html");
        if (!existsSync(modeloPath)) return;
        const modelo = readFileSync(modeloPath, "utf8");
        const ler = (f: string) => {
          const p = path.join(root, "public", f);
          return existsSync(p) ? locs(readFileSync(p, "utf8")) : [];
        };
        const caminhos = (urls: string[]) => urls.map((u) => u.replace(/^https?:\/\/[^/]+/, "")).filter((c) => c.length > 1);

        const jogos = caminhos(ler("sitemap-partidas-1.xml")).filter((c) => c.startsWith("/partida/"));
        const artigos = caminhos(ler("sitemap-noticias-1.xml")).filter((c) => c.startsWith("/noticias/"));
        const times = caminhos(ler("sitemap-times.xml")).filter((c) => /^\/times\/[^/]+(\/analises)?$/.test(c));

        const grupos: [string, () => Promise<Pagina[]>][] = [
          ["jogos", () => paginasDeJogos(env, jogos)],
          ["artigos", () => paginasDeArtigos(env, artigos)],
          ["times", () => paginasDeTimes(env, times)],
        ];
        for (const [nome, gerar] of grupos) {
          try {
            const paginas = await gerar();
            paginas.forEach((p) => gravar(outDir, p, modelo));
            console.log(`[seo-prerender] ${nome}: ${paginas.length} páginas`);
          } catch (e) {
            console.warn(`[seo-prerender] ${nome} falhou: ${(e as Error).message}`);
          }
        }
      } catch (e) {
        console.warn(`[seo-prerender] desligado neste build: ${(e as Error).message}`);
      }
    },
  };
}
