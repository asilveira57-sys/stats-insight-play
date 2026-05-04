import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useTeamBySlug, useTeamRelatedNews } from "@/hooks/useTeamPillar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Newspaper, Search, Home } from "lucide-react";

const PAGE_SIZE = 12;

export default function TimeAnalises() {
  const { slug } = useParams<{ slug: string }>();
  const { data: team, isLoading: loadingTeam } = useTeamBySlug(slug || null);
  const { data: news, isLoading: loadingNews } = useTeamRelatedNews(team?.nome || null);

  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("all");
  const [page, setPage] = useState(1);

  const years = useMemo(() => {
    if (!news) return [];
    const set = new Set<string>();
    news.forEach((n: any) => {
      if (n.data_publicacao) set.add(new Date(n.data_publicacao).getFullYear().toString());
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [news]);

  const filtered = useMemo(() => {
    if (!news) return [];
    return (news as any[]).filter((n) => {
      const matchSearch = search
        ? n.titulo?.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchYear =
        year === "all"
          ? true
          : n.data_publicacao &&
            new Date(n.data_publicacao).getFullYear().toString() === year;
      return matchSearch && matchYear;
    });
  }, [news, search, year]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const isLoading = loadingTeam || loadingNews;

  if (!loadingTeam && !team) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-display font-bold mb-2">Time não encontrado</h1>
          <Button asChild className="mt-4">
            <Link to="/">Voltar à Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <title>{team ? `Análises do ${team.nome} | Statball` : "Análises | Statball"}</title>
      <meta
        name="description"
        content={
          team
            ? `Todas as análises estatísticas e validações de previsões de jogos do ${team.nome}.`
            : "Análises estatísticas de jogos de futebol."
        }
      />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/"><Home className="w-3.5 h-3.5" /></Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/times">Times</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {team && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/times/${slug}`}>{team.nome}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Análises</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">
                Análises do {team?.nome || "..."}
              </h1>
              {!isLoading && (
                <p className="text-sm text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "análise" : "análises"}
                  {(search || year !== "all") && ` (de ${news?.length || 0} no total)`}
                </p>
              )}
            </div>
          </div>

          <Button variant="outline" asChild>
            <Link to={`/times/${slug}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao time
            </Link>
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          {years.length > 1 && (
            <Select
              value={year}
              onValueChange={(v) => {
                setYear(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma análise encontrada</h3>
            <p className="text-sm text-muted-foreground">
              {search || year !== "all"
                ? "Tente ajustar os filtros"
                : "Ainda não há análises publicadas sobre este time"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pageItems.map((news: any) => (
              <Link
                key={news.id}
                to={`/noticias/${news.slug}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                {news.imagem_url && (
                  <img
                    src={news.imagem_url}
                    alt=""
                    className="w-20 h-14 object-cover rounded flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-2">
                    {news.titulo}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {news.data_publicacao &&
                      new Date(news.data_publicacao).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setPage(currentPage - 1);
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1
                )
                .map((p, idx, arr) => (
                  <>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <PaginationItem key={`ellipsis-${p}`}>
                        <span className="px-2 text-muted-foreground">…</span>
                      </PaginationItem>
                    )}
                    <PaginationItem key={p}>
                      <PaginationLink
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(p);
                        }}
                        isActive={p === currentPage}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) setPage(currentPage + 1);
                  }}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </Layout>
  );
}
