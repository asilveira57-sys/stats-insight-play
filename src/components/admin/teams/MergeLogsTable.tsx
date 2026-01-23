import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Calendar, Tag, Trophy } from "lucide-react";
import type { MergeLog } from "@/hooks/useTeamCanonical";

interface MergeLogsTableProps {
  logs: MergeLog[];
  isLoading: boolean;
}

export function MergeLogsTable({ logs, isLoading }: MergeLogsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma fusão realizada ainda.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Time Origem</TableHead>
            <TableHead className="text-center">→</TableHead>
            <TableHead>Time Destino</TableHead>
            <TableHead className="text-center">Partidas</TableHead>
            <TableHead className="text-center">Aliases</TableHead>
            <TableHead className="text-center">IDs Externos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {new Date(log.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium line-through text-muted-foreground">
                    {log.source_canonical_name}
                  </p>
                  <code className="text-xs text-muted-foreground">
                    {log.source_canonical_slug}
                  </code>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <ArrowRight className="h-4 w-4 text-secondary mx-auto" />
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{log.summary.target_name}</p>
                  <code className="text-xs text-muted-foreground">
                    {log.summary.target_slug}
                  </code>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="gap-1">
                  <Trophy className="h-3 w-3" />
                  {log.summary.matches_updated}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {log.summary.aliases_migrated}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">
                  {log.summary.external_ids_migrated}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
