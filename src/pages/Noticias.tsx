import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NewsCard } from "@/components/cards/NewsCard";
import { useNoticiasPaginated } from "@/hooks/useNoticias";
import { AdvancedFilters, EMPTY_FILTERS, type FilterValues } from "@/components/filters/AdvancedFilters";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { Newspaper, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 30;

export default function Noticias() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [filters, setFilters] = useState<FilterValues>(() => ({
    ...EMPTY_FILTERS,
    search: searchParams.get("q") || "",
    ligaId: searchParams.get("liga") || null,
    temporada: searchParams.get("temp") || null,
    dateFrom: searchParams.get("de") || null,
    dateTo: searchParams.get("ate") || null,
  }));

  const updateFilters = (next: FilterValues) => {
    setFilters(next);
    const sp = new URLSearchParams();
    if (next.search) sp.set("q", next.search);
    if (next.ligaId) sp.set("liga", next.ligaId);
    if (next.temporada) sp.set("temp", next.temporada);
    if (next.dateFrom) sp.set("de", next.dateFrom);
    if (next.dateTo) sp.set("ate", next.dateTo);
    sp.delete("page"); // reset to page 1 on filter change
    setSearchParams(sp, { replace: true });
  };

  const setPage = (p: number) => {
    const sp = new URLSearchParams(searchParams);
    if (p <= 1) sp.delete("page");
    else sp.set("page", String(p));
    setSearchParams(sp, { replace: true });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { data, isLoading, isFetching } = useNoticiasPaginated({
    page,
    pageSize: PAGE_SIZE,
    filters,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const featured = page === 1 ? items.slice(0, 2) : [];
  const rest = page === 1 ? items.slice(2) : items;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                <span className="gradient-text">Análises Estatísticas</span>
              </h1>
              <p className="text-muted-foreground">
                Conteúdo aprofundado sobre futebol baseado em dados
              </p>
            </div>
          </div>
        </div>

        {/* SEO intro */}
        <div className="mb-6 p-6 rounded-xl bg-card/50 border border-border">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-semibold mb-2">Análises Completas de Confrontos</h2>
              <p className="text-sm text-muted-foreground">
                Cada artigo contém análise estatística detalhada, leitura tática, cenários prováveis e
                projeções baseadas em dados. Conteúdo original gerado por nosso sistema de inteligência
                estatística para ajudar você a entender os confrontos em profundidade.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <AdvancedFilters
            value={filters}
            onChange={updateFilters}
            searchPlaceholder="Buscar análise por título..."
          />
        </div>

        {/* Top pagination summary */}
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isLoading ? "Carregando..." : `${total.toLocaleString("pt-BR")} análises encontradas`}
            {isFetching && !isLoading && " (atualizando…)"}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        ) : items.length > 0 ? (
          <>
            {featured.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {featured.map((item) => (
                  <Link key={item.id} to={`/noticias/${item.slug}`}>
                    <NewsCard {...item} featured />
                  </Link>
                ))}
              </div>
            )}

            {rest.length > 0 && featured.length > 0 && (
              <div className="flex items-center gap-4 my-8">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground font-medium">Mais Análises</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((item) => (
                  <Link key={item.id} to={`/noticias/${item.slug}`}>
                    <NewsCard {...item} />
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-10">
              <PaginationBar page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </div>

            <div className="mt-12 p-6 rounded-xl bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                O Aleball produz análises estatísticas de futebol baseadas em dados.
                Cada artigo apresenta leitura tática, probabilidades e cenários possíveis
                para os principais confrontos das competições acompanhadas.
              </p>
              <p className="text-xs text-muted-foreground">
                Plataforma de estatísticas e análises. Não é serviço de apostas.
                Consulte nossos{" "}
                <Link to="/termos" className="text-primary hover:underline">
                  Termos de Uso
                </Link>{" "}
                e{" "}
                <Link to="/privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>.
              </p>
            </div>
          </>
        ) : (
          <div className="glass-card p-12 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma análise encontrada</h3>
            <p className="text-sm text-muted-foreground">
              Tente ajustar os filtros ou limpar a busca.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
