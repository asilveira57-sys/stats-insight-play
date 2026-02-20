import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRankings, xpForLevel, xpProgress } from "@/hooks/useGamification";
import { Link } from "react-router-dom";
import { Trophy, Search, Flame, Medal, Crown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-muted text-muted-foreground',
  rare: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  epic: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  legendary: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

function RankingTable({ period }: { period: string }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const pageSize = 50;

  const { data: rankings, isLoading } = useRankings(period, page, pageSize, search);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por username..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !rankings?.length ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum usuário encontrado.</div>
      ) : (
        <div className="space-y-2">
          {rankings.map((entry: any) => {
            const progress = xpProgress(entry.total_xp || 0, entry.level || 1);
            const pos = entry.rank_position;
            return (
              <Card key={entry.user_id} className={pos <= 3 ? 'border-primary/30 bg-primary/5' : ''}>
                <CardContent className="py-3 px-4 flex items-center gap-4">
                  {/* Position */}
                  <div className="w-10 text-center font-bold text-lg shrink-0">
                    {pos === 1 && <Crown className="w-6 h-6 text-amber-400 mx-auto" />}
                    {pos === 2 && <Medal className="w-6 h-6 text-gray-400 mx-auto" />}
                    {pos === 3 && <Medal className="w-6 h-6 text-amber-600 mx-auto" />}
                    {pos > 3 && <span className="text-muted-foreground">{pos}</span>}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-10 h-10 shrink-0">
                    {entry.avatar_url && <AvatarImage src={entry.avatar_url} />}
                    <AvatarFallback>{(entry.nickname || entry.nome || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={entry.nickname ? `/usuario/@${entry.nickname}` : '#'} className="font-medium truncate hover:text-primary transition-colors">
                        {entry.nickname || entry.nome || 'Anônimo'}
                      </Link>
                      <Badge variant="outline" className="text-xs shrink-0">Nv. {entry.level || 1}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{entry.total_xp || 0} XP</span>
                      {entry.current_streak_days > 0 && (
                        <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-400" />{entry.current_streak_days}d</span>
                      )}
                      {entry.accuracy_pct > 0 && <span>{entry.accuracy_pct}% precisão</span>}
                    </div>
                  </div>

                  {/* XP Bar */}
                  <div className="hidden md:block w-32 shrink-0">
                    <Progress value={progress.percent} className="h-2" />
                    <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{progress.current}/{progress.needed}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>
        <span className="text-sm text-muted-foreground">Página {page + 1}</span>
        <Button variant="outline" size="sm" disabled={!rankings || rankings.length < pageSize} onClick={() => setPage(p => p + 1)}>
          Próxima <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default function Ranking() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Ranking</h1>
            <p className="text-muted-foreground">Os melhores palpiteiros do StatBall</p>
          </div>
        </div>

        <Tabs defaultValue="all_time">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="daily">Hoje</TabsTrigger>
            <TabsTrigger value="weekly">Semana</TabsTrigger>
            <TabsTrigger value="monthly">Mês</TabsTrigger>
            <TabsTrigger value="all_time">Geral</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-6"><RankingTable period="daily" /></TabsContent>
          <TabsContent value="weekly" className="mt-6"><RankingTable period="weekly" /></TabsContent>
          <TabsContent value="monthly" className="mt-6"><RankingTable period="monthly" /></TabsContent>
          <TabsContent value="all_time" className="mt-6"><RankingTable period="all_time" /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
