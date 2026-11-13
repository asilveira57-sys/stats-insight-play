import { Helmet } from "react-helmet-async";
import { ROBOTS_INDEX, ROBOTS_NOINDEX } from "@/lib/seoFocus";

interface SeoTagsProps {
  canonical?: string;
  /** false = noindex, follow */
  index?: boolean;
}

/** Canonical e robots de uma página (sobrescreve os padrões de RouteSeoDefaults). */
export function SeoTags({ canonical, index }: SeoTagsProps) {
  return (
    <Helmet>
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      {index === undefined ? null : <meta name="robots" content={index ? ROBOTS_INDEX : ROBOTS_NOINDEX} />}
    </Helmet>
  );
}
