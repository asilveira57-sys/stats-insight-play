import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, RotateCcw, Download, Loader2 } from "lucide-react";
import { useCsvImports } from "@/hooks/useCsvImport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

export function CsvImportHistory() {
  const { data: imports, isLoading } = useCsvImports();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const hasActiveJobs = imports?.some((imp: any) => imp.status === "processing");

  // Auto-refresh while jobs are active
  // We do this via the hook's refetchInterval instead

  const statusBadge = (status: string, imp: any) => {
    if (status === "processing") {
      const progress = imp.progress_detail || {};
      const pct = progress.total_files > 0
        ? Math.round((progress.processed_files || 0) / progress.total_files * 100)
        : 0;
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
          <Badge className="bg-blue-500/20 text-blue-500">
            {pct}%
          </Badge>
        </div>
      );
    }
    switch (status) {
      case "completed": return <Badge className="bg-green-500/20 text-green-500">Concluído</Badge>;
      case "failed": return <Badge variant="destructive">Falhou</Badge>;
      case "reverted": return <Badge variant="outline">Revertido</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRevert = async (importId: string) => {
    try {
      await (supabase.from("gols_partida") as any).delete().eq("import_batch_id", importId);
      await (supabase.from("partidas") as any).delete().eq("import_batch_id", importId);
      await (supabase.from("times") as any).delete().eq("import_batch_id", importId);
      await supabase.from("csv_imports" as any).update({ status: "reverted", reverted_at: new Date().toISOString() } as any).eq("id", importId);
      toast({ title: "Importação revertida!" });
      queryClient.invalidateQueries({ queryKey: ["csv-imports"] });
    } catch (error) {
      toast({ title: "Erro ao reverter", description: String(error), variant: "destructive" });
    }
  };

  const downloadErrors = (imp: any) => {
    const errors = imp.error_report || [];
    if (errors.length === 0) return;
    const blob = new Blob([errors.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `erros_${imp.file_name}.txt`; a.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" /> Histórico de Importações
          {hasActiveJobs && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Carregando...</p>
        ) : !imports || imports.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhuma importação realizada</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Arquivo</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Inseridos</TableHead>
                  <TableHead className="text-xs">Atualizados</TableHead>
                  <TableHead className="text-xs">Falhas</TableHead>
                  <TableHead className="text-xs">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp: any) => (
                  <TableRow key={imp.id}>
                    <TableCell className="text-xs">{format(new Date(imp.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell className="text-xs max-w-32 truncate">{imp.file_name}</TableCell>
                    <TableCell className="text-xs">{imp.file_type}</TableCell>
                    <TableCell>{statusBadge(imp.status, imp)}</TableCell>
                    <TableCell className="text-xs text-green-500">{imp.rows_inserted}</TableCell>
                    <TableCell className="text-xs text-blue-500">{imp.rows_updated}</TableCell>
                    <TableCell className="text-xs text-destructive">{imp.rows_failed}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {imp.status === "completed" && (
                          <Button size="sm" variant="ghost" onClick={() => handleRevert(imp.id)} title="Reverter">
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                        {imp.error_report?.length > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => downloadErrors(imp)} title="Baixar erros">
                            <Download className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
