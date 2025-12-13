import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  Search,
  Users,
  Globe,
  Play,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { TeamBadge } from "@/components/ui/TeamBadge";

export default function HubTeams() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 24;

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['hub-teams', search, page],
    queryFn: async () => {
      let query = supabase
        .from('times')
        .select('*', { count: 'exact' })
        .order('nome')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (search) {
        query = query.ilike('nome', `%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { teams: data, total: count || 0 };
    }
  });

  // Fetch match stats per team
  const { data: teamStats } = useQuery({
    queryKey: ['team-stats', teamsData?.teams?.map(t => t.id)],
    queryFn: async () => {
      if (!teamsData?.teams?.length) return {};

      const teamIds = teamsData.teams.map(t => t.id);
      const { data, error } = await supabase
        .from('partidas')
        .select('time_casa_id, time_fora_id, gols_casa, gols_fora, status')
        .or(`time_casa_id.in.(${teamIds.join(',')}),time_fora_id.in.(${teamIds.join(',')})`)
        .eq('status', 'finished');
      
      if (error) throw error;

      const stats: Record<string, { played: number; won: number; drawn: number; lost: number; gf: number; ga: number }> = {};
      
      teamIds.forEach(id => {
        stats[id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
      });

      data?.forEach(match => {
        if (match.gols_casa === null || match.gols_fora === null) return;
        
        // Home team stats
        if (match.time_casa_id && stats[match.time_casa_id]) {
          stats[match.time_casa_id].played++;
          stats[match.time_casa_id].gf += match.gols_casa;
          stats[match.time_casa_id].ga += match.gols_fora;
          if (match.gols_casa > match.gols_fora) stats[match.time_casa_id].won++;
          else if (match.gols_casa < match.gols_fora) stats[match.time_casa_id].lost++;
          else stats[match.time_casa_id].drawn++;
        }
        
        // Away team stats
        if (match.time_fora_id && stats[match.time_fora_id]) {
          stats[match.time_fora_id].played++;
          stats[match.time_fora_id].gf += match.gols_fora;
          stats[match.time_fora_id].ga += match.gols_casa;
          if (match.gols_fora > match.gols_casa) stats[match.time_fora_id].won++;
          else if (match.gols_fora < match.gols_casa) stats[match.time_fora_id].lost++;
          else stats[match.time_fora_id].drawn++;
        }
      });

      return stats;
    },
    enabled: !!teamsData?.teams?.length
  });

  const totalPages = Math.ceil((teamsData?.total || 0) / pageSize);

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
            <h1 className="text-2xl font-display font-bold">Times</h1>
            <p className="text-muted-foreground text-sm">
              {teamsData?.total || 0} times cadastrados
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar time..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10 bg-muted/50 border-border"
          />
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {teamsData?.teams?.map((team) => {
            const stats = teamStats?.[team.id];
            const winRate = stats && stats.played > 0 
              ? Math.round((stats.won / stats.played) * 100) 
              : 0;
            
            return (
              <Card key={team.id} className="glass-card hover-glow cursor-pointer group">
                <CardContent className="p-4 text-center">
                  <TeamBadge
                    teamName={team.nome}
                    colors={team.cores as any}
                    size="lg"
                    className="mx-auto mb-3"
                  />
                  <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {team.nome}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    {team.pais || 'País desconhecido'}
                  </div>

                  {stats && stats.played > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="text-secondary">{stats.won}V</span>
                        <span className="text-muted-foreground">{stats.drawn}E</span>
                        <span className="text-destructive">{stats.lost}D</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        {winRate >= 50 ? (
                          <TrendingUp className="w-3 h-3 text-secondary" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-destructive" />
                        )}
                        <span className="text-xs font-medium">{winRate}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!teamsData?.teams || teamsData.teams.length === 0) && (
          <Card className="glass-card p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum time encontrado</h3>
            <p className="text-muted-foreground">
              {search ? 'Tente outro termo de busca' : 'Sincronize dados para ver times'}
            </p>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
