import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Trophy, Shield, Users, MessageCircle, Clock } from "lucide-react";
import {
  useSearchTrends,
  usePopularEntities,
  useRecentGlobalSearches,
} from "@/hooks/useIntelligentSearch";
import { Skeleton } from "@/components/ui/skeleton";

function TrendList({ title, icon: Icon, items, loading, getHref }: {
  title: string;
  icon: any;
  items: { name: string; count: number; sub?: string }[];
  loading: boolean;
  getHref?: (item: any) => string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
          : items.length === 0
            ? <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
            : items.map((it, i) => {
                const href = getHref?.(it);
                const content = (
                  <div className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-muted/50 transition-colors">
                    <span className="text-sm truncate">{it.name}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{it.count}</Badge>
                  </div>
                );
                return href ? <Link key={i} to={href}>{content}</Link> : <div key={i}>{content}</div>;
              })}
      </CardContent>
    </Card>
  );
}

export function TrendingCards() {
  const { data: trends, isLoading: lt } = useSearchTrends("daily", 8);
  const { data: teams, isLoading: lTeams } = usePopularEntities("team", 8);
  const { data: leagues, isLoading: lLeagues } = usePopularEntities("league", 8);
  const { data: players, isLoading: lPlayers } = usePopularEntities("player", 8);
  const { data: recent, isLoading: lr } = useRecentGlobalSearches(8);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TrendList
        title="Populares hoje"
        icon={TrendingUp}
        loading={lt}
        items={(trends || []).map((t: any) => ({ name: t.term, count: t.daily_searches }))}
        getHref={(it) => `/pesquisa?q=${encodeURIComponent(it.name)}`}
      />
      <TrendList
        title="Times mais buscados"
        icon={Shield}
        loading={lTeams}
        items={(teams || []).map((t: any) => ({ name: t.entity_name, count: t.search_count }))}
        getHref={(it) => `/pesquisa?q=${encodeURIComponent(it.name)}`}
      />
      <TrendList
        title="Campeonatos populares"
        icon={Trophy}
        loading={lLeagues}
        items={(leagues || []).map((t: any) => ({ name: t.entity_name, count: t.search_count }))}
        getHref={(it) => `/pesquisa?q=${encodeURIComponent(it.name)}`}
      />
      <TrendList
        title="Jogadores em alta"
        icon={Users}
        loading={lPlayers}
        items={(players || []).map((t: any) => ({ name: t.entity_name, count: t.search_count }))}
        getHref={(it) => `/pesquisa?q=${encodeURIComponent(it.name)}`}
      />
      <TrendList
        title="Últimas pesquisas globais"
        icon={Clock}
        loading={lr}
        items={(recent || []).map((t: any) => ({ name: t.term, count: t.total_searches }))}
        getHref={(it) => `/pesquisa?q=${encodeURIComponent(it.name)}`}
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            Perguntas para a IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {["Quem é o artilheiro do Brasileirão?", "Qual time tem mais vitórias?", "Quem ganhou mais Libertadores?"].map((q, i) => (
            <Link key={i} to={`/pesquisa?q=${encodeURIComponent(q)}`} className="block py-1 px-2 text-sm rounded hover:bg-muted/50 transition-colors">
              {q}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
