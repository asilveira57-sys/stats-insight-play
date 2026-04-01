import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Eye, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { TeamBadge } from "@/components/ui/TeamBadge";

interface Match {
  id: string;
  hora: string | null;
  status: string;
  gols_casa: number | null;
  gols_fora: number | null;
  time_casa: { id: string; nome: string; slug: string | null; pais: string | null; cores: any; short_code: string | null } | null;
  time_fora: { id: string; nome: string; slug: string | null; pais: string | null; cores: any; short_code: string | null } | null;
  liga: { id: string; nome: string; logo_url: string | null; pais: string | null; slug: string | null } | null;
}

export function DashboardTodayMatches({ matches }: { matches: Match[] }) {
  if (!matches || matches.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Jogos de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Nenhum jogo agendado para hoje
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by league
  const grouped: Record<string, { league: Match['liga']; matches: Match[] }> = {};
  matches.forEach(m => {
    const key = m.liga?.id || 'unknown';
    if (!grouped[key]) grouped[key] = { league: m.liga, matches: [] };
    grouped[key].matches.push(m);
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Jogos de Hoje
          <Badge variant="secondary" className="ml-2">{matches.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(grouped).map(({ league, matches: leagueMatches }) => (
          <div key={league?.id || 'unknown'}>
            <div className="flex items-center gap-2 mb-3">
              {league?.logo_url && (
                <img src={league.logo_url} alt="" className="w-5 h-5 object-contain" />
              )}
              <span className="text-sm font-medium text-muted-foreground">{league?.nome || 'Liga'}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {league?.pais === 'Brazil' || league?.pais === 'Brasil' ? '🇧🇷' : '🌍'}
              </Badge>
            </div>
            <div className="space-y-2">
              {leagueMatches.map(match => (
                <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">
                      {match.hora?.substring(0, 5) || '—'}
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TeamName team={match.time_casa} />
                      <span className="text-xs text-muted-foreground font-bold shrink-0">vs</span>
                      <TeamName team={match.time_fora} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Link to={`/palpites`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Target className="w-3 h-3 mr-1" />
                        Palpitar
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TeamName({ team }: { team: Match['time_casa'] }) {
  const cores = String(team?.cores || '');
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <TeamBadge name={team?.short_code || team?.nome || '?'} size="sm" primaryColor={cores.split(',')[0]?.trim() || undefined} secondaryColor={cores.split(',')[1]?.trim() || undefined} />
      <span className="text-sm truncate">{team?.nome || '?'}</span>
    </div>
  );
}
