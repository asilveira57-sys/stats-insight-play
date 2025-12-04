import { Layout } from "@/components/layout/Layout";
import { NewsCard } from "@/components/cards/NewsCard";
import { news } from "@/data/mockData";
import { Newspaper, Search } from "lucide-react";

export default function Noticias() {
  // Duplicate news for demo
  const allNews = [...news, ...news, ...news];

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
              className="pl-10 pr-4 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full md:w-64"
            />
          </div>
        </div>

        {/* Featured News */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <NewsCard {...news[0]} featured />
          <NewsCard {...news[1]} featured />
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allNews.map((item, index) => (
            <NewsCard key={`${item.id}-${index}`} {...item} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
