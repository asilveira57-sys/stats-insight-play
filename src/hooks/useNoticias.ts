import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function generateSlug(title: string, id: string): string {
  const baseSlug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .slice(0, 80);
  return baseSlug || id;
}

function transformNoticia(noticia: Noticia): NoticiaCard {
  return {
    id: noticia.id,
    title: noticia.titulo,
    excerpt: noticia.resumo || noticia.texto.slice(0, 150) + "...",
    image: noticia.imagem_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
    date: formatDate(noticia.data_publicacao || noticia.created_at),
    slug: noticia.slug || generateSlug(noticia.titulo, noticia.id),
  };
}

export function useNoticias(limit: number = 10) {
  return useQuery({
    queryKey: ["noticias", limit],
    queryFn: async (): Promise<NoticiaCard[]> => {
      const { data, error } = await supabase
        .from("noticias")
        .select("*")
        .eq("publicada", true)
        .order("data_publicacao", { ascending: false });

      if (error) {
        console.error("Error fetching noticias:", error);
        return [];
      }

      return (data as Noticia[]).map(transformNoticia);
    },
    staleTime: 1000 * 60 * 5,
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
        .single();

      if (error) {
        console.error("Error fetching noticia:", error);
        return null;
      }

      return data as Noticia;
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
        .single();

      if (error) {
        console.error("Error fetching noticia by slug:", error);
        return null;
      }

      return data as Noticia;
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
        .select("*")
        .eq("publicada", true)
        .order("data_publicacao", { ascending: false });

      if (error) {
        console.error("Error fetching latest noticias:", error);
        return [];
      }

      return (data as Noticia[]).map(transformNoticia);
    },
    staleTime: 1000 * 60 * 5,
  });
}
