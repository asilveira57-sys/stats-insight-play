import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NewsCard } from "@/components/cards/NewsCard";
import { useNoticias } from "@/hooks/useNoticias";
import { Newspaper, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Noticias() {
  const { data: noticias, isLoading } = useNoticias(20);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredNoticias = noticias?.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featuredNoticias = filteredNoticias?.slice(0, 2) || [];
  const otherNoticias = filteredNoticias?.slice(2) || [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                <span className="gradient-text">Notícias</span>
              </h1>
              <p className="text-muted-foreground">
                Últimas novidades do mundo do futebol
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar notícias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full md:w-64"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        ) : filteredNoticias && filteredNoticias.length > 0 ? (
          <>
            {/* Featured News */}
            {featuredNoticias.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {featuredNoticias.map((item) => (
                  <Link key={item.id} to={`/noticias/${item.slug}`}>
                    <NewsCard {...item} featured />
                  </Link>
                ))}
              </div>
            )}

            {/* News Grid */}
            {otherNoticias.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherNoticias.map((item) => (
                  <Link key={item.id} to={`/noticias/${item.slug}`}>
                    <NewsCard {...item} />
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="glass-card p-12 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma notícia encontrada</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm 
                ? "Tente buscar por outro termo" 
                : "Novas notícias serão publicadas em breve"}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
