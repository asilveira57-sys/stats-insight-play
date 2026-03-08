import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSeasonMatches } from "@/hooks/useSeasonMatches";
import { RoundByRoundView } from "./RoundByRoundView";
import { TournamentBracket } from "./TournamentBracket";
import { Search, Calendar, Target, Trophy } from "lucide-react";

interface SeasonDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
  leagueName: string;
  tipoPrincipal: string | null;
  year: number;
}

export function SeasonDetailModal({
  open,
  onOpenChange,
  leagueId,
  leagueName,
  tipoPrincipal,
  year,
}: SeasonDetailModalProps) {
  const [teamFilter, setTeamFilter] = useState("");
  
  const { data, isLoading } = useSeasonMatches(
    open ? leagueId : null,
    open ? year : null,
    tipoPrincipal
  );

  const finishedMatches = data?.matches.filter((m) => m.status === "finished").length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary" />
            {leagueName} {year}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Stats Bar */}
            <div className="flex flex-wrap gap-4 py-4 border-b">
              <Badge variant="secondary" className="gap-1">
                <Calendar className="w-3 h-3" />
                {data.totalMatches} jogos
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Target className="w-3 h-3" />
                {data.totalGoals} gols
              </Badge>
              <Badge variant="outline" className="gap-1">
                {finishedMatches} finalizados
              </Badge>
              <Badge variant="outline">
                Média: {data.totalMatches > 0 ? (data.totalGoals / data.totalMatches).toFixed(2) : "0"} gols/jogo
              </Badge>
            </div>

            {/* Search */}
            <div className="relative py-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por time..."
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-2">
              {data.isKnockout ? (
                <Tabs defaultValue="bracket" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="bracket">Chaveamento</TabsTrigger>
                    <TabsTrigger value="list">Lista por Fase</TabsTrigger>
                  </TabsList>
                  <TabsContent value="bracket">
                    <TournamentBracket
                      roundGroups={data.roundGroups}
                      teamFilter={teamFilter}
                    />
                  </TabsContent>
                  <TabsContent value="list">
                    <RoundByRoundView
                      roundGroups={data.roundGroups}
                      teamFilter={teamFilter}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                <RoundByRoundView
                  roundGroups={data.roundGroups}
                  teamFilter={teamFilter}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado disponível para esta temporada.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
