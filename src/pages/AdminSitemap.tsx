import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, FileCode, ExternalLink } from "lucide-react";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN_BASE = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sitemap`;

interface SitemapFile {
  filename: string;
  type: string;
  page?: number;
  description: string;
}

const FILES: SitemapFile[] = [
  { filename: "sitemap.xml", type: "index", description: "Índice geral (referencia os demais)" },
  { filename: "sitemap-static.xml", type: "static", description: "Páginas estáticas (home, dashboard, etc.)" },
  { filename: "sitemap-noticias-1.xml", type: "noticias", page: 1, description: "Notícias publicadas (até 10k)" },
  { filename: "sitemap-partidas-1.xml", type: "partidas", page: 1, description: "Partidas (página 1, até 10k)" },
  { filename: "sitemap-partidas-2.xml", type: "partidas", page: 2, description: "Partidas (página 2, até 10k)" },
  { filename: "sitemap-times.xml", type: "times", description: "Times ativos + análises + estatísticas" },
  { filename: "sitemap-estatisticas.xml", type: "estatisticas", description: "Hubs de ligas + rankings" },
];

export default function AdminSitemap() {
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);

  if (adminLoading) return <AdminLayout><div className="p-8">Carregando...</div></AdminLayout>;
  if (!isAdmin) return <AdminLayout><div className="p-8">Acesso negado.</div></AdminLayout>;

  async function fetchOne(file: SitemapFile): Promise<Blob> {
    const params = new URLSearchParams({ type: file.type });
    if (file.page) params.set("page", String(file.page));
    const res = await fetch(`${FN_BASE}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDownload(file: SitemapFile) {
    setDownloading(file.filename);
    try {
      const blob = await fetchOne(file);
      triggerDownload(blob, file.filename);
      toast({ title: "Baixado", description: file.filename });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadAll() {
    setBulk(true);
    try {
      for (const file of FILES) {
        const blob = await fetchOne(file);
        triggerDownload(blob, file.filename);
        await new Promise((r) => setTimeout(r, 400));
      }
      toast({
        title: "Todos baixados",
        description: "Substitua os arquivos em public/ e me peça um deploy.",
      });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBulk(false);
    }
  }

  return (
    <AdminLayout>
      <Helmet><title>Sitemap | Admin Statball</title></Helmet>
      <div className="space-y-6 p-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold">Sitemap</h1>
          <p className="text-muted-foreground mt-1">
            Regere os arquivos de sitemap com dados atualizados do banco.
          </p>
        </div>

        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Como funciona</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Os arquivos em <code className="bg-muted px-1 rounded">public/sitemap*.xml</code> são
              servidos no domínio <code className="bg-muted px-1 rounded">www.statball.com.br/sitemap.xml</code>{" "}
              após cada deploy.
            </p>
            <p>
              Clique em <strong>Baixar todos</strong>, salve os arquivos e me peça no chat para
              substituir os <code>public/sitemap*.xml</code> e publicar — a partir daí o Google verá
              o conteúdo novo.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleDownloadAll} disabled={bulk || !!downloading} size="lg">
            {bulk ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Baixar todos os sitemaps
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href={FN_BASE} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Ver índice atual
            </a>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Arquivos individuais</CardTitle>
            <CardDescription>Baixe um arquivo específico se preferir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {FILES.map((f) => (
              <div
                key={f.filename}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileCode className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono truncate">{f.filename}</code>
                      <Badge variant="secondary" className="text-xs">{f.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(f)}
                  disabled={!!downloading || bulk}
                >
                  {downloading === f.filename ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
