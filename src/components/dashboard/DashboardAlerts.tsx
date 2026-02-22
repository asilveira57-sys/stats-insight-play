import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface AlertData {
  noScore: number;
  noApiId: number;
  noSlug: number;
  failedSyncs: number;
}

export function DashboardAlerts({ data }: { data: AlertData }) {
  const alerts = [
    { label: 'Partidas sem placar (encerradas)', count: data.noScore, critical: data.noScore > 0 },
    { label: 'Partidas sem API ID', count: data.noApiId, critical: false },
    { label: 'Times sem slug', count: data.noSlug, critical: data.noSlug > 10 },
    { label: 'Falhas de sync (24h)', count: data.failedSyncs, critical: data.failedSyncs > 0 },
  ];

  const hasCritical = alerts.some(a => a.critical);

  return (
    <Card className={`glass-card ${hasCritical ? 'border-destructive/30' : 'border-secondary/30'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          {hasCritical ? (
            <AlertCircle className="w-5 h-5 text-destructive" />
          ) : (
            <CheckCircle className="w-5 h-5 text-secondary" />
          )}
          Integridade dos Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg border ${
            alert.critical ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/20 border-border/50'
          }`}>
            <div className="flex items-center gap-2">
            {alert.critical ? (
                <XCircle className="w-4 h-4 text-destructive shrink-0" />
              ) : alert.count > 0 ? (
                <AlertTriangle className="w-4 h-4 text-accent shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-secondary shrink-0" />
              )}
              <span className="text-sm">{alert.label}</span>
            </div>
            <span className={`text-sm font-bold ${alert.critical ? 'text-destructive' : ''}`}>
              {alert.count}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
