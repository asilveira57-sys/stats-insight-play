import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/cards/StatCard";
import { Button } from "@/components/ui/button";
import { teamStats, leagues } from "@/data/mockData";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Shield,
  Zap,
  Activity,
  Search,
  ChevronRight,
  Home,
  Plane
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Estatisticas() {
  const [selectedTeam, setSelectedTeam] = useState("Manchester City");
  const [compareMode, setCompareMode] = useState(false);

  const formColors = {
    W: "bg-secondary text-secondary-foreground",
    D: "bg-muted text-muted-foreground",
    L: "bg-destructive text-destructive-foreground",
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              <span className="gradient-text">Estatísticas</span>
            </h1>
            <p className="text-muted-foreground">
              Análise detalhada de times e competições
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar time..."
                className="pl-10 pr-4 py-2 rounded-lg bg-muted border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full md:w-64"
              />
            </div>
            <Button 
              variant={compareMode ? "default" : "outline"}
              onClick={() => setCompareMode(!compareMode)}
            >
              <Activity className="w-4 h-4" />
              Comparar
            </Button>
          </div>
        </div>

        {/* Team Header */}
        <div className="glass-card p-6 md:p-8 mb-8 neon-border">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-muted flex items-center justify-center">
              <img
                src={teamStats.logo}
                alt={teamStats.name}
                className="w-20 h-20 md:w-28 md:h-28 object-contain"
              />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
                {teamStats.name}
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <span className="league-badge">
                  <img 
                    src="https://crests.football-data.org/PL.png" 
                    alt="Premier League"
                    className="w-4 h-4"
                  />
                  Premier League
                </span>
                <span className="text-sm text-muted-foreground">
                  1º colocado
                </span>
              </div>
              
              {/* Form */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">Últimos 5:</span>
                {teamStats.form.map((result, index) => (
                  <span
                    key={index}
                    className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold",
                      formColors[result as keyof typeof formColors]
                    )}
                  >
                    {result}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-3xl font-display font-bold text-secondary">
                  {teamStats.overall.wins}
                </p>
                <p className="text-xs text-muted-foreground">Vitórias</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display font-bold text-muted-foreground">
                  {teamStats.overall.draws}
                </p>
                <p className="text-xs text-muted-foreground">Empates</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display font-bold text-destructive">
                  {teamStats.overall.losses}
                </p>
                <p className="text-xs text-muted-foreground">Derrotas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Target}
            label="Gols Marcados"
            value={teamStats.overall.goalsFor}
            trend="up"
            trendValue="+12"
            variant="secondary"
          />
          <StatCard
            icon={Shield}
            label="Gols Sofridos"
            value={teamStats.overall.goalsAgainst}
            trend="down"
            trendValue="-5"
            variant="primary"
          />
          <StatCard
            icon={TrendingUp}
            label="Média Gols/Jogo"
            value={teamStats.avgGoalsScored.toFixed(2)}
            variant="default"
          />
          <StatCard
            icon={Zap}
            label="Clean Sheets"
            value={teamStats.cleanSheets}
            variant="default"
          />
        </div>

        {/* Home vs Away */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Home Stats */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Home className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-display font-bold">Em Casa</h3>
                <p className="text-sm text-muted-foreground">
                  {teamStats.home.matches} jogos disputados
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vitórias</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-secondary rounded-full"
                      style={{ width: `${(teamStats.home.wins / teamStats.home.matches) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold text-secondary">{teamStats.home.wins}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Empates</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-muted-foreground rounded-full"
                      style={{ width: `${(teamStats.home.draws / teamStats.home.matches) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold">{teamStats.home.draws}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Derrotas</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-destructive rounded-full"
                      style={{ width: `${(teamStats.home.losses / teamStats.home.matches) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold text-destructive">{teamStats.home.losses}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gols Marcados</span>
                  <span className="font-bold text-secondary">{teamStats.home.goalsFor}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Gols Sofridos</span>
                  <span className="font-bold text-destructive">{teamStats.home.goalsAgainst}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Away Stats */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold">Fora de Casa</h3>
                <p className="text-sm text-muted-foreground">
                  {teamStats.away.matches} jogos disputados
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vitórias</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-secondary rounded-full"
                      style={{ width: `${(teamStats.away.wins / teamStats.away.matches) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold text-secondary">{teamStats.away.wins}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Empates</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-muted-foreground rounded-full"
                      style={{ width: `${(teamStats.away.draws / teamStats.away.matches) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold">{teamStats.away.draws}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Derrotas</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-destructive rounded-full"
                      style={{ width: `${(teamStats.away.losses / teamStats.away.matches) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold text-destructive">{teamStats.away.losses}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gols Marcados</span>
                  <span className="font-bold text-secondary">{teamStats.away.goalsFor}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Gols Sofridos</span>
                  <span className="font-bold text-destructive">{teamStats.away.goalsAgainst}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Stats */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg">Estatísticas Avançadas</h3>
            <span className="text-xs text-primary px-2 py-1 rounded-full bg-primary/10">
              xG Stats
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-4xl font-display font-bold gradient-text mb-2">
                {teamStats.xG}
              </p>
              <p className="text-sm text-muted-foreground">Expected Goals (xG)</p>
              <p className="text-xs text-secondary mt-1">
                +{(teamStats.overall.goalsFor - teamStats.xG).toFixed(1)} vs Real
              </p>
            </div>

            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-4xl font-display font-bold text-primary mb-2">
                {teamStats.xGA}
              </p>
              <p className="text-sm text-muted-foreground">Expected Goals Against (xGA)</p>
              <p className="text-xs text-secondary mt-1">
                -{(teamStats.xGA - teamStats.overall.goalsAgainst).toFixed(1)} vs Real
              </p>
            </div>

            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-4xl font-display font-bold text-secondary mb-2">
                +{(teamStats.xG - teamStats.xGA).toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">xG Difference</p>
              <p className="text-xs text-muted-foreground mt-1">
                Melhor da liga
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
