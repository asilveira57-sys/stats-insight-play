import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { MatchCard } from "@/components/cards/MatchCard";
import { Button } from "@/components/ui/button";
import { leagues, upcomingMatches, standings } from "@/data/mockData";
import { Calendar, Filter, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Resultados() {
  const [selectedLeague, setSelectedLeague] = useState("PL");
  const [selectedDate, setSelectedDate] = useState("today");

  const dates = [
    { id: "yesterday", label: "Ontem" },
    { id: "today", label: "Hoje" },
    { id: "tomorrow", label: "Amanhã" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            <span className="gradient-text">Resultados</span>
          </h1>
          <p className="text-muted-foreground">
            Acompanhe os resultados das principais ligas do mundo
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* League Filter */}
          <div className="flex-1">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Liga</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {leagues.map((league) => (
                  <button
                    key={league.id}
                    onClick={() => setSelectedLeague(league.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedLeague === league.id
                        ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-5 h-5 object-contain"
                    />
                    <span className="hidden sm:inline">{league.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date Filter */}
          <div className="lg:w-auto">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Data</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1">
                  {dates.map((date) => (
                    <button
                      key={date.id}
                      onClick={() => setSelectedDate(date.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        selectedDate === date.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      {date.label}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Matches */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold">Jogos do Dia</h2>
              <Button variant="ghost" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} {...match} />
              ))}
            </div>
          </div>

          {/* Standings */}
          <div className="lg:col-span-1">
            <div className="glass-card p-4">
              <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Tabela - Premier League
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/50">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Time</th>
                      <th className="text-center py-2 px-2">J</th>
                      <th className="text-center py-2 px-2">SG</th>
                      <th className="text-center py-2 px-2 font-bold">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, index) => (
                      <tr 
                        key={team.position}
                        className={cn(
                          "border-b border-border/30 hover:bg-muted/50 transition-colors",
                          index < 4 && "border-l-2 border-l-secondary",
                          index >= 4 && index < 6 && "border-l-2 border-l-primary"
                        )}
                      >
                        <td className="py-3 px-2 font-medium">{team.position}</td>
                        <td className="py-3 px-2 font-medium truncate max-w-[120px]">
                          {team.team}
                        </td>
                        <td className="py-3 px-2 text-center text-muted-foreground">
                          {team.played}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={cn(
                            team.gd > 0 ? "text-secondary" : team.gd < 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {team.gd > 0 ? `+${team.gd}` : team.gd}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-primary">
                          {team.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button variant="ghost" className="w-full mt-4">
                Ver tabela completa
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
