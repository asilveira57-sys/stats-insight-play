import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Columns, Save, Wand2 } from "lucide-react";
import { CANONICAL_FIELDS, autoGuessMapping, parseCSV, mapRow, validateRow } from "@/lib/csvImportUtils";
import { useCsvMappingTemplates } from "@/hooks/useCsvImport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CsvMappingStepProps {
  csvText: string;
  fileType: string;
  provider: string;
  onMappingConfirmed: (mapping: Record<string, string>, headers: string[], rows: string[][], delimiter: string) => void;
}

export function CsvMappingStep({ csvText, fileType, provider, onMappingConfirmed }: CsvMappingStepProps) {
  const { toast } = useToast();
  const { data: templates } = useCsvMappingTemplates();
  const [delimiter, setDelimiter] = useState(",");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [templateName, setTemplateName] = useState("");

  const canonicalFields = CANONICAL_FIELDS[fileType] || [];

  useEffect(() => {
    const { headers: h, rows: r, detectedDelimiter } = parseCSV(csvText);
    setHeaders(h);
    setRows(r);
    setDelimiter(detectedDelimiter);
    setMapping(autoGuessMapping(h, fileType));
  }, [csvText, fileType]);

  const handleLoadTemplate = (templateId: string) => {
    const tmpl = templates?.find((t: any) => t.id === templateId);
    if (tmpl) {
      setMapping(tmpl.column_mappings as Record<string, string>);
      setDelimiter(tmpl.delimiter || ",");
      toast({ title: "Template carregado!" });
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    const { error } = await supabase.from("csv_mapping_templates" as any).upsert({
      name: templateName,
      provider,
      file_type: fileType,
      delimiter,
      column_mappings: mapping,
    } as any, { onConflict: "provider,file_type,name" } as any);
    if (error) toast({ title: "Erro ao salvar template", description: error.message, variant: "destructive" });
    else toast({ title: "Template salvo!" });
  };

  const previewRows = rows.slice(0, 50);
  const mappedPreview = previewRows.slice(0, 5).map((r) => {
    const mapped = mapRow(r, headers, mapping);
    const validation = validateRow(mapped, fileType);
    return { mapped, validation };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Columns className="w-5 h-5" /> Mapeamento de Colunas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">Delimitador: {delimiter === "," ? "vírgula" : delimiter === ";" ? "ponto-e-vírgula" : "tab"}</Badge>
          <Badge variant="outline">{headers.length} colunas</Badge>
          <Badge variant="outline">{rows.length} linhas</Badge>
          
          {templates && templates.length > 0 && (
            <Select onValueChange={handleLoadTemplate}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Carregar template..." /></SelectTrigger>
              <SelectContent>
                {templates.filter((t: any) => t.file_type === fileType).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.provider})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Column mapping */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {canonicalFields.map((field) => (
            <div key={field.key}>
              <Label className="text-xs flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Select value={mapping[field.key] || "__none__"} onValueChange={(v) => setMapping({ ...mapping, [field.key]: v === "__none__" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Não mapeado —</SelectItem>
                  {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Save template */}
        <div className="flex items-center gap-2">
          <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Nome do template" className="max-w-xs h-8 text-sm" />
          <Button size="sm" variant="outline" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
            <Save className="w-3 h-3 mr-1" /> Salvar Template
          </Button>
        </div>

        {/* Preview */}
        <div className="border rounded-lg overflow-x-auto max-h-64">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-12">#</TableHead>
                {canonicalFields.filter((f) => mapping[f.key]).map((f) => (
                  <TableHead key={f.key} className="text-xs">{f.label}</TableHead>
                ))}
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappedPreview.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{i + 1}</TableCell>
                  {canonicalFields.filter((f) => mapping[f.key]).map((f) => (
                    <TableCell key={f.key} className="text-xs max-w-32 truncate">{row.mapped[f.key] || "—"}</TableCell>
                  ))}
                  <TableCell>
                    {row.validation.valid ? (
                      <Badge className="bg-green-500/20 text-green-500 text-xs">OK</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">{row.validation.errors[0]}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button onClick={() => onMappingConfirmed(mapping, headers, rows, delimiter)} className="w-full">
          <Wand2 className="w-4 h-4 mr-2" /> Executar Pré-Checagem (Dry Run)
        </Button>
      </CardContent>
    </Card>
  );
}
