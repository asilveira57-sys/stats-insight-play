import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Target, BarChart3, Zap } from "lucide-react";

interface UserStats {
  totalPalpites: number;
  accuracyPct: number;
  level: number;
  totalXp: number;
}

export function DashboardUserPerformance({ stats }: { stats: UserStats | null }) {
  if (!stats) return null;

  return (
    <Card className="glass-card border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">Seu desempenho hoje</span>
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <Target className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold">{stats.totalPalpites}</div>
            <div className="text-[10px] text-muted-foreground">Palpites</div>
          </div>
          <div className="text-center">
            <BarChart3 className="w-4 h-4 text-secondary mx-auto mb-1" />
            <div className="text-lg font-bold">{stats.accuracyPct}%</div>
            <div className="text-[10px] text-muted-foreground">Acerto</div>
          </div>
          <div className="text-center">
            <Trophy className="w-4 h-4 text-accent mx-auto mb-1" />
            <div className="text-lg font-bold">Nv.{stats.level}</div>
            <div className="text-[10px] text-muted-foreground">{stats.totalXp} XP</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
