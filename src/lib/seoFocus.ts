// Regras centrais de SEO do Aleball.
// Foco editorial: futebol brasileiro principal (+ Copa 2026, que tem rotas próprias).
// Páginas fora do foco continuam acessíveis, mas recebem noindex para não
// diluir a qualidade do site aos olhos do Google/AdSense.

export const SITE = "https://www.aleball.com";

export const FOCUS_LIGA_SLUGS = new Set<string>([
  "campeonato-brasileiro-serie-a",
  "campeonato-brasileiro-serie-b",
  "copa-do-brasil",
]);

export function isFocusLiga(slug?: string | null): boolean {
  return !!slug && FOCUS_LIGA_SLUGS.has(slug);
}

// Telas internas, de conta ou de ferramenta: nunca indexar.
const NOINDEX_PREFIXES = [
  "/admin",
  "/auth",
  "/dashboard",
  "/hub",
  "/trends",
  "/validacao",
  "/performance",
  "/evolucao",
  "/minha-assinatura",
  "/configuracoes",
  "/pagamento",
  "/assinatura",
  "/usuario",
];

export function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function canonicalFor(pathname: string): string {
  let p = pathname || "/";
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return `${SITE}${p}`;
}

export const ROBOTS_INDEX = "index, follow, max-snippet:-1, max-image-preview:large";
export const ROBOTS_NOINDEX = "noindex, follow";
