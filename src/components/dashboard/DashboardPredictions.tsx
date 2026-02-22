import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Target, Users, Brain, TrendingUp, Flame } from "lucide-react";
import { useState } from "react";
import { useGeneralPredictionStats, useAIPredictionStats } from "@/hooks/useDashboardData";

interface UserStats {
  totalPalpites: number;
  totalAcertos: number;
  acertosPlacarExato: number;
  pontuacaoTotal: number;
  accuracyPct: number;
  streak: number;
  totalXp: number;
  level: number;
}

export function DashboardPredictions({ userStats }: { userStats: UserStats | null }) {
  const [period, setPeriod] = useState<'1d' | '7d' | '30d'>('7d');
  const { data: generalStats } = useGeneralPredictionStats(period);
  const { data: aiStats } = useAIPredictionStats();

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Palpites
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="user" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="user" className="text-xs">Meus</TabsTrigger>
            <TabsTrigger value="general" className="text-xs">Geral</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">I.A</TabsTrigger>
          </TabsList>

          <TabsContent value="user">
            {userStats ? (
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Total Palpites" value={userStats.totalPalpites} />
                <StatBox label="Taxa de Acerto" value={`${userStats.accuracyPct}%`} highlight />
                <StatBox label="Placar Exato" value={userStats.acertosPlacarExato} />
                <StatBox label="Pontuação" value={userStats.pontuacaoTotal} />
                <div className="col-span-2 flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-primary" />
                    <span className="text-sm">Streak</span>
                  </div>
                  <span className="font-bold text-primary">{userStats.streak} dias</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Faça login para ver seus palpites
              </div>
            )}
          </TabsContent>

          <TabsContent value="general">
            <div className="flex gap-1 mb-3">
              {(['1d', '7d', '30d'] as const).map(p => (
                <Badge
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setPeriod(p)}
                >
                  {p === '1d' ? 'Hoje' : p === '7d' ? '7 dias' : '30 dias'}
                </Badge>
              ))}
            </div>
            {generalStats ? (
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Total Analisadas" value={generalStats.total} />
                <StatBox label="Acerto 1X2 (IA)" value={`${generalStats.pctResultado}%`} highlight />
                <StatBox label="Placar Exato (IA)" value={`${generalStats.pctPlacar}%`} />
                <StatBox label="Palpites Usuários" value={generalStats.totalUsuarios} />
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">Carregando...</div>
            )}
          </TabsContent>

          <TabsContent value="ai">
            {aiStats ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Performance da I.A</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Total Analisadas" value={aiStats.total} />
                  <StatBox label="Acerto 1X2" value={`${aiStats.pctResultado}%`} highlight />
                  <StatBox label="Placar Exato" value={`${aiStats.pctPlacar}%`} />
                  <StatBox label="Base de Dados" value={`${aiStats.total} partidas`} />
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">Carregando...</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className={`text-lg font-bold font-display ${highlight ? 'text-primary' : ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
