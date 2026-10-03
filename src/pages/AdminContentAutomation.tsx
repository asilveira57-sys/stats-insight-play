import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, PlayCircle, Info } from "lucide-react";
import {
  useContentAutomationLeagues,
  useLigasSearch,
  useRunContentAutomation,
} from "@/hooks/useContentAutomation";

export default function AdminContentAutomation() {
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const { list, addLeague, updateLeague, removeLeague } = useContentAutomationLeagues();
  const run = useRunContentAutomation();

  const [search, setSearch] = useState("");
  const [selectedLiga, setSelectedLiga] = useState<string>("");
  const ligas = useLigasSearch(search);

  const rows = list.data || [];
  const existingIds = useMemo(() => new Set(rows.map((r) => r.liga_id)), [rows]);
  const options = (ligas.data || []).filter((l: any) => !existingIds.has(l.id));

  if (adminLoading)
    return (
      <AdminLayout>
        <div className="p-8">Carregando...</div>
      </AdminLayout>
    );
  if (!isAdmin)
    return (
      <AdminLayout>
        <div className="p-8">Acesso negado.</div>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <Helmet>
        <title>{`Campeonatos Automáticos | Admin Aleball`}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="space-y-6 p-4 md:p-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Campeonatos Automáticos
          </h1>
          <p className="text-sm text-muted-foreground">
            Só os campeonatos listados aqui geram conteúdo com IA (análise pré-jogo antes do
            apito inicial e crônica pós-jogo após o encerramento). Qualquer competição fora
            desta lista é ignorada — nenhum crédito de IA é consumido.
          </p>
        </header>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-1">
              <p>
                <strong className="text-foreground">Pré-jogo:</strong> gera a análise das
                partidas agendadas dentro da janela de dias configurada, garantindo o palpite do
                sistema antes de escrever.
              </p>
              <p>
                <strong className="text-foreground">Pós-jogo:</strong> gera a crônica das
                partidas já encerradas que ainda não possuem publicação.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adicionar campeonato</CardTitle>
            <CardDescription>
              Recomendado apenas para campeonatos principais e nacionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="busca-liga">Buscar competição</Label>
              <Input
                id="busca-liga"
                placeholder="Ex.: Campeonato Brasileiro Série A"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Competição</Label>
              <Select value={selectedLiga} onValueChange={setSelectedLiga}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome} {l.pais ? `— ${l.pais}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (!selectedLiga) return;
                addLeague.mutate(selectedLiga, { onSuccess: () => setSelectedLiga("") });
              }}
              disabled={!selectedLiga || addLeague.isPending}
            >
              {addLeague.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Adicionar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Campeonatos habilitados{" "}
              <Badge variant="secondary" className="ml-2">
                {rows.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Ative/desative pré e pós-jogo por competição e execute a geração manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {list.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhum campeonato configurado — nenhuma publicação automática será gerada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competição</TableHead>
                    <TableHead className="text-center">Ativo</TableHead>
                    <TableHead className="text-center">Pré-jogo</TableHead>
                    <TableHead className="text-center">Pós-jogo</TableHead>
                    <TableHead className="text-center">Dias antes</TableHead>
                    <TableHead className="text-center">Máx./execução</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.liga?.nome || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.liga?.pais || ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={row.enabled}
                          onCheckedChange={(v) =>
                            updateLeague.mutate({ id: row.id, patch: { enabled: v } })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={row.pre_game_enabled}
                          onCheckedChange={(v) =>
                            updateLeague.mutate({ id: row.id, patch: { pre_game_enabled: v } })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={row.post_game_enabled}
                          onCheckedChange={(v) =>
                            updateLeague.mutate({ id: row.id, patch: { post_game_enabled: v } })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          max={14}
                          className="mx-auto w-16 text-center"
                          defaultValue={row.days_ahead}
                          onBlur={(e) => {
                            const v = Math.min(14, Math.max(1, Number(e.target.value) || 3));
                            if (v !== row.days_ahead)
                              updateLeague.mutate({ id: row.id, patch: { days_ahead: v } });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          className="mx-auto w-16 text-center"
                          defaultValue={row.max_per_run}
                          onBlur={(e) => {
                            const v = Math.min(10, Math.max(1, Number(e.target.value) || 3));
                            if (v !== row.max_per_run)
                              updateLeague.mutate({ id: row.id, patch: { max_per_run: v } });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!row.enabled || !row.pre_game_enabled || run.isPending}
                            onClick={() =>
                              run.mutate({
                                kind: "pre",
                                limit: row.max_per_run,
                                daysAhead: row.days_ahead,
                              })
                            }
                          >
                            <PlayCircle className="mr-1.5 h-4 w-4" />
                            Pré-jogo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!row.enabled || !row.post_game_enabled || run.isPending}
                            onClick={() =>
                              run.mutate({
                                kind: "post",
                                ligaId: row.liga_id,
                                limit: Math.min(3, row.max_per_run),
                              })
                            }
                          >
                            <PlayCircle className="mr-1.5 h-4 w-4" />
                            Pós-jogo
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLeague.mutate(row.id)}
                            disabled={removeLeague.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
