import { useEffect } from "react";

interface ArticleSEOProps {
  title: string;
  description: string;
  image?: string;
  url: string;
  publishedTime?: string;
  author?: string;
}

export function ArticleSEO({
  title,
  description,
  image,
  url,
  publishedTime,
  author = "Statball",
}: ArticleSEOProps) {
  useEffect(() => {
    // Update document title
    const originalTitle = document.title;
    document.title = `${title} | Statball`;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic meta tags
    updateMeta("description", description);
    updateMeta("author", author);

    // Open Graph tags
    updateMeta("og:title", title, true);
    updateMeta("og:description", description, true);
    updateMeta("og:type", "article", true);
    updateMeta("og:url", url, true);
    if (image) {
      updateMeta("og:image", image, true);
      updateMeta("og:image:width", "1280", true);
      updateMeta("og:image:height", "720", true);
    }

    // Twitter Card tags
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);
    if (image) {
      updateMeta("twitter:image", image);
    }

    // Article-specific tags
    if (publishedTime) {
      updateMeta("article:published_time", publishedTime, true);
    }
    updateMeta("article:author", author, true);

    // Cleanup
    return () => {
      document.title = originalTitle;
    };
  }, [title, description, image, url, publishedTime, author]);

  // Also render JSON-LD for structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: image,
    url: url,
    datePublished: publishedTime,
    author: {
      "@type": "Organization",
      name: "Statball",
      url: "https://statball.com.br",
    },
    publisher: {
      "@type": "Organization",
      name: "Statball",
      logo: {
        "@type": "ImageObject",
        url: "https://statball.com.br/favicon.ico",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
