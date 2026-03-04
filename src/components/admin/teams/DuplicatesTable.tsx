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
import { GitMerge, Eye, ArrowRight, XCircle } from "lucide-react";
import type { SuggestedDuplicate } from "@/hooks/useTeamCanonical";

interface DuplicatesTableProps {
  duplicates: SuggestedDuplicate[];
  isLoading: boolean;
  onMerge: (
    teamA: { id: string; name: string },
    teamB: { id: string; name: string }
  ) => void;
  onViewTeam: (id: string) => void;
  onDismiss?: (teamAId: string, teamBId: string) => void;
  isDismissing?: boolean;
}

export function DuplicatesTable({
  duplicates,
  isLoading,
  onMerge,
  onViewTeam,
  onDismiss,
  isDismissing,
}: DuplicatesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (duplicates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium text-secondary">✓ Nenhum duplicado detectado!</p>
        <p className="mt-1">A base de times está limpa.</p>
      </div>
    );
  }

  const getSimilarityColor = (score: number) => {
    if (score >= 95) return "bg-destructive text-destructive-foreground";
    if (score >= 80) return "bg-amber-500 text-white";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time A</TableHead>
            <TableHead className="text-center">→</TableHead>
            <TableHead>Time B</TableHead>
            <TableHead className="text-center">Similaridade</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {duplicates.map((dup, index) => (
            <TableRow key={`${dup.team_a_id}-${dup.team_b_id}-${index}`}>
              <TableCell>
                <div>
                  <p className="font-medium">{dup.team_a_name}</p>
                  <code className="text-xs text-muted-foreground">
                    {dup.team_a_slug}
                  </code>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{dup.team_b_name}</p>
                  <code className="text-xs text-muted-foreground">
                    {dup.team_b_slug}
                  </code>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge className={getSimilarityColor(dup.similarity_score)}>
                  {dup.similarity_score.toFixed(0)}%
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {dup.reason}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewTeam(dup.team_a_id)}
                    title="Ver Time A"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewTeam(dup.team_b_id)}
                    title="Ver Time B"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDismiss?.(dup.team_a_id, dup.team_b_id)}
                    disabled={isDismissing}
                    title="São times diferentes — remover da lista"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Diferente
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      onMerge(
                        { id: dup.team_a_id, name: dup.team_a_name },
                        { id: dup.team_b_id, name: dup.team_b_name }
                      )
                    }
                  >
                    <GitMerge className="h-4 w-4 mr-1" />
                    Fundir
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
