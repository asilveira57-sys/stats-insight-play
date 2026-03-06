import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  Search,
  Play,
  RefreshCw,
  ExternalLink,
  Video,
  Clock
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function HubHighlights() {
  const [search, setSearch] = useState("");

  const { data: highlights, isLoading, refetch } = useQuery({
    queryKey: ['hub-highlights', search],
    queryFn: async () => {
      let query = supabase
        .from('highlights')
        .select(`
          *,
          partida:partidas(
            id, data, hora,
            time_casa:times!partidas_time_casa_id_fkey(nome),
            time_fora:times!partidas_time_fora_id_fkey(nome)
          )
        `)
        .order('published_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const syncHighlightsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-highlights');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Highlights sincronizados!');
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar highlights');
      console.error(error);
    }
  });

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
            <h1 className="text-2xl font-display font-bold">Highlights</h1>
            <p className="text-muted-foreground text-sm">
              Melhores momentos e gols das partidas
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => syncHighlightsMutation.mutate()}
            disabled={syncHighlightsMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncHighlightsMutation.isPending ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por time ou título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-muted/50 border-border"
          />
        </div>

        {/* Highlights Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights?.map((highlight) => (
            <Card key={highlight.id} className="glass-card hover-glow overflow-hidden group">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                {highlight.thumbnail_url ? (
                  <img 
                    src={highlight.thumbnail_url} 
                    alt={highlight.title || 'Highlight'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a 
                    href={highlight.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Play className="w-8 h-8 text-primary-foreground ml-1" />
                  </a>
                </div>
                {/* Duration */}
                {highlight.duration && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white">
                    {Math.floor(highlight.duration / 60)}:{String(highlight.duration % 60).padStart(2, '0')}
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {highlight.title || 'Sem título'}
                </h3>
                
                {/* Match info */}
                {highlight.partida && (
                  <div className="text-sm text-muted-foreground mb-2">
                    {(highlight.partida as any).time_casa?.nome} vs {(highlight.partida as any).time_fora?.nome}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {highlight.published_at && format(
                      new Date(highlight.published_at), 
                      "dd/MM HH:mm", 
                      { locale: ptBR }
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {highlight.provider}
                  </Badge>
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
        {!isLoading && (!highlights || highlights.length === 0) && (
          <Card className="glass-card p-12 text-center">
            <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum highlight encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Clique em "Sincronizar" para buscar os últimos vídeos
            </p>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => syncHighlightsMutation.mutate()}
              disabled={syncHighlightsMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncHighlightsMutation.isPending ? 'animate-spin' : ''}`} />
              Buscar Highlights
            </Button>
          </Card>
        )}
      </div>
    </Layout>
  );
}
