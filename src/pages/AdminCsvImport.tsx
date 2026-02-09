import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, History } from "lucide-react";
import { CsvUploadStep } from "@/components/admin/csv/CsvUploadStep";
import { CsvMappingStep } from "@/components/admin/csv/CsvMappingStep";
import { CsvDryRunStep } from "@/components/admin/csv/CsvDryRunStep";
import { CsvImportExecutor } from "@/components/admin/csv/CsvImportExecutor";
import { CsvImportHistory } from "@/components/admin/csv/CsvImportHistory";
import type { DryRunResult } from "@/lib/csvImportUtils";

type Step = "upload" | "mapping" | "dryrun" | "importing";

export default function AdminCsvImport() {
  const { isAdmin, isLoading } = useAdminAccess();

  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("matches");
  const [ligaId, setLigaId] = useState<string | null>(null);
  const [temporada, setTemporada] = useState<number | null>(null);
  const [provider, setProvider] = useState("csv_manual");
  const [newLeagueName, setNewLeagueName] = useState<string | undefined>();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);

  const handleFileParsed = (params: any) => {
    setCsvText(params.text);
    setFileName(params.fileName);
    setFileType(params.fileType);
    setLigaId(params.ligaId);
    setTemporada(params.temporada);
    setProvider(params.provider);
    setNewLeagueName(params.newLeagueName);
    setStep("mapping");
  };

  const handleMappingConfirmed = (m: Record<string, string>, h: string[], r: string[][], _delimiter: string) => {
    setMapping(m);
    setHeaders(h);
    setRows(r);
    setStep("dryrun");
  };

  const handleConfirmImport = (dr: DryRunResult) => {
    setDryRun(dr);
    setStep("importing");
  };

  const handleReset = () => {
    setStep("upload");
    setCsvText("");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setDryRun(null);
  };

  if (isLoading) {
    return <Layout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }
  if (!isAdmin) return null;

  return (
    <>
      <Helmet>
        <title>Importar CSV | Admin Statball</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Layout>
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary" /> Importar CSV
          </h1>

          <Tabs defaultValue="import">
            <TabsList className="mb-4">
              <TabsTrigger value="import" className="flex items-center gap-1"><Upload className="w-4 h-4" /> Nova Importação</TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1"><History className="w-4 h-4" /> Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="space-y-4">
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {["Upload", "Mapeamento", "Pré-Checagem", "Importação"].map((label, i) => {
                  const stepKeys: Step[] = ["upload", "mapping", "dryrun", "importing"];
                  const isActive = stepKeys.indexOf(step) >= i;
                  return (
                    <span key={label} className={`px-3 py-1 rounded-full text-xs font-medium ${isActive ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {i + 1}. {label}
                    </span>
                  );
                })}
              </div>

              {step === "upload" && <CsvUploadStep onFileParsed={handleFileParsed} />}
              {step === "mapping" && (
                <CsvMappingStep csvText={csvText} fileType={fileType} provider={provider} onMappingConfirmed={handleMappingConfirmed} />
              )}
              {step === "dryrun" && (
                <CsvDryRunStep headers={headers} rows={rows} mapping={mapping} fileType={fileType} ligaId={ligaId} onConfirmImport={handleConfirmImport} />
              )}
              {step === "importing" && dryRun && (
                <CsvImportExecutor
                  headers={headers} rows={rows} mapping={mapping} fileType={fileType}
                  fileName={fileName} ligaId={ligaId} temporada={temporada} provider={provider}
                  dryRun={dryRun} newLeagueName={newLeagueName} onComplete={handleReset}
                />
              )}
            </TabsContent>

            <TabsContent value="history">
              <CsvImportHistory />
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  );
}
