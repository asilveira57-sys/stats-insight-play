import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, AlertTriangle, Lock, AlertCircle } from "lucide-react";

interface SlugStats {
  teams: {
    total: number;
    noSlug: number;
    locked: number;
    conflicts: number;
  };
  matches: {
    total: number;
    noSlug: number;
    locked: number;
    conflicts: number;
  };
}

interface SlugStatsCardsProps {
  stats?: SlugStats;
  isLoading: boolean;
  entityType: "team" | "match";
}

export function SlugStatsCards({ stats, isLoading, entityType }: SlugStatsCardsProps) {
  const data = entityType === "team" ? stats?.teams : stats?.matches;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total",
      value: data?.total ?? 0,
      icon: entityType === "team" ? Users : Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Sem Slug",
      value: data?.noSlug ?? 0,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      highlight: (data?.noSlug ?? 0) > 0,
    },
    {
      title: "Conflitos",
      value: data?.conflicts ?? 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      highlight: (data?.conflicts ?? 0) > 0,
    },
    {
      title: "Travados",
      value: data?.locked ?? 0,
      icon: Lock,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={card.highlight ? "border-destructive" : ""}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.highlight ? "text-destructive" : ""}`}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
