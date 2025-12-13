import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Database, 
  Settings, 
  RefreshCw, 
  Plus,
  Globe,
  Github,
  Key,
  Clock,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Activity
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function HubSources() {
  const queryClient = useQueryClient();
  const [selectedSource, setSelectedSource] = useState<any>(null);

  const { data: sources, isLoading } = useQuery({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const toggleSourceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('data_sources')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['data-sources'] });
      toast.success(`Fonte ${newStatus === 'active' ? 'ativada' : 'desativada'}`);
    },
    onError: () => {
      toast.error('Erro ao atualizar fonte');
    }
  });

  const getSourceIcon = (type: string) => {
    return type === 'api' ? Globe : Github;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'inactive': return 'bg-muted text-muted-foreground border-border';
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getQuotaPercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
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
            <h1 className="text-2xl font-display font-bold">Fontes de Dados</h1>
            <p className="text-muted-foreground text-sm">
              Configure e gerencie as integrações com APIs e repositórios
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Fonte
          </Button>
        </div>

        {/* Sources Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources?.map((source) => {
            const Icon = getSourceIcon(source.type);
            const quotaPercent = getQuotaPercentage(source.requests_today || 0, source.rate_limit_per_day || 1000);
            
            return (
              <Card key={source.id} className="glass-card hover-glow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{source.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {source.type === 'api' ? 'API' : 'GitHub'}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={source.status === 'active'}
                      onCheckedChange={() => toggleSourceMutation.mutate({ 
                        id: source.id, 
                        status: source.status 
                      })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {source.description || 'Sem descrição'}
                  </p>

                  {/* Rate Limit */}
                  {source.type === 'api' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Consumo diário</span>
                        <span className={quotaPercent > 80 ? 'text-destructive' : 'text-foreground'}>
                          {source.requests_today || 0}/{source.rate_limit_per_day}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            quotaPercent > 80 ? 'bg-destructive' : 
                            quotaPercent > 50 ? 'bg-yellow-500' : 'bg-secondary'
                          }`}
                          style={{ width: `${quotaPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Config Info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{source.rate_limit_per_minute || 10}/min</span>
                    </div>
                    {source.api_key_secret_name && (
                      <div className="flex items-center gap-1">
                        <Key className="w-3 h-3" />
                        <span>Chave configurada</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setSelectedSource(source)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Configurar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-primary/50 text-primary hover:bg-primary/10"
                      disabled={source.status !== 'active'}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Sincronizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Activity className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!sources || sources.length === 0) && (
          <Card className="glass-card p-12 text-center">
            <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma fonte configurada</h3>
            <p className="text-muted-foreground mb-6">
              Adicione fontes de dados para começar a importar informações
            </p>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeira Fonte
            </Button>
          </Card>
        )}

        {/* Config Dialog */}
        <Dialog open={!!selectedSource} onOpenChange={() => setSelectedSource(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">
                Configurar {selectedSource?.name}
              </DialogTitle>
              <DialogDescription>
                Ajuste as configurações da fonte de dados
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rate Limit por Minuto</Label>
                <Input 
                  type="number" 
                  defaultValue={selectedSource?.rate_limit_per_minute || 10}
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Rate Limit Diário</Label>
                <Input 
                  type="number" 
                  defaultValue={selectedSource?.rate_limit_per_day || 1000}
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input 
                  type="number" 
                  defaultValue={selectedSource?.priority || 100}
                  className="bg-muted/50 border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Menor = maior prioridade
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedSource(null)}
                >
                  Cancelar
                </Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90">
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
