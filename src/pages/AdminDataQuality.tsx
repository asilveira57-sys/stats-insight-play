import { ArrowLeft, AlertTriangle, Users, Copy, GitMerge } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  useTeamsWithoutMatches,
  useDuplicateAliases,
  useSimilarTeams,
} from "@/hooks/useDataQuality";

function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

export default function AdminDataQuality() {
  const { isAdmin, isLoading: authLoading } = useAdminAccess();
  const { data: teamsWithoutMatches, isLoading: loadingTeams } = useTeamsWithoutMatches();
  const { data: duplicateAliases, isLoading: loadingAliases } = useDuplicateAliases();
  const { data: similarTeams, isLoading: loadingSimilar } = useSimilarTeams(0.7);

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Qualidade de Dados
          </h1>
          <p className="text-muted-foreground">
            Diagnóstico de inconsistências no banco de dados
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Times sem Partidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingTeams ? <Skeleton className="h-8 w-16" /> : teamsWithoutMatches?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Aliases Duplicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingAliases ? <Skeleton className="h-8 w-16" /> : duplicateAliases?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              Nomes Similares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingSimilar ? <Skeleton className="h-8 w-16" /> : similarTeams?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Teams without matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Times sem Partidas
          </CardTitle>
          <CardDescription>
            Times cadastrados que não possuem nenhuma partida vinculada (nem como mandante, nem como visitante)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID do Time</TableHead>
                <TableHead>Nome do Time</TableHead>
                <TableHead className="text-right">Total de Partidas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTeams ? (
                <LoadingSkeleton rows={5} />
              ) : !teamsWithoutMatches?.length ? (
                <EmptyState message="Nenhum time sem partidas encontrado ✓" />
              ) : (
                teamsWithoutMatches.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {team.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">{team.nome}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">0</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 2: Duplicate aliases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Aliases Duplicados
          </CardTitle>
          <CardDescription>
            Aliases que estão associados a mais de um time, indicando possível duplicidade de cadastro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alias</TableHead>
                <TableHead className="text-center">Qtd. Times</TableHead>
                <TableHead>Nomes dos Times</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingAliases ? (
                <LoadingSkeleton rows={5} />
              ) : !duplicateAliases?.length ? (
                <EmptyState message="Nenhum alias duplicado encontrado ✓" />
              ) : (
                duplicateAliases.map((alias, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{alias.alias}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({alias.normalized_alias})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">{alias.team_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {alias.team_names.map((name, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 3: Similar team names */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Times com Nomes Similares
          </CardTitle>
          <CardDescription>
            Pares de times com nomes muito parecidos (similaridade ≥ 70%), que podem indicar duplicidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Time A</TableHead>
                <TableHead>Nome do Time B</TableHead>
                <TableHead className="text-right">Score de Similaridade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSimilar ? (
                <LoadingSkeleton rows={5} />
              ) : !similarTeams?.length ? (
                <EmptyState message="Nenhum par de times similares encontrado ✓" />
              ) : (
                similarTeams.map((pair, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{pair.team_a_name}</TableCell>
                    <TableCell className="font-medium">{pair.team_b_name}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={pair.similarity_score >= 90 ? "destructive" : "secondary"}
                      >
                        {pair.similarity_score}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
