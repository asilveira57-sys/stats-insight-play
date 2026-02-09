import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Plus } from "lucide-react";
import { useLeaguesForImport } from "@/hooks/useCsvImport";

interface CsvUploadStepProps {
  onFileParsed: (params: {
    text: string;
    fileName: string;
    fileType: string;
    ligaId: string | null;
    temporada: number | null;
    provider: string;
    newLeagueName?: string;
  }) => void;
}

export function CsvUploadStep({ onFileParsed }: CsvUploadStepProps) {
  const [fileType, setFileType] = useState("matches");
  const [ligaId, setLigaId] = useState<string>("");
  const [temporada, setTemporada] = useState<string>("");
  const [provider, setProvider] = useState("");
  const [newLeagueName, setNewLeagueName] = useState("");
  const [creatingLeague, setCreatingLeague] = useState(false);
  const { data: leagues } = useLeaguesForImport();

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        onFileParsed({
          text,
          fileName: file.name,
          fileType,
          ligaId: creatingLeague ? null : ligaId || null,
          temporada: temporada ? parseInt(temporada) : null,
          provider: provider || "csv_manual",
          newLeagueName: creatingLeague ? newLeagueName : undefined,
        });
      };
      reader.readAsText(file, "UTF-8");
    },
    [fileType, ligaId, temporada, provider, creatingLeague, newLeagueName, onFileParsed]
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" /> Upload CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo de Arquivo</Label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="matches">Partidas (matches.csv)</SelectItem>
                <SelectItem value="teams">Times (teams.csv)</SelectItem>
                <SelectItem value="scorers">Gols por Partida (scorers.csv)</SelectItem>
                <SelectItem value="season_scorers">Artilheiros Temporada (season_scorers.csv)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fonte / Provider</Label>
            <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Ex: FerrerasRP, Kaggle, Football-Data" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              Liga / Competição
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setCreatingLeague(!creatingLeague)}>
                <Plus className="w-3 h-3 mr-1" /> {creatingLeague ? "Selecionar existente" : "Criar nova"}
              </Button>
            </Label>
            {creatingLeague ? (
              <Input value={newLeagueName} onChange={(e) => setNewLeagueName(e.target.value)} placeholder="Nome da nova liga" />
            ) : (
              <Select value={ligaId} onValueChange={setLigaId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {leagues?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome} {l.pais ? `(${l.pais})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label>Temporada / Ano</Label>
            <Select value={temporada} onValueChange={setTemporada}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Arraste o CSV aqui ou clique para selecionar</p>
          <Input type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="max-w-xs mx-auto" />
        </div>
      </CardContent>
    </Card>
  );
}
