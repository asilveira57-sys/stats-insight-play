import { TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictionCardProps {
  homeTeam: {
    name: string;
    logo: string;
    probability: number;
    strength: number;
  };
  awayTeam: {
    name: string;
    logo: string;
    probability: number;
    strength: number;
  };
  drawProbability: number;
  predictedScore: string;
  confidence: "high" | "medium" | "low";
  league: string;
  date: string;
  time: string;
  onClick?: () => void;
}

export function PredictionCard({
  homeTeam,
  awayTeam,
  drawProbability,
  predictedScore,
  confidence,
  league,
  date,
  time,
  onClick,
}: PredictionCardProps) {
  const confidenceColors = {
    high: "text-secondary bg-secondary/10 border-secondary/30",
    medium: "text-primary bg-primary/10 border-primary/30",
    low: "text-neon-orange bg-neon-orange/10 border-neon-orange/30",
  };

  const confidenceLabels = {
    high: "Alta Confiança",
    medium: "Média Confiança",
    low: "Baixa Confiança",
  };

  return (
    <div
      className="glass-card p-5 cursor-pointer hover-glow group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="league-badge text-xs">{league}</span>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
          confidenceColors[confidence]
        )}>
          <Zap className="w-3 h-3" />
          {confidenceLabels[confidence]}
        </span>
      </div>

      {/* Teams & Score */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <img
              src={homeTeam.logo}
              alt={homeTeam.name}
              className="w-10 h-10 object-contain"
            />
          </div>
          <span className="text-sm font-medium text-center line-clamp-1">
            {homeTeam.name}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-2xl font-display font-bold gradient-text">
            {predictedScore}
          </span>
          <span className="text-xs text-muted-foreground">Placar Estimado</span>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <img
              src={awayTeam.logo}
              alt={awayTeam.name}
              className="w-10 h-10 object-contain"
            />
          </div>
          <span className="text-sm font-medium text-center line-clamp-1">
            {awayTeam.name}
          </span>
        </div>
      </div>

      {/* Probabilities */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Vitória Casa</span>
            <span className="font-semibold text-secondary">{homeTeam.probability}%</span>
          </div>
          <div className="probability-bar">
            <div
              className="probability-fill bg-gradient-to-r from-secondary to-secondary/50"
              style={{ width: `${homeTeam.probability}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Empate</span>
            <span className="font-semibold text-muted-foreground">{drawProbability}%</span>
          </div>
          <div className="probability-bar">
            <div
              className="probability-fill bg-muted-foreground/50"
              style={{ width: `${drawProbability}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Vitória Fora</span>
            <span className="font-semibold text-primary">{awayTeam.probability}%</span>
          </div>
          <div className="probability-bar">
            <div
              className="probability-fill bg-gradient-to-r from-primary to-primary/50"
              style={{ width: `${awayTeam.probability}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
        <span>{date}</span>
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-secondary" />
          {time}
        </span>
      </div>
    </div>
  );
}
