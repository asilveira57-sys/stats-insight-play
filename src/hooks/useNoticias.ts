import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FilterValues } from "@/components/filters/AdvancedFilters";

export interface Noticia {
  id: string;
  titulo: string;
  resumo: string | null;
  texto: string;
  imagem_url: string | null;
  data_publicacao: string | null;
  publicada: boolean;
  created_at: string;
  slug: string | null;
}

export interface NoticiaCard {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  slug: string;
}

const LIST_COLUMNS = "id, titulo, resumo, slug, imagem_url, data_publicacao, created_at, partida_id";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function generateSlug(title: string, id: string): string {
  const baseSlug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return baseSlug || id;
}

function transformNoticia(noticia: any): NoticiaCard {
  return {
    id: noticia.id,
    title: noticia.titulo,
    excerpt: noticia.resumo || "",
    image: noticia.imagem_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
    date: formatDate(noticia.data_publicacao || noticia.created_at),
    slug: noticia.slug || generateSlug(noticia.titulo, noticia.id),
  };
}

// Legacy hook – limited fetch (no full table scan), kept for compatibility.
export function useNoticias(limit: number = 10) {
  return useQuery({
    queryKey: ["noticias", limit],
    queryFn: async (): Promise<NoticiaCard[]> => {
      const { data, error } = await supabase
        .from("noticias")
        .select(LIST_COLUMNS)
        .eq("publicada", true)
        .order("data_publicacao", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching noticias:", error);
        return [];
      }
      return (data || []).map(transformNoticia);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export interface PaginatedNoticias {
  items: NoticiaCard[];
  total: number;
}

export interface UseNoticiasPaginatedParams {
  page: number;
  pageSize: number;
  filters: FilterValues;
  slugLike?: string; // optional prefix like 'validacao-semana-%'
}

export function useNoticiasPaginated({ page, pageSize, filters, slugLike }: UseNoticiasPaginatedParams) {
  return useQuery({
    queryKey: ["noticias-paginated", page, pageSize, filters, slugLike ?? null],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PaginatedNoticias> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from("noticias")
        .select(LIST_COLUMNS + ", partidas:partida_id(data, liga_id, time_casa_id, time_fora_id, time_casa:time_casa_id(nome), time_fora:time_fora_id(nome))", { count: "exact" })
        .eq("publicada", true);

      if (slugLike) q = q.like("slug", slugLike);

      if (filters.search) {
        const term = `%${filters.search.replace(/[%_]/g, " ")}%`;
        q = q.or(`titulo.ilike.${term},resumo.ilike.${term}`);
      }

      // Date filters apply to the related match date when possible, falling back to data_publicacao.
      if (filters.dateFrom) q = q.gte("data_publicacao", filters.dateFrom);
      if (filters.dateTo) q = q.lte("data_publicacao", filters.dateTo + "T23:59:59");

      if (filters.temporada) {
        const y = parseInt(filters.temporada, 10);
        if (!Number.isNaN(y)) {
          q = q
            .gte("data_publicacao", `${y}-01-01`)
            .lte("data_publicacao", `${y}-12-31T23:59:59`);
        }
      }

      const { data, error, count } = await q
        .order("data_publicacao", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching paginated noticias:", error);
        return { items: [], total: 0 };
      }

      let items = (data || []) as any[];

      // League filter is applied client-side over the page (since join filter is hard via PostgREST .or)
      if (filters.ligaId) {
        items = items.filter((n) => n.partidas?.liga_id === filters.ligaId);
      }

      return {
        items: items.map(transformNoticia),
        total: count ?? items.length,
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useNoticia(id: string | null) {
  return useQuery({
    queryKey: ["noticia", id],
    queryFn: async (): Promise<Noticia | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("noticias")
        .select("*")
        .eq("id", id)
        .eq("publicada", true)
        .maybeSingle();
      if (error) {
        console.error("Error fetching noticia:", error);
        return null;
      }
      return data as Noticia | null;
    },
    enabled: !!id,
  });
}

export function useNoticiaBySlug(slug: string | null) {
  return useQuery({
    queryKey: ["noticia-slug", slug],
    queryFn: async (): Promise<Noticia | null> => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("noticias")
        .select("*")
        .eq("slug", slug)
        .eq("publicada", true)
        .maybeSingle();
      if (error) {
        console.error("Error fetching noticia by slug:", error);
        return null;
      }
      return data as Noticia | null;
    },
    enabled: !!slug,
  });
}

export function useLatestNoticias(count: number = 3) {
  return useQuery({
    queryKey: ["latest-noticias", count],
    queryFn: async (): Promise<NoticiaCard[]> => {
      const { data, error } = await supabase
        .from("noticias")
        .select(LIST_COLUMNS)
        .eq("publicada", true)
        .order("data_publicacao", { ascending: false })
        .limit(count);
      if (error) {
        console.error("Error fetching latest noticias:", error);
        return [];
      }
      return (data || []).map(transformNoticia);
    },
    staleTime: 1000 * 60 * 5,
  });
}
