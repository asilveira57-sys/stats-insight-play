import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Trophy, User } from "lucide-react";
import type { SearchResultRow } from "@/hooks/useIntelligentSearch";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { LeagueLogo } from "@/components/ui/LeagueLogo";

function hrefFor(r: SearchResultRow): string {
  if (r.entity_type === "team" && r.extra?.slug) return `/times/${r.extra.slug}`;
  if (r.entity_type === "league" && r.extra?.slug) return `/campeonatos/${r.extra.slug}`;
  return `/pesquisa?q=${encodeURIComponent(r.name)}`;
}

export function EntityResultCard({ result }: { result: SearchResultRow }) {
  const Icon = result.entity_type === "team" ? Shield : result.entity_type === "league" ? Trophy : User;
  const label =
    result.entity_type === "team" ? "Time" :
    result.entity_type === "league" ? "Campeonato" : "Jogador";

  return (
    <Link to={hrefFor(result)} className="block">
      <Card className="hover:border-primary/50 transition-colors h-full">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="shrink-0">
            {result.entity_type === "team" ? (
              <TeamBadge
                name={result.name}
                primaryColor={result.extra?.cores?.primary}
                secondaryColor={result.extra?.cores?.secondary}
                size="md"
              />
            ) : result.entity_type === "league" ? (
              <LeagueLogo logoUrl={result.extra?.logo_url} name={result.name} country={result.extra?.pais} size="md" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{result.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px]">
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Badge>
              {result.extra?.pais && <span className="text-xs text-muted-foreground">{result.extra.pais}</span>}
              {result.extra?.position && <span className="text-xs text-muted-foreground">{result.extra.position}</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
