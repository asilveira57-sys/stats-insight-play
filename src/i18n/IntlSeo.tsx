import { Helmet } from "react-helmet-async";
import { SITE, ROBOTS_INDEX, ROBOTS_NOINDEX } from "@/lib/seoFocus";
import { I18N_PUBLIC, LOCALE_TAG, type Locale } from "./locales";

type Props = {
  locale: "en" | "es";
  path: string; // caminho desta página, ex.: /en/premier-league
  title: string;
  description: string;
  /** Versões equivalentes desta página em outros idiomas (hreflang) */
  alternates?: Partial<Record<Locale, string>>;
  jsonLd?: object;
  noindex?: boolean;
};

/**
 * SEO das páginas em inglês e espanhol: idioma do documento, canonical,
 * hreflang só entre páginas realmente equivalentes e robots.
 * Enquanto I18N_PUBLIC = false, tudo sai com noindex.
 */
export function IntlSeo({ locale, path, title, description, alternates, jsonLd, noindex }: Props) {
  const url = `${SITE}${path}`;
  const robots = I18N_PUBLIC && !noindex ? ROBOTS_INDEX : ROBOTS_NOINDEX;
  const alts = { ...(alternates ?? {}), [locale]: path } as Partial<Record<Locale, string>>;
  const altEntries = Object.entries(alts) as [Locale, string][];
  return (
    <Helmet htmlAttributes={{ lang: LOCALE_TAG[locale] }}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={robots} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content={locale === "en" ? "en_GB" : "es_ES"} />
      {altEntries.length > 1 &&
        altEntries.map(([l, p]) => <link key={l} rel="alternate" hrefLang={LOCALE_TAG[l]} href={`${SITE}${p}`} />)}
      {altEntries.length > 1 && <link rel="alternate" hrefLang="x-default" href={`${SITE}${alts.en ?? path}`} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
