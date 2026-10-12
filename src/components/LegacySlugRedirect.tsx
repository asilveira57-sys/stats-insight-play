import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Redireciona endereços antigos (times fundidos, partidas duplicadas removidas,
// notícias duplicadas e ligas renomeadas) para o endereço atual.
// Os pares antigo -> novo ficam em public.slug_redirects.

type Rule = { entity: string; pattern: RegExp; build: (m: RegExpMatchArray, newSlug: string) => string };

const RULES: Rule[] = [
  { entity: "time", pattern: /^\/times\/([^/]+)(\/.*)?$/, build: (m, s) => `/times/${s}${m[2] ?? ""}` },
  { entity: "time", pattern: /^\/estatisticas\/times\/([^/]+)(\/.*)?$/, build: (m, s) => `/estatisticas/times/${s}${m[2] ?? ""}` },
  { entity: "partida", pattern: /^\/partida\/([^/]+)\/?$/, build: (_m, s) => `/partida/${s}` },
  { entity: "noticia", pattern: /^\/noticias\/([^/]+)\/?$/, build: (_m, s) => `/noticias/${s}` },
  { entity: "liga", pattern: /^\/campeonatos\/([^/]+)(\/.*)?$/, build: (m, s) => `/campeonatos/${s}${m[2] ?? ""}` },
];

export function LegacySlugRedirect() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    for (const rule of RULES) {
      const m = pathname.match(rule.pattern);
      if (!m) continue;
      const oldSlug = decodeURIComponent(m[1]);
      (async () => {
        try {
          const { data } = await (supabase as any)
            .from("slug_redirects")
            .select("new_slug")
            .eq("entity", rule.entity)
            .eq("old_slug", oldSlug)
            .maybeSingle();
          if (!cancelled && data?.new_slug && data.new_slug !== oldSlug) {
            navigate(rule.build(m, data.new_slug) + search + hash, { replace: true });
          }
        } catch {
          /* sem redirecionamento: a página segue normalmente */
        }
      })();
      break;
    }
    return () => {
      cancelled = true;
    };
  }, [pathname, search, hash, navigate]);

  return null;
}
