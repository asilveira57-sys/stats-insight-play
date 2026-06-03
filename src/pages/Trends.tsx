import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Trophy, Shield, Users, Flame } from "lucide-react";
import {
  useSearchTrends,
  usePopularEntities,
} from "@/hooks/useIntelligentSearch";
import { Link } from "react-router-dom";

type Period = "daily" | "weekly" | "monthly" | "total";

const PERIODS: { key: Period; label: string }[] = [
  { key: "daily", label: "Hoje" },
  { key: "weekly", label: "Semana" },
  { key: "monthly", label: "Mês" },
  { key: "total", label: "Total" },
];

function RankCard({ title, icon: Icon, items }: { title: string; icon: any; items: { name: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
        ) : (
          items.map((it, i) => (
            <Link
              key={i}
              to={`/pesquisa?q=${encodeURIComponent(it.name)}`}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}.</span>
                <span className="text-sm truncate">{it.name}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">{it.count}</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function Trends() {
  const [period, setPeriod] = useState<Period>("daily");
  const { data: trends } = useSearchTrends(period, 20);
  const { data: teams } = usePopularEntities("team", 20);
  const { data: leagues } = usePopularEntities("league", 20);
  const { data: players } = usePopularEntities("player", 20);

  const trendItems = (trends || []).map((t: any) => ({
    name: t.term,
    count: period === "total" ? t.total_searches : t[`${period}_searches`],
  }));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Flame className="h-7 w-7 text-primary" />
            Tendências de Pesquisa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            O que o Brasil está pesquisando sobre futebol no Statball.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? "default" : "outline"}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <RankCard title="Termos mais buscados" icon={TrendingUp} items={trendItems} />
          <RankCard title="Times" icon={Shield} items={(teams || []).map((t: any) => ({ name: t.entity_name, count: t.search_count }))} />
          <RankCard title="Campeonatos" icon={Trophy} items={(leagues || []).map((t: any) => ({ name: t.entity_name, count: t.search_count }))} />
          <RankCard title="Jogadores" icon={Users} items={(players || []).map((t: any) => ({ name: t.entity_name, count: t.search_count }))} />
        </div>
      </div>
    </Layout>
  );
}
