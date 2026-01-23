import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, GitMerge, Tag, Calendar } from "lucide-react";
import type { CanonicalTeam } from "@/hooks/useTeamCanonical";

interface TeamsTableProps {
  teams: CanonicalTeam[];
  isLoading: boolean;
  onViewDetails: (id: string) => void;
  onMerge: (team: { id: string; name: string }) => void;
}

export function TeamsTable({
  teams,
  isLoading,
  onViewDetails,
  onMerge,
}: TeamsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum time encontrado.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome Canônico</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>País</TableHead>
            <TableHead className="text-center">Aliases</TableHead>
            <TableHead className="text-center">Partidas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Última Alteração</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TableRow key={team.id}>
              <TableCell className="font-medium">{team.nome}</TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {team.slug}
                </code>
              </TableCell>
              <TableCell>{team.pais || "-"}</TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {team.alias_count}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {team.match_count}
                </Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={team.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(team.updated_at).toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(team.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {team.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMerge({ id: team.id, name: team.nome })}
                    >
                      <GitMerge className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge className="bg-secondary text-secondary-foreground">Ativo</Badge>;
    case "merged":
      return <Badge variant="secondary">Fundido</Badge>;
    case "disabled":
      return <Badge variant="outline" className="text-muted-foreground">Desativado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
