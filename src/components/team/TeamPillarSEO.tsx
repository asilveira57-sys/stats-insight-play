import { useEffect } from "react";

interface TeamPillarSEOProps {
  teamName: string;
  leagueName?: string;
  description?: string;
  url: string;
}

export function TeamPillarSEO({ teamName, leagueName, description, url }: TeamPillarSEOProps) {
  const title = leagueName 
    ? `${teamName} - Análise Estatística | ${leagueName} | Aleball`
    : `${teamName} - Análise Estatística Completa | Aleball`;
  
  const metaDescription = description || 
    `Análise estatística completa do ${teamName}${leagueName ? ` na ${leagueName}` : ""}. Desempenho, tendências, forma recente e estatísticas detalhadas.`;

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
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
    const existingJsonLd = document.querySelector('script[data-team-pillar-jsonld]');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SportsTeam",
      "name": teamName,
      "sport": "Football",
      "url": url,
      "description": metaDescription,
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-team-pillar-jsonld", "true");
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      const cleanup = document.querySelector('script[data-team-pillar-jsonld]');
      if (cleanup) cleanup.remove();
    };
  }, [title, metaDescription, url, teamName]);

  return null;
}
