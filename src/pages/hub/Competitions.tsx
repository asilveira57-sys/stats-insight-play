import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  Search,
  Trophy,
  Globe,
  Calendar,
  Users,
  Play,
  RefreshCw
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function HubCompetitions() {
  const [search, setSearch] = useState("");

  const { data: competitions, isLoading } = useQuery({
    queryKey: ['hub-competitions', search],
    queryFn: async () => {
      let query = supabase
        .from('ligas')
        .select('*')
        .order('nome');
      
      if (search) {
        query = query.ilike('nome', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch match counts per league
  const { data: matchCounts } = useQuery({
    queryKey: ['competition-match-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidas')
        .select('liga_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(match => {
        if (match.liga_id) {
          counts[match.liga_id] = (counts[match.liga_id] || 0) + 1;
        }
      });
      return counts;
    }
  });

  // Fetch team counts per league
  const { data: teamCounts } = useQuery({
    queryKey: ['competition-team-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partidas')
        .select('liga_id, time_casa_id, time_fora_id');
      if (error) throw error;
      
      const teamsByLeague: Record<string, Set<string>> = {};
      data?.forEach(match => {
        if (match.liga_id) {
          if (!teamsByLeague[match.liga_id]) {
            teamsByLeague[match.liga_id] = new Set();
          }
          if (match.time_casa_id) teamsByLeague[match.liga_id].add(match.time_casa_id);
          if (match.time_fora_id) teamsByLeague[match.liga_id].add(match.time_fora_id);
        }
      });
      
      const counts: Record<string, number> = {};
      Object.entries(teamsByLeague).forEach(([leagueId, teams]) => {
        counts[leagueId] = teams.size;
      });
      return counts;
    }
  });

  const getCountryFlag = (country: string | null) => {
    const flags: Record<string, string> = {
      'Brazil': '🇧🇷',
      'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'Spain': '🇪🇸',
      'Germany': '🇩🇪',
      'Italy': '🇮🇹',
      'France': '🇫🇷',
      'Europe': '🇪🇺',
      'South America': '🌎',
    };
    return flags[country || ''] || '🌍';
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/hub">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Competições</h1>
            <p className="text-muted-foreground text-sm">
              {competitions?.length || 0} competições cadastradas
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar competição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-muted/50 border-border"
          />
        </div>

        {/* Competitions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions?.map((league) => (
            <Card key={league.id} className="glass-card hover-glow cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon/Logo */}
                  {league.logo_url ? (
                    <img 
                      src={league.logo_url} 
                      alt={league.nome}
                      className="w-14 h-14 object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-2xl shrink-0">
                      {getCountryFlag(league.pais)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-lg truncate group-hover:text-primary transition-colors">
                      {league.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {league.codigo_api || league.api_source}
                      </Badge>
                      <Badge 
                        className={league.ativa 
                          ? "bg-secondary/20 text-secondary border-secondary/30" 
                          : "bg-muted text-muted-foreground"
                        }
                      >
                        {league.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{teamCounts?.[league.id] || 0} times</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        <span>{matchCounts?.[league.id] || 0} jogos</span>
                      </div>
                    </div>

                    {/* Country */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      <span>{league.pais || 'Internacional'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!competitions || competitions.length === 0) && (
          <Card className="glass-card p-12 text-center">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma competição encontrada</h3>
            <p className="text-muted-foreground">
              {search ? 'Tente outro termo de busca' : 'Sincronize dados para ver competições'}
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
