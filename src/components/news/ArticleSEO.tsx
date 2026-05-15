import { useEffect } from "react";

interface ArticleSEOProps {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  url: string;
  publishedTime?: string;
  author?: string;
}

export function ArticleSEO({
  title,
  description,
  image,
  imageAlt,
  url,
  publishedTime,
  author = "Statball",
}: ArticleSEOProps) {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${title} | Statball`;

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

    updateMeta("description", description);
    updateMeta("author", author);

    updateMeta("og:title", title, true);
    updateMeta("og:description", description, true);
    updateMeta("og:type", "article", true);
    updateMeta("og:url", url, true);
    if (image) {
      updateMeta("og:image", image, true);
      updateMeta("og:image:width", "1200", true);
      updateMeta("og:image:height", "630", true);
      if (imageAlt) updateMeta("og:image:alt", imageAlt, true);
    }

    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);
    if (image) {
      updateMeta("twitter:image", image);
      if (imageAlt) updateMeta("twitter:image:alt", imageAlt);
    }

    if (publishedTime) updateMeta("article:published_time", publishedTime, true);
    updateMeta("article:author", author, true);

    return () => {
      document.title = originalTitle;
    };
  }, [title, description, image, imageAlt, url, publishedTime, author]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: image
      ? {
          "@type": "ImageObject",
          url: image,
          width: 1200,
          height: 630,
          caption: imageAlt || title,
        }
      : undefined,
    url,
    datePublished: publishedTime,
    author: {
      "@type": "Organization",
      name: "Statball",
      url: "https://www.statball.com.br",
    },
    publisher: {
      "@type": "Organization",
      name: "Statball",
      logo: {
        "@type": "ImageObject",
        url: "https://www.statball.com.br/favicon.ico",
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