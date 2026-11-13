import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { canonicalFor, isNoindexPath, ROBOTS_INDEX, ROBOTS_NOINDEX } from "@/lib/seoFocus";

/**
 * Padrões de SEO para toda rota: canonical = endereço atual em www.aleball.com
 * (sem query string) e robots. Qualquer <Helmet> de página que defina
 * canonical ou robots sobrescreve estes valores (o Helmet mais interno vence).
 * Telas internas (painel, hub, conta, pagamento) recebem noindex.
 */
export function RouteSeoDefaults() {
  const { pathname } = useLocation();
  const noindex = isNoindexPath(pathname);
  return (
    <>
      <Helmet>
        <link rel="canonical" href={canonicalFor(pathname)} />
        <meta name="robots" content={noindex ? ROBOTS_NOINDEX : ROBOTS_INDEX} />
      </Helmet>
    </>
  );
}
