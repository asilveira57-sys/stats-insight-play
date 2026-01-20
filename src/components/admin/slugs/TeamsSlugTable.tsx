import { useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Lock, Unlock, History, ExternalLink } from "lucide-react";
import { TeamWithSlugInfo, useToggleSlugLock } from "@/hooks/useSlugAdmin";
import { SlugStatusBadge } from "./SlugStatusBadge";
import { SlugEditModal } from "./SlugEditModal";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TeamsSlugTableProps {
  teams: TeamWithSlugInfo[];
  isLoading: boolean;
}

export function TeamsSlugTable({ teams, isLoading }: TeamsSlugTableProps) {
  const [editingTeam, setEditingTeam] = useState<TeamWithSlugInfo | null>(null);
  const [lockConfirm, setLockConfirm] = useState<{
    team: TeamWithSlugInfo;
    action: "lock" | "unlock";
  } | null>(null);

  const toggleLock = useToggleSlugLock();

  const handleToggleLock = async () => {
    if (!lockConfirm) return;
    await toggleLock.mutateAsync({
      entityType: "team",
      entityId: lockConfirm.team.id,
      lock: lockConfirm.action === "lock",
    });
    setLockConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum time encontrado com os filtros selecionados.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Time</TableHead>
              <TableHead className="w-[200px]">Slug</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">API ID</TableHead>
              <TableHead className="w-[150px]">External IDs</TableHead>
              <TableHead className="w-[150px]">Última Alteração</TableHead>
              <TableHead className="w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <TeamBadge name={team.nome} size="sm" />
                    <div className="flex flex-col">
                      <span className="font-medium">{team.nome}</span>
                      {team.pais && (
                        <span className="text-xs text-muted-foreground">{team.pais}</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {team.slug ? (
                    <code className="text-sm bg-muted px-2 py-1 rounded">{team.slug}</code>
                  ) : (
                    <span className="text-muted-foreground italic">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <SlugStatusBadge status={team.status} conflictCount={team.conflict_count} />
                </TableCell>
                <TableCell>
                  {team.api_id ? (
                    <Badge variant="outline" className="font-mono">{team.api_id}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {team.external_ids.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {team.external_ids.slice(0, 2).map((ext, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-mono">
                          {ext.external_id}
                        </Badge>
                      ))}
                      {team.external_ids.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{team.external_ids.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(team.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingTeam(team)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar Slug
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingTeam(team)}>
                        <History className="h-4 w-4 mr-2" />
                        Ver Histórico
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {team.slug_locked ? (
                        <DropdownMenuItem onClick={() => setLockConfirm({ team, action: "unlock" })}>
                          <Unlock className="h-4 w-4 mr-2" />
                          Destravar Slug
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => setLockConfirm({ team, action: "lock" })}
                          disabled={!team.slug}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Travar Slug
                        </DropdownMenuItem>
                      )}
                      {team.slug && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a href={`/times/${team.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir Página
                            </a>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SlugEditModal
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
        entityType="team"
        team={editingTeam}
      />

      <AlertDialog open={!!lockConfirm} onOpenChange={(open) => !open && setLockConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lockConfirm?.action === "lock" ? "Travar Slug" : "Destravar Slug"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lockConfirm?.action === "lock" ? (
                <>Ao travar o slug <strong>{lockConfirm?.team.slug}</strong>, ele não poderá mais ser alterado.</>
              ) : (
                <>Ao destravar o slug <strong>{lockConfirm?.team.slug}</strong>, ele poderá ser alterado. Continuar?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleLock} disabled={toggleLock.isPending}>
              {lockConfirm?.action === "lock" ? "Travar" : "Destravar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
