import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Calendar, RefreshCw, Link2 } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  EntityType,
  SlugStatus,
  SlugFilters,
  useTeamsWithSlugInfo,
  useSlugStats,
} from "@/hooks/useSlugAdmin";
import { SlugStatsCards } from "@/components/admin/slugs/SlugStatsCards";
import { TeamsSlugTable } from "@/components/admin/slugs/TeamsSlugTable";
import { Link } from "react-router-dom";

export default function AdminSlugs() {
  const { isAdmin, isLoading: loadingAuth } = useAdminAccess();
  
  const [filters, setFilters] = useState<SlugFilters>({
    entityType: "team",
    status: "all",
    search: "",
  });
  
  const [searchInput, setSearchInput] = useState("");

  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useSlugStats();
  const {
    data: teams,
    isLoading: loadingTeams,
    refetch: refetchTeams,
  } = useTeamsWithSlugInfo(filters);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput }));
  };

  const handleRefresh = () => {
    refetchStats();
    refetchTeams();
  };

  if (loadingAuth) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Link2 className="h-8 w-8" />
              Gerenciamento de Slugs
            </h1>
            <p className="text-muted-foreground mt-1">
              Saneamento, padronização e bloqueio de slugs canônicos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/control-center">
                ← Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Tabs de entidade */}
        <Tabs
          value={filters.entityType}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, entityType: v as EntityType }))
          }
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Times
            </TabsTrigger>
            <TabsTrigger value="match" className="flex items-center gap-2" disabled>
              <Calendar className="h-4 w-4" />
              Partidas (Em breve)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <SlugStatsCards
              stats={stats}
              isLoading={loadingStats}
              entityType="team"
            />

            {/* Filtros */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Busca */}
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar</Label>
                    <div className="flex gap-2">
                      <Input
                        id="search"
                        placeholder="Nome, slug ou API ID..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <Button variant="secondary" size="icon" onClick={handleSearch}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(v) =>
                        setFilters((prev) => ({
                          ...prev,
                          status: v as SlugStatus | "all",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="no_slug">Sem Slug</SelectItem>
                        <SelectItem value="conflict">Conflito</SelectItem>
                        <SelectItem value="locked">Travado</SelectItem>
                        <SelectItem value="editable">Editável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Limpar filtros */}
                  <div className="space-y-2">
                    <Label className="invisible">Ações</Label>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setFilters({
                          entityType: "team",
                          status: "all",
                          search: "",
                        });
                        setSearchInput("");
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de times */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Times
                  {teams && (
                    <span className="ml-2 text-muted-foreground font-normal">
                      ({teams.length} registros)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Clique em uma linha para editar o slug do time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TeamsSlugTable teams={teams || []} isLoading={loadingTeams} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="match">
            <Card className="mt-6">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>O gerenciamento de slugs de partidas será implementado em breve.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
