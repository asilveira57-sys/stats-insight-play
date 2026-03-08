import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoundGroup, SeasonMatch } from "@/hooks/useSeasonMatches";
import { Trophy } from "lucide-react";

interface MatchCardProps {
  match: SeasonMatch;
  showDate?: boolean;
}

function MatchCard({ match, showDate = true }: MatchCardProps) {
  const isFinished = match.status === "finished";
  const homeWon = isFinished && (match.golsCasa ?? 0) > (match.golsFora ?? 0);
  const awayWon = isFinished && (match.golsFora ?? 0) > (match.golsCasa ?? 0);

  return (
    <div className="border rounded-lg p-3 bg-card hover:border-primary/50 transition-colors">
      {showDate && (
        <div className="text-xs text-muted-foreground mb-2">
          {new Date(match.data).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </div>
      )}
      
      <div className="space-y-1">
        <div className={`flex items-center justify-between ${homeWon ? "font-bold" : ""}`}>
          <Link 
            to={match.timeCasaSlug ? `/times/${match.timeCasaSlug}` : "#"}
            className="text-sm hover:text-primary transition-colors truncate flex-1"
          >
            {match.timeCasa}
          </Link>
          <span className="font-mono ml-2">
            {isFinished ? match.golsCasa : "-"}
          </span>
        </div>
        
        <div className={`flex items-center justify-between ${awayWon ? "font-bold" : ""}`}>
          <Link 
            to={match.timeForaSlug ? `/times/${match.timeForaSlug}` : "#"}
            className="text-sm hover:text-primary transition-colors truncate flex-1"
          >
            {match.timeFora}
          </Link>
          <span className="font-mono ml-2">
            {isFinished ? match.golsFora : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

interface PhaseColumnProps {
  group: RoundGroup;
  isLast?: boolean;
}

function PhaseColumn({ group, isLast }: PhaseColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-2">
        {isLast && <Trophy className="w-4 h-4 text-primary" />}
        <h4 className="font-semibold text-sm">{group.label}</h4>
        <Badge variant="outline" className="text-xs">
          {group.matches.length}
        </Badge>
      </div>
      
      <div className="space-y-3">
        {group.matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

interface TournamentBracketProps {
  roundGroups: RoundGroup[];
  teamFilter?: string;
}

export function TournamentBracket({ roundGroups, teamFilter }: TournamentBracketProps) {
  const filteredGroups = roundGroups
    .map((group) => ({
      ...group,
      matches: teamFilter
        ? group.matches.filter(
            (m) =>
              m.timeCasa.toLowerCase().includes(teamFilter.toLowerCase()) ||
              m.timeFora.toLowerCase().includes(teamFilter.toLowerCase())
          )
        : group.matches,
    }))
    .filter((group) => group.matches.length > 0);

  if (filteredGroups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum jogo encontrado para o filtro selecionado.
      </div>
    );
  }

  // Sort by rodada descending (Final first on mobile, last on desktop)
  const sortedGroups = [...filteredGroups].sort((a, b) => b.rodada - a.rodada);
  
  // For desktop: reverse to show progression left to right
  const desktopGroups = [...sortedGroups].reverse();

  return (
    <div className="space-y-6">
      {/* Desktop: Horizontal bracket view */}
      <div className="hidden md:block overflow-x-auto">
        <div className="flex gap-6 min-w-max p-4">
          {desktopGroups.map((group, idx) => (
            <div 
              key={group.rodada}
              className="relative"
            >
              <PhaseColumn 
                group={group} 
                isLast={idx === desktopGroups.length - 1} 
              />
              
              {/* Connector lines */}
              {idx < desktopGroups.length - 1 && (
                <div className="absolute top-1/2 -right-3 w-6 h-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Vertical stack, Final first */}
      <div className="md:hidden space-y-6">
        {sortedGroups.map((group, idx) => (
          <Card key={group.rodada}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {idx === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                {group.label}
                <Badge variant="outline" className="ml-auto">
                  {group.matches.length} jogos
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
