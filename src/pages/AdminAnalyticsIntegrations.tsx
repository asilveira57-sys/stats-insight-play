import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Facebook, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  Save,
  History,
  Loader2,
  Info
} from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { 
  useAnalyticsConfig, 
  useAnalyticsConfigLogs, 
  useUpdateAnalyticsConfig,
  maskId,
  isValidGA4Id,
  isValidPixelId
} from "@/hooks/useAnalyticsConfig";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminAnalyticsIntegrations() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const { data: config, isLoading: configLoading } = useAnalyticsConfig();
  const { data: logs } = useAnalyticsConfigLogs();
  const updateConfig = useUpdateAnalyticsConfig();

  // Local state for form
  const [ga4Enabled, setGa4Enabled] = useState(false);
  const [ga4Id, setGa4Id] = useState('');
  const [ga4PropertyName, setGa4PropertyName] = useState('');
  const [ga4TestId, setGa4TestId] = useState('');
  const [ga4UseTestInDev, setGa4UseTestInDev] = useState(true);

  const [pixelEnabled, setPixelEnabled] = useState(false);
  const [pixelId, setPixelId] = useState('');
  const [pixelAccountName, setPixelAccountName] = useState('');
  const [pixelTestId, setPixelTestId] = useState('');
  const [pixelUseTestInDev, setPixelUseTestInDev] = useState(true);

  // Validation states
  const [ga4IdError, setGa4IdError] = useState('');
  const [pixelIdError, setPixelIdError] = useState('');

  // Sync local state with fetched config
  useEffect(() => {
    if (config) {
      setGa4Enabled(config.ga4_enabled);
      setGa4Id(config.ga4_measurement_id || '');
      setGa4PropertyName(config.ga4_property_name || '');
      setGa4TestId(config.ga4_test_measurement_id || '');
      setGa4UseTestInDev(config.ga4_use_test_in_dev);

      setPixelEnabled(config.pixel_enabled);
      setPixelId(config.pixel_id || '');
      setPixelAccountName(config.pixel_account_name || '');
      setPixelTestId(config.pixel_test_id || '');
      setPixelUseTestInDev(config.pixel_use_test_in_dev);
    }
  }, [config]);

  // Redirect non-admins
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  // Validation
  const validateGA4Id = (id: string) => {
    if (id && !isValidGA4Id(id)) {
      setGa4IdError('Formato inválido. Use o formato G-XXXXXXXXXX');
      return false;
    }
    setGa4IdError('');
    return true;
  };

  const validatePixelId = (id: string) => {
    if (id && !isValidPixelId(id)) {
      setPixelIdError('Formato inválido. O Pixel ID deve ter 15-16 dígitos');
      return false;
    }
    setPixelIdError('');
    return true;
  };

  const handleSaveGA4 = () => {
    if (!validateGA4Id(ga4Id)) return;
    if (ga4TestId && !validateGA4Id(ga4TestId)) return;

    updateConfig.mutate({
      ga4_enabled: ga4Enabled,
      ga4_measurement_id: ga4Id || null,
      ga4_property_name: ga4PropertyName || null,
      ga4_test_measurement_id: ga4TestId || null,
      ga4_use_test_in_dev: ga4UseTestInDev,
      logAction: ga4Enabled !== config?.ga4_enabled ? (ga4Enabled ? 'Ativação' : 'Desativação') : 'Atualização',
      logField: 'GA4',
      oldValue: config?.ga4_measurement_id || undefined,
      newValue: ga4Id || undefined,
    });
  };

  const handleSavePixel = () => {
    if (!validatePixelId(pixelId)) return;
    if (pixelTestId && !validatePixelId(pixelTestId)) return;

    updateConfig.mutate({
      pixel_enabled: pixelEnabled,
      pixel_id: pixelId || null,
      pixel_account_name: pixelAccountName || null,
      pixel_test_id: pixelTestId || null,
      pixel_use_test_in_dev: pixelUseTestInDev,
      logAction: pixelEnabled !== config?.pixel_enabled ? (pixelEnabled ? 'Ativação' : 'Desativação') : 'Atualização',
      logField: 'Meta Pixel',
      oldValue: config?.pixel_id || undefined,
      newValue: pixelId || undefined,
    });
  };

  if (adminLoading || configLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) return null;

  const isDev = import.meta.env.DEV;

  return (
    <AdminLayout>
      <Helmet>
        <title>Integrações de Analytics | Admin | Statball</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display mb-2">
            Integrações de Analytics e Pixels
          </h1>
          <p className="text-muted-foreground">
            Configure Google Analytics 4 e Meta Pixel para análise de tráfego, mensuração de conversões e campanhas de aquisição.
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">GA4</span>
                </div>
                {config?.ga4_enabled ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inativo
                  </Badge>
                )}
              </div>
              {config?.ga4_measurement_id && (
                <p className="text-xs text-muted-foreground mt-2">
                  ID: {maskId(config.ga4_measurement_id)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Meta Pixel</span>
                </div>
                {config?.pixel_enabled ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inativo
                  </Badge>
                )}
              </div>
              {config?.pixel_id && (
                <p className="text-xs text-muted-foreground mt-2">
                  ID: {maskId(config.pixel_id)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Ambiente</span>
                </div>
                <Badge variant={isDev ? "outline" : "default"}>
                  {isDev ? 'Desenvolvimento' : 'Produção'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Última alteração</span>
                </div>
              </div>
              {config?.updated_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(config.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ga4" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="ga4">Google Analytics</TabsTrigger>
            <TabsTrigger value="pixel">Meta Pixel</TabsTrigger>
            <TabsTrigger value="logs">Histórico</TabsTrigger>
          </TabsList>

          {/* GA4 Tab */}
          <TabsContent value="ga4">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>Google Analytics 4</CardTitle>
                    <CardDescription>
                      Configure o GA4 para rastrear visitas, eventos e conversões
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ga4-enabled" className="text-base">Ativar GA4</Label>
                    <p className="text-sm text-muted-foreground">
                      O script será inserido automaticamente em todas as páginas
                    </p>
                  </div>
                  <Switch 
                    id="ga4-enabled" 
                    checked={ga4Enabled}
                    onCheckedChange={setGa4Enabled}
                  />
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ga4-id">Measurement ID (Produção)</Label>
                    <Input
                      id="ga4-id"
                      placeholder="G-XXXXXXXXXX"
                      value={ga4Id}
                      onChange={(e) => {
                        setGa4Id(e.target.value.toUpperCase());
                        validateGA4Id(e.target.value);
                      }}
                      className={ga4IdError ? 'border-destructive' : ''}
                    />
                    {ga4IdError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {ga4IdError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ga4-property">Nome da Propriedade (opcional)</Label>
                    <Input
                      id="ga4-property"
                      placeholder="Ex: Statball - Produção"
                      value={ga4PropertyName}
                      onChange={(e) => setGa4PropertyName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Apenas para organização interna
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Ambiente de Teste</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ga4-use-test">Usar ID de teste em desenvolvimento</Label>
                      <p className="text-sm text-muted-foreground">
                        Evita poluir dados de produção durante testes
                      </p>
                    </div>
                    <Switch 
                      id="ga4-use-test" 
                      checked={ga4UseTestInDev}
                      onCheckedChange={setGa4UseTestInDev}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ga4-test-id">Measurement ID (Teste)</Label>
                    <Input
                      id="ga4-test-id"
                      placeholder="G-XXXXXXXXXX"
                      value={ga4TestId}
                      onChange={(e) => setGa4TestId(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    asChild
                  >
                    <a 
                      href="https://analytics.google.com/analytics/web/#/debugview" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir DebugView
                    </a>
                  </Button>

                  <Button 
                    onClick={handleSaveGA4}
                    disabled={updateConfig.isPending}
                  >
                    {updateConfig.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar GA4
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meta Pixel Tab */}
          <TabsContent value="pixel">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
                    <Facebook className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Meta Pixel (Facebook)</CardTitle>
                    <CardDescription>
                      Configure o Pixel para rastrear conversões e criar públicos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pixel-enabled" className="text-base">Ativar Meta Pixel</Label>
                    <p className="text-sm text-muted-foreground">
                      Dispara PageView automaticamente e prepara eventos de conversão
                    </p>
                  </div>
                  <Switch 
                    id="pixel-enabled" 
                    checked={pixelEnabled}
                    onCheckedChange={setPixelEnabled}
                  />
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pixel-id">Pixel ID (Produção)</Label>
                    <Input
                      id="pixel-id"
                      placeholder="1234567890123456"
                      value={pixelId}
                      onChange={(e) => {
                        setPixelId(e.target.value.replace(/\D/g, ''));
                        validatePixelId(e.target.value);
                      }}
                      className={pixelIdError ? 'border-destructive' : ''}
                    />
                    {pixelIdError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {pixelIdError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pixel-account">Nome da Conta (opcional)</Label>
                    <Input
                      id="pixel-account"
                      placeholder="Ex: Statball Ads"
                      value={pixelAccountName}
                      onChange={(e) => setPixelAccountName(e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Ambiente de Teste</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="pixel-use-test">Usar Pixel de teste em desenvolvimento</Label>
                      <p className="text-sm text-muted-foreground">
                        Evita poluir dados de produção durante testes
                      </p>
                    </div>
                    <Switch 
                      id="pixel-use-test" 
                      checked={pixelUseTestInDev}
                      onCheckedChange={setPixelUseTestInDev}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pixel-test-id">Pixel ID (Teste)</Label>
                    <Input
                      id="pixel-test-id"
                      placeholder="1234567890123456"
                      value={pixelTestId}
                      onChange={(e) => setPixelTestId(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <Separator />

                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Eventos configurados</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ PageView (todas as páginas)</li>
                      <li>✓ ViewContent (preparado)</li>
                      <li>✓ Lead (preparado)</li>
                      <li>✓ Subscribe (Clube Statball)</li>
                      <li>✓ InitiateCheckout (preparado)</li>
                      <li>✓ Purchase (preparado)</li>
                    </ul>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    asChild
                  >
                    <a 
                      href="https://www.facebook.com/business/help/742478679120153" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Testar com Pixel Helper
                    </a>
                  </Button>

                  <Button 
                    onClick={handleSavePixel}
                    disabled={updateConfig.isPending}
                  >
                    {updateConfig.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Meta Pixel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Histórico de Alterações</CardTitle>
                <CardDescription>
                  Registro de todas as mudanças nas configurações de analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logs && logs.length > 0 ? (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            log.action === 'Ativação' ? 'bg-green-500' :
                            log.action === 'Desativação' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`} />
                          <div>
                            <p className="font-medium text-sm">
                              {log.action} - {log.field_changed}
                            </p>
                            {log.new_value_masked && (
                              <p className="text-xs text-muted-foreground">
                                {log.old_value_masked ? `${log.old_value_masked} → ` : ''}
                                {log.new_value_masked}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {log.environment}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma alteração registrada ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
