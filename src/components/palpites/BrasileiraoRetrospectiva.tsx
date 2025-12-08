import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, TrendingUp, Calendar, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RetrospectiveStats {
  total_partidas: number;
  acertos_resultado: number;
  acertos_placar: number;
  prob_media: number | null;
}

export function BrasileiraoRetrospectiva() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['brasileirao-retrospective'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparativo_resultados')
        .select(`
          sistema_acertou_resultado,
          sistema_acertou_placar,
          sistema_prob_resultado,
          partidas!inner(
            liga_id,
            ligas!inner(codigo_api)
          )
        `)
        .eq('partidas.ligas.codigo_api', 'BSA');

      if (error) throw error;

      const total = data?.length || 0;
      const acertosResultado = data?.filter(d => d.sistema_acertou_resultado).length || 0;
      const acertosPlacar = data?.filter(d => d.sistema_acertou_placar).length || 0;
      const probMedia = data?.reduce((acc, d) => acc + (d.sistema_prob_resultado || 0), 0) / (total || 1);

      return {
        total_partidas: total,
        acertos_resultado: acertosResultado,
        acertos_placar: acertosPlacar,
        prob_media: probMedia
      } as RetrospectiveStats;
    }
  });

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total_partidas === 0) {
    return null;
  }

  const taxaResultado = ((stats.acertos_resultado / stats.total_partidas) * 100).toFixed(1);
  const taxaPlacar = ((stats.acertos_placar / stats.total_partidas) * 100).toFixed(1);

  return (
    <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          Retrospectiva Brasileirão 2024
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Temporada encerrada em 07/12/2025 • Nova temporada em abril 2026
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            icon={<Calendar className="h-4 w-4" />}
            label="Partidas Analisadas"
            value={stats.total_partidas.toString()}
            sublabel="jogos com palpite"
          />
          <StatBox
            icon={<Target className="h-4 w-4" />}
            label="Acertos de Resultado"
            value={stats.acertos_resultado.toString()}
            sublabel={`${taxaResultado}% de precisão`}
            highlight={Number(taxaResultado) >= 40}
          />
          <StatBox
            icon={<Award className="h-4 w-4" />}
            label="Placares Exatos"
            value={stats.acertos_placar.toString()}
            sublabel={`${taxaPlacar}% de precisão`}
            highlight={stats.acertos_placar > 0}
          />
          <StatBox
            icon={<TrendingUp className="h-4 w-4" />}
            label="Confiança Média"
            value={stats.prob_media ? `${stats.prob_media.toFixed(0)}%` : "N/A"}
            sublabel="nas previsões"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ 
  icon, 
  label, 
  value, 
  sublabel, 
  highlight = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div className={`
      p-4 rounded-lg border transition-colors
      ${highlight 
        ? 'bg-primary/10 border-primary/30' 
        : 'bg-background/50 border-border/50'
      }
    `}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}
