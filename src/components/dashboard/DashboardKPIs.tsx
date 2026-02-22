import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Play, Users, Target, Activity, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KPIData {
  leagues: number;
  matches: number;
  teams: number;
  scorers: number;
  liveMatches: number;
  todayMatches: number;
  lastSync: string | null;
}

const kpiConfig = [
  { key: 'leagues', label: 'Campeonatos', icon: Trophy, color: 'text-secondary', bg: 'bg-secondary/15' },
  { key: 'matches', label: 'Partidas', icon: Play, color: 'text-primary', bg: 'bg-primary/15' },
  { key: 'teams', label: 'Times', icon: Users, color: 'text-accent', bg: 'bg-accent/15' },
  { key: 'scorers', label: 'Artilheiros', icon: Target, color: 'text-destructive', bg: 'bg-destructive/15' },
  { key: 'liveMatches', label: 'Ao Vivo', icon: Activity, color: 'text-destructive', bg: 'bg-destructive/15' },
  { key: 'todayMatches', label: 'Jogos Hoje', icon: Clock, color: 'text-primary', bg: 'bg-primary/15' },
] as const;

export function DashboardKPIs({ data }: { data: KPIData }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {kpiConfig.map(({ key, label, icon: Icon, color, bg }) => (
        <Card key={key} className="glass-card hover-glow">
          <CardContent className="p-4 text-center">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-bold font-display">
              {typeof data[key] === 'number' ? data[key].toLocaleString('pt-BR') : 0}
            </div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </CardContent>
        </Card>
      ))}
      <Card className="glass-card hover-glow">
        <CardContent className="p-4 text-center">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2">
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-sm font-bold font-display">
            {data.lastSync 
              ? format(new Date(data.lastSync), "HH:mm", { locale: ptBR })
              : '—'
            }
          </div>
          <div className="text-xs text-muted-foreground">Última Sync</div>
        </CardContent>
      </Card>
    </div>
  );
}
