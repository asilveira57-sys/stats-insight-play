import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, ArrowUpDown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price_cents: number;
  days: number | null;
  period_months: number | null;
  active: boolean;
  display_order: number;
  highlight_label: string | null;
  mp_preapproval_plan_id: string | null;
  features: string[];
  created_at: string;
}

export default function AdminPlanos() {
  const { isAdmin, isLoading: loadingAdmin } = useAdminAccess();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as Plan[];
    },
    enabled: isAdmin,
  });

  const savePlan = useMutation({
    mutationFn: async (plan: Partial<Plan> & { id?: string }) => {
      const planData = {
        name: plan.name!,
        description: plan.description,
        type: plan.type as "one_time_days" | "subscription_monthly",
        price_cents: plan.price_cents!,
        days: plan.days,
        period_months: plan.period_months,
        active: plan.active,
        display_order: plan.display_order,
        highlight_label: plan.highlight_label,
        mp_preapproval_plan_id: plan.mp_preapproval_plan_id,
        features: plan.features as unknown as any,
      };

      if (plan.id) {
        const { error } = await supabase
          .from("plans")
          .update(planData)
          .eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("plans")
          .insert(planData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      setIsDialogOpen(false);
      setEditingPlan(null);
      toast({ title: "Plano salvo com sucesso" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao salvar plano", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from("plans")
        .delete()
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "Plano excluído" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir plano", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("plans")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  if (loadingAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold">Gestão de Planos</h1>
            <p className="text-muted-foreground">Gerencie planos de assinatura e pagamento único</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPlan(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <PlanForm 
                plan={editingPlan} 
                onSave={(data) => savePlan.mutate(data)}
                isSaving={savePlan.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planos Cadastrados</CardTitle>
            <CardDescription>
              {plans?.length || 0} planos • {plans?.filter(p => p.active).length || 0} ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPlans ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Destaque</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans?.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>{plan.display_order}</TableCell>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {plan.type === "subscription_monthly" ? "Assinatura" : "Avulso"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPrice(plan.price_cents)}</TableCell>
                      <TableCell>
                        {plan.type === "subscription_monthly" 
                          ? `${plan.period_months || 1} mês` 
                          : `${plan.days} dias`}
                      </TableCell>
                      <TableCell>
                        {plan.highlight_label && (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="w-3 h-3" />
                            {plan.highlight_label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={plan.active}
                          onCheckedChange={(active) => 
                            toggleActive.mutate({ id: plan.id, active })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPlan(plan);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Excluir este plano?")) {
                              deletePlan.mutate(plan.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function PlanForm({ 
  plan, 
  onSave, 
  isSaving 
}: { 
  plan: Plan | null; 
  onSave: (data: Partial<Plan>) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState({
    id: plan?.id,
    name: plan?.name || "",
    description: plan?.description || "",
    type: plan?.type || "one_time_days",
    price_cents: plan?.price_cents || 0,
    days: plan?.days || 30,
    period_months: plan?.period_months || 1,
    active: plan?.active ?? true,
    display_order: plan?.display_order || 0,
    highlight_label: plan?.highlight_label || "",
    mp_preapproval_plan_id: plan?.mp_preapproval_plan_id || "",
    features: plan?.features?.join("\n") || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      features: formData.features.split("\n").filter(f => f.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{plan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
        <DialogDescription>
          Configure os detalhes do plano de assinatura ou pagamento único.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time_days">Pagamento Único (dias)</SelectItem>
                <SelectItem value="subscription_monthly">Assinatura Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Preço (centavos)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price_cents}
              onChange={(e) => setFormData({ ...formData, price_cents: parseInt(e.target.value) || 0 })}
              required
            />
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(formData.price_cents / 100)}
            </p>
          </div>
          
          {formData.type === "one_time_days" ? (
            <div className="space-y-2">
              <Label htmlFor="days">Dias de acesso</Label>
              <Input
                id="days"
                type="number"
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 0 })}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="period">Período (meses)</Label>
              <Input
                id="period"
                type="number"
                value={formData.period_months}
                onChange={(e) => setFormData({ ...formData, period_months: parseInt(e.target.value) || 1 })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="order">Ordem de exibição</Label>
            <Input
              id="order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="highlight">Destaque (ex: "Mais vendido")</Label>
            <Input
              id="highlight"
              value={formData.highlight_label}
              onChange={(e) => setFormData({ ...formData, highlight_label: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp_plan_id">ID do Plano no Mercado Pago</Label>
            <Input
              id="mp_plan_id"
              value={formData.mp_preapproval_plan_id}
              onChange={(e) => setFormData({ ...formData, mp_preapproval_plan_id: e.target.value })}
              placeholder="Para assinaturas recorrentes"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="features">Features (uma por linha)</Label>
          <Textarea
            id="features"
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            rows={5}
            placeholder="Navegação sem anúncios&#10;Estatísticas avançadas&#10;Palpites ilimitados"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="active"
            checked={formData.active}
            onCheckedChange={(active) => setFormData({ ...formData, active })}
          />
          <Label htmlFor="active">Plano ativo</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}
