import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  Save,
  History,
  Loader2,
  Cookie,
  BarChart3,
  Target,
  Users,
  FileText,
  Eye
} from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useLgpdConfig, 
  useUpdateLgpdConfig, 
  useLgpdConfigLogs,
  useConsentStats,
  useConsentRecords
} from "@/hooks/useLgpdConsent";
import { useAnalyticsConfig } from "@/hooks/useAnalyticsConfig";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminLgpdPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const { data: config, isLoading: configLoading } = useLgpdConfig();
  const { data: analyticsConfig } = useAnalyticsConfig();
  const { data: logs } = useLgpdConfigLogs();
  const { data: stats } = useConsentStats();
  const { data: recentConsents } = useConsentRecords(20);
  const updateConfig = useUpdateLgpdConfig();

  // Form state
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerText, setBannerText] = useState('');
  const [essentialDesc, setEssentialDesc] = useState('');
  const [analyticsDesc, setAnalyticsDesc] = useState('');
  const [marketingDesc, setMarketingDesc] = useState('');
  const [policyVersion, setPolicyVersion] = useState('');

  // Sync form with config
  useEffect(() => {
    if (config) {
      setBannerEnabled(config.banner_enabled);
      setBannerTitle(config.banner_title);
      setBannerText(config.banner_text);
      setEssentialDesc(config.category_essential_description);
      setAnalyticsDesc(config.category_analytics_description);
      setMarketingDesc(config.category_marketing_description);
      setPolicyVersion(config.policy_version);
    }
  }, [config]);

  // Redirect non-admins
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleSave = () => {
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
    
    if (bannerEnabled !== config?.banner_enabled) {
      changes.push({ field: 'banner_enabled', oldValue: String(config?.banner_enabled), newValue: String(bannerEnabled) });
    }
    if (bannerTitle !== config?.banner_title) {
      changes.push({ field: 'banner_title', oldValue: config?.banner_title || '', newValue: bannerTitle });
    }
    if (bannerText !== config?.banner_text) {
      changes.push({ field: 'banner_text', oldValue: config?.banner_text || '', newValue: bannerText });
    }
    if (policyVersion !== config?.policy_version) {
      changes.push({ field: 'policy_version', oldValue: config?.policy_version || '', newValue: policyVersion });
    }

    updateConfig.mutate({
      banner_enabled: bannerEnabled,
      banner_title: bannerTitle,
      banner_text: bannerText,
      category_essential_description: essentialDesc,
      category_analytics_description: analyticsDesc,
      category_marketing_description: marketingDesc,
      policy_version: policyVersion,
      policy_updated_at: policyVersion !== config?.policy_version ? new Date().toISOString() : config?.policy_updated_at,
      logChanges: changes,
      userId: user?.id,
    });
  };

  if (adminLoading || configLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  const complianceStatus = config?.banner_enabled ? 'ok' : 'warning';

  return (
    <Layout>
      <Helmet>
        <title>LGPD e Privacidade | Admin | Statball</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display mb-2 flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            LGPD e Privacidade
          </h1>
          <p className="text-muted-foreground">
            Gerencie o banner de consentimento, categorias de cookies e conformidade com a LGPD.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">Conformidade</span>
                </div>
                {complianceStatus === 'ok' ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atenção
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Consentimentos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.analyticsRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Aceitam Analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.marketingRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Aceitam Marketing</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold">v{config?.policy_version}</p>
                  <p className="text-xs text-muted-foreground">Versão Política</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="consents">Registros</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Config Tab */}
          <TabsContent value="config">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cookie className="h-5 w-5" />
                    Banner de Consentimento
                  </CardTitle>
                  <CardDescription>
                    Configure o banner LGPD exibido aos visitantes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="banner-enabled">Ativar Banner LGPD</Label>
                      <p className="text-xs text-muted-foreground">
                        Exibe o banner na primeira visita
                      </p>
                    </div>
                    <Switch 
                      id="banner-enabled"
                      checked={bannerEnabled}
                      onCheckedChange={setBannerEnabled}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="banner-title">Título do Banner</Label>
                    <Input
                      id="banner-title"
                      value={bannerTitle}
                      onChange={(e) => setBannerTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="banner-text">Texto do Banner</Label>
                    <Textarea
                      id="banner-text"
                      value={bannerText}
                      onChange={(e) => setBannerText(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="policy-version">Versão da Política</Label>
                    <Input
                      id="policy-version"
                      value={policyVersion}
                      onChange={(e) => setPolicyVersion(e.target.value)}
                      placeholder="1.0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Atualizar a versão invalida consentimentos anteriores
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Integrações Vinculadas
                  </CardTitle>
                  <CardDescription>
                    Scripts controlados pelo consentimento LGPD
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Google Analytics 4</span>
                      </div>
                      {analyticsConfig?.ga4_enabled ? (
                        <Badge className="bg-green-500/20 text-green-400">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Carregado apenas com consentimento de cookies analíticos
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Meta Pixel</span>
                      </div>
                      {analyticsConfig?.pixel_enabled ? (
                        <Badge className="bg-green-500/20 text-green-400">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Carregado apenas com consentimento de cookies de marketing
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Páginas legais vinculadas:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">/privacidade</Badge>
                    <Badge variant="outline">/termos</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleSave} disabled={updateConfig.isPending}>
                {updateConfig.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Descrição das Categorias</CardTitle>
                <CardDescription>
                  Textos exibidos no painel de preferências do usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    Cookies Essenciais
                  </Label>
                  <Textarea
                    value={essentialDesc}
                    onChange={(e) => setEssentialDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Cookies Analíticos
                  </Label>
                  <Textarea
                    value={analyticsDesc}
                    onChange={(e) => setAnalyticsDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    Cookies de Marketing
                  </Label>
                  <Textarea
                    value={marketingDesc}
                    onChange={(e) => setMarketingDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={updateConfig.isPending}>
                    {updateConfig.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Categorias
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consents Tab */}
          <TabsContent value="consents">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Registros de Consentimento
                </CardTitle>
                <CardDescription>
                  Últimos consentimentos registrados (dados anonimizados)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentConsents && recentConsents.length > 0 ? (
                    recentConsents.map((consent: any) => (
                      <div 
                        key={consent.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            consent.action === 'accept_all' ? 'bg-green-500' :
                            consent.action === 'reject_non_essential' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium">
                              {consent.action === 'accept_all' ? 'Aceitou todos' :
                               consent.action === 'reject_non_essential' ? 'Recusou não essenciais' :
                               consent.action === 'update' ? 'Atualizou preferências' :
                               'Personalizado'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Visitor: {consent.visitor_hash.slice(0, 8)}... • v{consent.policy_version}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {consent.analytics_accepted && (
                            <Badge variant="outline" className="text-xs">Analytics</Badge>
                          )}
                          {consent.marketing_accepted && (
                            <Badge variant="outline" className="text-xs">Marketing</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(consent.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum consentimento registrado ainda.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Alterações
                </CardTitle>
                <CardDescription>
                  Registro de mudanças na configuração LGPD
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logs && logs.length > 0 ? (
                  <div className="space-y-2">
                    {logs.map((log: any) => (
                      <div 
                        key={log.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                      >
                        <div>
                          <p className="text-sm font-medium">{log.field_changed}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.old_value?.slice(0, 30)}... → {log.new_value?.slice(0, 30)}...
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma alteração registrada.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
