import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Shield, Cookie, BarChart3, Target, X, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { 
  useLgpdConfig, 
  useRecordConsent, 
  hasConsentBeenGiven, 
  getStoredConsent 
} from "@/hooks/useLgpdConsent";

interface CookieConsentBannerProps {
  onConsentChange?: () => void;
}

export function CookieConsentBanner({ onConsentChange }: CookieConsentBannerProps) {
  const { data: config, isLoading } = useLgpdConfig();
  const recordConsent = useRecordConsent();
  
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    // Only show banner if enabled and consent hasn't been given
    if (!isLoading && config?.banner_enabled && !hasConsentBeenGiven()) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, config]);

  // Load existing preferences when opening modal
  useEffect(() => {
    if (showPreferences) {
      const stored = getStoredConsent();
      if (stored) {
        setAnalyticsEnabled(stored.analytics);
        setMarketingEnabled(stored.marketing);
      }
    }
  }, [showPreferences]);

  const handleAcceptAll = async () => {
    await recordConsent.mutateAsync({
      analytics: true,
      marketing: true,
      action: 'accept_all',
    });
    setShowBanner(false);
    onConsentChange?.();
    // Force reload to apply new consent
    window.location.reload();
  };

  const handleRejectNonEssential = async () => {
    await recordConsent.mutateAsync({
      analytics: false,
      marketing: false,
      action: 'reject_non_essential',
    });
    setShowBanner(false);
    onConsentChange?.();
  };

  const handleSavePreferences = async () => {
    await recordConsent.mutateAsync({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
      action: hasConsentBeenGiven() ? 'update' : 'custom',
    });
    setShowPreferences(false);
    setShowBanner(false);
    onConsentChange?.();
    // Force reload to apply new consent
    window.location.reload();
  };

  const handleOpenPreferences = () => {
    setShowPreferences(true);
  };

  if (isLoading || !config?.banner_enabled) return null;

  return (
    <>
      {/* Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom duration-300">
          <Card className="max-w-4xl mx-auto glass-card border-border/50 shadow-2xl">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm md:text-base mb-1">
                      {config.banner_title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {config.banner_text}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <Link to="/privacidade" className="hover:text-primary underline">
                        Política de Privacidade
                      </Link>
                      <Link to="/termos" className="hover:text-primary underline">
                        Termos de Uso
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleOpenPreferences}
                    className="flex-1 md:flex-none"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Personalizar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRejectNonEssential}
                    className="flex-1 md:flex-none"
                  >
                    Recusar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleAcceptAll}
                    className="flex-1 md:flex-none"
                  >
                    Aceitar todos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preferences Modal */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Preferências de Cookies
            </DialogTitle>
            <DialogDescription>
              Gerencie suas preferências de cookies. Você pode alterar estas configurações a qualquer momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Essential Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">Cookies Essenciais</Label>
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded">
                      Sempre ativos
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config?.category_essential_description}
                  </p>
                </div>
              </div>
              <Switch checked disabled />
            </div>

            <Separator />

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <Label htmlFor="analytics-toggle" className="font-medium cursor-pointer">
                    Cookies Analíticos
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config?.category_analytics_description}
                  </p>
                </div>
              </div>
              <Switch 
                id="analytics-toggle"
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Target className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <Label htmlFor="marketing-toggle" className="font-medium cursor-pointer">
                    Cookies de Marketing
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config?.category_marketing_description}
                  </p>
                </div>
              </div>
              <Switch 
                id="marketing-toggle"
                checked={marketingEnabled}
                onCheckedChange={setMarketingEnabled}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-3 text-xs text-muted-foreground">
              <Link to="/privacidade" className="hover:text-primary underline">
                Política de Privacidade
              </Link>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreferences(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePreferences}>
                Salvar preferências
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Trigger button for footer or other places
export function CookiePreferencesButton() {
  const [showPreferences, setShowPreferences] = useState(false);
  const { data: config } = useLgpdConfig();
  const recordConsent = useRecordConsent();
  
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    if (showPreferences) {
      const stored = getStoredConsent();
      if (stored) {
        setAnalyticsEnabled(stored.analytics);
        setMarketingEnabled(stored.marketing);
      }
    }
  }, [showPreferences]);

  const handleSavePreferences = async () => {
    await recordConsent.mutateAsync({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
      action: 'update',
    });
    setShowPreferences(false);
    window.location.reload();
  };

  return (
    <>
      <button 
        onClick={() => setShowPreferences(true)}
        className="text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        Preferências de Privacidade
      </button>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Preferências de Cookies
            </DialogTitle>
            <DialogDescription>
              Gerencie suas preferências de cookies. Você pode alterar estas configurações a qualquer momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Essential */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">Cookies Essenciais</Label>
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded">
                      Sempre ativos
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config?.category_essential_description}
                  </p>
                </div>
              </div>
              <Switch checked disabled />
            </div>

            <Separator />

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <Label htmlFor="analytics-toggle-2" className="font-medium cursor-pointer">
                    Cookies Analíticos
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config?.category_analytics_description}
                  </p>
                </div>
              </div>
              <Switch 
                id="analytics-toggle-2"
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Target className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <Label htmlFor="marketing-toggle-2" className="font-medium cursor-pointer">
                    Cookies de Marketing
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config?.category_marketing_description}
                  </p>
                </div>
              </div>
              <Switch 
                id="marketing-toggle-2"
                checked={marketingEnabled}
                onCheckedChange={setMarketingEnabled}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-3 text-xs text-muted-foreground">
              <Link to="/privacidade" className="hover:text-primary underline">
                Política de Privacidade
              </Link>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreferences(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePreferences}>
                Salvar preferências
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
