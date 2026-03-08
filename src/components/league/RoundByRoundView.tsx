import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { RoundGroup, SeasonMatch } from "@/hooks/useSeasonMatches";
import { Calendar } from "lucide-react";

interface MatchRowProps {
  match: SeasonMatch;
}

function MatchRow({ match }: MatchRowProps) {
  const isFinished = match.status === "finished";
  
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
      <Link 
        to={match.timeCasaSlug ? `/times/${match.timeCasaSlug}` : "#"}
        className="flex-1 text-right text-sm font-medium hover:text-primary transition-colors truncate pr-2"
      >
        {match.timeCasa}
      </Link>
      
      <div className="flex items-center gap-2 min-w-[80px] justify-center">
        {isFinished ? (
          <span className="font-mono font-bold text-lg">
            {match.golsCasa} - {match.golsFora}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {match.hora?.slice(0, 5) || "A definir"}
          </span>
        )}
      </div>
      
      <Link 
        to={match.timeForaSlug ? `/times/${match.timeForaSlug}` : "#"}
        className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors truncate pl-2"
      >
        {match.timeFora}
      </Link>
    </div>
  );
}

interface RoundByRoundViewProps {
  roundGroups: RoundGroup[];
  teamFilter?: string;
}

export function RoundByRoundView({ roundGroups, teamFilter }: RoundByRoundViewProps) {
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

  // Default open first 3 rounds
  const defaultOpen = filteredGroups.slice(0, 3).map((g) => `round-${g.rodada}`);

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
      {filteredGroups.map((group) => (
        <AccordionItem
          key={group.rodada}
          value={`round-${group.rodada}`}
          className="border rounded-lg bg-card"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3 w-full">
              <span className="font-semibold">{group.label}</span>
              <Badge variant="secondary" className="ml-auto mr-2">
                {group.matches.length} jogos
              </Badge>
              {group.dateRange && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {group.dateRange}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Card>
              <CardContent className="p-2 divide-y divide-border">
                {group.matches.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
