import { useEffect } from "react";

interface LeaguePillarSEOProps {
  leagueName: string;
  country?: string | null;
  description?: string;
  url: string;
}

export function LeaguePillarSEO({ leagueName, country, description, url }: LeaguePillarSEOProps) {
  const title = `${leagueName} - Análise Estatística Completa | Statball`;
  
  const metaDescription = description || 
    `Análise estatística completa da ${leagueName}${country ? ` (${country})` : ""}. Times, estatísticas, tendências e análises detalhadas da temporada.`;

  useEffect(() => {
    document.title = title;

    const updateMeta = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let element = document.querySelector(selector) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement("meta");
        if (isProperty) {
          element.setAttribute("property", name);
        } else {
          element.setAttribute("name", name);
        }
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    updateMeta("description", metaDescription);
    updateMeta("og:title", title, true);
    updateMeta("og:description", metaDescription, true);
    updateMeta("og:url", url, true);
    updateMeta("og:type", "website", true);
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", metaDescription);

    // JSON-LD structured data
    const existingJsonLd = document.querySelector('script[data-league-pillar-jsonld]');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SportsOrganization",
      "name": leagueName,
      "sport": "Football",
      "url": url,
      "description": metaDescription,
      ...(country && { "location": { "@type": "Country", "name": country } }),
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-league-pillar-jsonld", "true");
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      const cleanup = document.querySelector('script[data-league-pillar-jsonld]');
      if (cleanup) cleanup.remove();
    };
  }, [title, metaDescription, url, leagueName, country]);

  return null;
}
