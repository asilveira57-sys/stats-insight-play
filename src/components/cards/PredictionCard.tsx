import { TrendingUp, Zap, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamBadge } from "@/components/ui/TeamBadge";

interface PredictionCardProps {
  homeTeam: {
    name: string;
    probability: number;
    strength: number;
    primaryColor?: string;
    secondaryColor?: string;
  };
  awayTeam: {
    name: string;
    probability: number;
    strength: number;
    primaryColor?: string;
    secondaryColor?: string;
  };
  drawProbability: number;
  predictedScore: { home: number; away: number };
  confidence: "high" | "medium" | "low";
  league: string;
  date: string;
  time: string;
  hasPalpite?: boolean;
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
  hasPalpite = false,
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
      className={cn(
        "glass-card p-5 cursor-pointer hover-glow group relative",
        hasPalpite && "ring-2 ring-secondary/50"
      )}
      onClick={onClick}
    >
      {/* Palpite Badge */}
      {hasPalpite && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Palpite Feito
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="league-badge text-xs">{league}</span>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
          confidenceColors[confidence],
          hasPalpite && "mr-24"
        )}>
          <Zap className="w-3 h-3" />
          {confidenceLabels[confidence]}
        </span>
      </div>

      {/* Teams & Score */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex-1 flex flex-col items-center gap-2">
          <TeamBadge
            name={homeTeam.name}
            primaryColor={homeTeam.primaryColor}
            secondaryColor={homeTeam.secondaryColor}
            size="lg"
          />
          <span className="text-sm font-medium text-center line-clamp-1">
            {homeTeam.name}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-2xl font-display font-bold gradient-text">
            {predictedScore.home} - {predictedScore.away}
          </span>
          <span className="text-xs text-muted-foreground">Placar Estimado</span>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2">
          <TeamBadge
            name={awayTeam.name}
            primaryColor={awayTeam.primaryColor}
            secondaryColor={awayTeam.secondaryColor}
            size="lg"
          />
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
