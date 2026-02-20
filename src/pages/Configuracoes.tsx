import { useState, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserPreferences, useUpdatePreferences } from "@/hooks/useUserPreferences";
import { 
  User, CreditCard, Settings, Heart, Crown, Loader2, Upload, 
  Save, MapPin, Phone, Mail, FileText, Calendar, Clock, 
  CheckCircle, AlertTriangle, Shield, Globe
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Hook: Profile + Public Profile + Fiscal merged ──
function useSettingsData() {
  const { user } = useAuth();

  const profile = useQuery({
    queryKey: ['settings-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const publicProfile = useQuery({
    queryKey: ['settings-public-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_public_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  const fiscal = useQuery({
    queryKey: ['settings-fiscal', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_fiscal_data')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  const subscription = useQuery({
    queryKey: ['settings-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  return { profile, publicProfile, fiscal, subscription };
}

// ── Tab: Dados Pessoais ──
function DadosPessoaisTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, publicProfile } = useSettingsData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({});

  // Initialize form when data loads
  const p = profile.data;
  const pp = publicProfile.data;

  const nome = form.nome ?? p?.nome ?? '';
  const nickname = form.nickname ?? pp?.nickname ?? '';
  const bio = form.bio ?? pp?.bio ?? '';
  const phone = form.phone ?? (p as any)?.phone ?? '';
  const country = form.country ?? (p as any)?.country ?? 'Brasil';
  const state = form.state ?? (p as any)?.state ?? '';
  const city = form.city ?? (p as any)?.city ?? '';

  const currentAvatarUrl = avatarPreview || pp?.avatar_url || null;
  const usernameChanges = (pp as any)?.username_changes_count ?? 0;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2MB", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Upload avatar if changed
      let newAvatarUrl = pp?.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        newAvatarUrl = urlData.publicUrl;
      }

      // Validate nickname if changed
      if (nickname !== (pp?.nickname ?? '') && nickname) {
        if (usernameChanges >= 2) {
          toast({ title: "Limite atingido", description: "Username só pode ser alterado 2 vezes.", variant: "destructive" });
          setSaving(false);
          return;
        }
        const { data: validation } = await supabase.rpc('validate_nickname', {
          p_nickname: nickname, p_user_id: user.id
        });
        if (validation && validation.length > 0 && !validation[0].is_valid) {
          toast({ title: "Nickname inválido", description: validation[0].error_message || "Tente outro", variant: "destructive" });
          setSaving(false);
          return;
        }
      }

      // Update profiles
      await supabase.from('profiles').update({
        nome, phone, country, state, city
      }).eq('user_id', user.id);

      // Update public profile
      const publicUpdate: Record<string, unknown> = { bio };
      if (newAvatarUrl) publicUpdate.avatar_url = newAvatarUrl;
      if (nickname !== (pp?.nickname ?? '')) {
        publicUpdate.nickname = nickname;
        publicUpdate.username_changes_count = usernameChanges + 1;
      }
      await supabase.from('user_public_profiles').update(publicUpdate).eq('user_id', user.id);

      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      queryClient.invalidateQueries({ queryKey: ['settings-public-profile'] });
      toast({ title: "Perfil atualizado!", description: "Suas alterações foram salvas." });
      setAvatarFile(null);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (profile.isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-20 h-20">
                {currentAvatarUrl ? (
                  <AvatarImage src={currentAvatarUrl} alt="Avatar" />
                ) : null}
                <AvatarFallback className="text-lg">{nome?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="font-medium">Foto de Perfil</p>
              <p className="text-sm text-muted-foreground">JPG, PNG. Máximo 2MB.</p>
              {avatarPreview && <Badge variant="secondary" className="mt-1">Preview ativo</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome Completo</label>
              <Input value={nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Seu nome" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Username {usernameChanges >= 2 && <Badge variant="destructive" className="ml-2 text-xs">Limite atingido</Badge>}
              </label>
              <Input 
                value={nickname} 
                onChange={(e) => setForm(f => ({ ...f, nickname: e.target.value }))} 
                placeholder="@username" 
                disabled={usernameChanges >= 2}
              />
              <p className="text-xs text-muted-foreground mt-1">{2 - usernameChanges} alterações restantes</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Bio</label>
            <Input value={bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value.slice(0, 300) }))} placeholder="Uma breve descrição sobre você" />
            <p className="text-xs text-muted-foreground mt-1">{bio.length}/300</p>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Telefone</label>
              <Input value={phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> País</label>
              <Input value={country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Brasil" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Estado</label>
              <Input value={state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))} placeholder="SP" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Cidade</label>
              <Input value={city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} placeholder="São Paulo" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar Alterações
      </Button>
    </div>
  );
}

// ── Tab: Gestão de Plano ──
function GestaoPlanoTab() {
  const navigate = useNavigate();
  const { subscription } = useSettingsData();
  const sub = subscription.data;

  if (subscription.isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      trial_active: { label: "Período de Teste", variant: "secondary", icon: Clock },
      active: { label: "Ativo", variant: "default", icon: CheckCircle },
      past_due: { label: "Pagamento Pendente", variant: "destructive", icon: AlertTriangle },
      canceled: { label: "Cancelado", variant: "outline", icon: Shield },
      expired: { label: "Expirado", variant: "outline", icon: Shield },
    };
    return map[status] || map.expired;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><Crown className="w-5 h-5 text-primary" /> Seu Plano</CardTitle>
            {sub?.subscription_status && (() => {
              const info = getStatusInfo(sub.subscription_status);
              const Icon = info.icon;
              return <Badge variant={info.variant} className="gap-1"><Icon className="w-3 h-3" />{info.label}</Badge>;
            })()}
          </div>
        </CardHeader>
        <CardContent>
          {sub ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="font-semibold capitalize">{sub.tipo_plano}</p>
                </div>
                {sub.current_period_end && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">{isPast(new Date(sub.current_period_end)) ? "Expirou em" : "Acesso até"}</p>
                    <p className="font-semibold">{format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR })}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(sub.current_period_end), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                )}
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Dias Creditados</p>
                  <p className="font-semibold">{sub.total_days_credited || 0} dias</p>
                </div>
              </div>

              {sub.subscription_status === 'trial_active' && sub.trial_ends_at && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center gap-2 text-primary"><Clock className="w-5 h-5" /><span className="font-medium">Teste Gratuito</span></div>
                  <p className="text-sm mt-1">Termina em <strong>{format(new Date(sub.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}</strong></p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={() => navigate("/precos")}>
                  <Crown className="w-4 h-4 mr-2" /> Fazer Upgrade
                </Button>
                <Button variant="outline" onClick={() => navigate("/minha-assinatura")}>
                  <CreditCard className="w-4 h-4 mr-2" /> Gerenciar Pagamentos
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Nenhuma assinatura ativa.</p>
              <Button onClick={() => navigate("/precos")}>Ver Planos</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Faturamento ──
function FaturamentoTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fiscal } = useSettingsData();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const f = fiscal.data;
  const cpf = form.cpf ?? f?.cpf ?? '';
  const nome_fiscal = form.nome_fiscal ?? f?.nome_fiscal ?? '';
  const cep = form.cep ?? f?.cep ?? '';
  const logradouro = form.logradouro ?? f?.logradouro ?? '';
  const numero = form.numero ?? f?.numero ?? '';
  const complemento = form.complemento ?? f?.complemento ?? '';
  const bairro = form.bairro ?? f?.bairro ?? '';
  const cidade = form.cidade ?? f?.cidade ?? '';
  const estado = form.estado ?? f?.estado ?? '';

  const validateCpf = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.length === 11 || cleaned.length === 14;
  };

  const handleSave = async () => {
    if (!user) return;
    if (cpf && !validateCpf(cpf)) {
      toast({ title: "CPF/CNPJ inválido", description: "Verifique o formato.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await supabase.from('user_fiscal_data').update({
        cpf, nome_fiscal, cep, logradouro, numero, complemento, bairro, cidade, estado
      }).eq('user_id', user.id);

      queryClient.invalidateQueries({ queryKey: ['settings-fiscal'] });
      toast({ title: "Dados fiscais salvos!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (fiscal.isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Dados de Faturamento</CardTitle>
          <CardDescription>Informações para emissão de Nota Fiscal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">CPF / CNPJ</label>
              <Input value={cpf} onChange={(e) => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Razão Social / Nome</label>
              <Input value={nome_fiscal} onChange={(e) => setForm(f => ({ ...f, nome_fiscal: e.target.value }))} placeholder="Nome fiscal" />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">CEP</label>
              <Input value={cep} onChange={(e) => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Logradouro</label>
              <Input value={logradouro} onChange={(e) => setForm(f => ({ ...f, logradouro: e.target.value }))} placeholder="Rua, Avenida..." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Número</label>
              <Input value={numero} onChange={(e) => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="123" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Complemento</label>
              <Input value={complemento} onChange={(e) => setForm(f => ({ ...f, complemento: e.target.value }))} placeholder="Apto, Sala..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Bairro</label>
              <Input value={bairro} onChange={(e) => setForm(f => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Cidade</label>
              <Input value={cidade} onChange={(e) => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Cidade" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Estado</label>
              <Input value={estado} onChange={(e) => setForm(f => ({ ...f, estado: e.target.value }))} placeholder="UF" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar Dados de Faturamento
      </Button>
    </div>
  );
}

// ── Tab: Preferências ──
function PreferenciasTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: prefs, isLoading } = useUserPreferences();
  const updatePrefs = useUpdatePreferences();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const teams = useQuery({
    queryKey: ['teams-select'],
    queryFn: async () => {
      const { data } = await supabase.from('times').select('id, nome').eq('status', 'active').order('nome');
      return data || [];
    },
  });

  const themeMode = form.theme_mode ?? prefs?.theme_mode ?? 'system';
  const notifEmail = form.notifications_email ?? prefs?.notifications_email ?? true;
  const notifPush = form.notifications_push ?? prefs?.notifications_push ?? false;
  const publicProfile = form.public_profile ?? prefs?.public_profile ?? false;
  const favoriteTeam = form.favorite_team_id ?? prefs?.favorite_team_id ?? '';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePrefs.mutateAsync({
        theme_mode: themeMode,
        notifications_email: notifEmail,
        notifications_push: notifPush,
        public_profile: publicProfile,
        favorite_team_id: favoriteTeam || null,
      });
      toast({ title: "Preferências salvas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5" /> Preferências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tema</label>
            <Select value={themeMode} onValueChange={(v) => setForm(f => ({ ...f, theme_mode: v }))}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">☀️ Claro</SelectItem>
                <SelectItem value="dark">🌙 Escuro</SelectItem>
                <SelectItem value="system">🖥️ Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Notificações</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Email</p>
                <p className="text-xs text-muted-foreground">Receber análises e atualizações por email</p>
              </div>
              <Switch checked={notifEmail} onCheckedChange={(v) => setForm(f => ({ ...f, notifications_email: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Push</p>
                <p className="text-xs text-muted-foreground">Notificações no navegador</p>
              </div>
              <Switch checked={notifPush} onCheckedChange={(v) => setForm(f => ({ ...f, notifications_push: v }))} />
            </div>
          </div>

          <Separator />

          {/* Public profile */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Perfil Público</p>
              <p className="text-xs text-muted-foreground">Permitir que outros vejam seu perfil e estatísticas</p>
            </div>
            <Switch checked={publicProfile} onCheckedChange={(v) => setForm(f => ({ ...f, public_profile: v }))} />
          </div>

          <Separator />

          {/* Favorite team */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> Time Favorito</label>
            <Select value={favoriteTeam || ''} onValueChange={(v) => setForm(f => ({ ...f, favorite_team_id: v }))}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="Selecione seu time" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="">Nenhum</SelectItem>
                {teams.data?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar Preferências
      </Button>
    </div>
  );
}

// ── Main Page ──
export default function Configuracoes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/auth?redirect=/configuracoes/perfil");
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Configurações</h1>
            <p className="text-muted-foreground">Gerencie seu perfil, plano e preferências</p>
          </div>
        </div>

        <Tabs defaultValue="pessoais" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pessoais" className="gap-1 text-xs md:text-sm">
              <User className="w-4 h-4 hidden md:block" /> Dados
            </TabsTrigger>
            <TabsTrigger value="plano" className="gap-1 text-xs md:text-sm">
              <Crown className="w-4 h-4 hidden md:block" /> Plano
            </TabsTrigger>
            <TabsTrigger value="faturamento" className="gap-1 text-xs md:text-sm">
              <CreditCard className="w-4 h-4 hidden md:block" /> Faturamento
            </TabsTrigger>
            <TabsTrigger value="preferencias" className="gap-1 text-xs md:text-sm">
              <Settings className="w-4 h-4 hidden md:block" /> Preferências
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pessoais" className="mt-6">
            <DadosPessoaisTab />
          </TabsContent>
          <TabsContent value="plano" className="mt-6">
            <GestaoPlanoTab />
          </TabsContent>
          <TabsContent value="faturamento" className="mt-6">
            <FaturamentoTab />
          </TabsContent>
          <TabsContent value="preferencias" className="mt-6">
            <PreferenciasTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
