import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";

interface LiveMatch {
  id: string;
  gols_casa: number | null;
  gols_fora: number | null;
  time_casa: { nome: string; escudo_url: string | null } | null;
  time_fora: { nome: string; escudo_url: string | null } | null;
  liga: { nome: string; logo_url: string | null } | null;
}

export function DashboardLiveMatches({ matches }: { matches: LiveMatch[] }) {
  if (!matches || matches.length === 0) {
    return (
      <Card className="glass-card border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Activity className="w-5 h-5 text-muted-foreground" />
            Ao Vivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhum jogo ao vivo agora
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Activity className="w-5 h-5 text-destructive animate-pulse" />
          Ao Vivo
          <Badge variant="destructive" className="ml-2 animate-pulse">{matches.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map(match => (
          <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {match.time_casa?.escudo_url && <img src={match.time_casa.escudo_url} alt="" className="w-5 h-5 object-contain shrink-0" />}
                <span className="text-sm truncate">{match.time_casa?.nome}</span>
              </div>
              <div className="text-lg font-bold font-display text-center shrink-0 min-w-[60px]">
                {match.gols_casa ?? 0} - {match.gols_fora ?? 0}
              </div>
              <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                <span className="text-sm truncate text-right">{match.time_fora?.nome}</span>
                {match.time_fora?.escudo_url && <img src={match.time_fora.escudo_url} alt="" className="w-5 h-5 object-contain shrink-0" />}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
