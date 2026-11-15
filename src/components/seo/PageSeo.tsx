import { Helmet } from "react-helmet-async";

interface PageSeoProps {
  title: string;
  description: string;
}

/** Título, descrição e Open Graph de uma página. Canonical/robots vêm de RouteSeoDefaults. */
export function PageSeo({ title, description }: PageSeoProps) {
  const full = title.includes("Aleball") ? title : `${title} | Aleball`;
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
    </Helmet>
  );
}
