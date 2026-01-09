import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NewsCard } from "@/components/cards/NewsCard";
import { useNoticias } from "@/hooks/useNoticias";
import { Newspaper, Search, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Noticias() {
  const { data: noticias, isLoading } = useNoticias(30);
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar análises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full md:w-64"
            />
          </div>
        </div>

        {/* SEO intro text */}
        <div className="mb-8 p-6 rounded-xl bg-card/50 border border-border">
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

            {/* Section divider */}
            {otherNoticias.length > 0 && (
              <div className="flex items-center gap-4 my-8">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground font-medium">Mais Análises</span>
                <div className="h-px flex-1 bg-border" />
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

            {/* SEO Footer */}
            <div className="mt-12 p-6 rounded-xl bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                O Statball produz análises estatísticas de futebol baseadas em dados. 
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
              {searchTerm 
                ? "Tente buscar por outro termo" 
                : "Novas análises serão publicadas em breve"}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
