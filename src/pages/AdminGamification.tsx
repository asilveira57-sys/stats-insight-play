import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGamificationRules, useUpdateGamificationRule, useBadges } from "@/hooks/useGamification";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Zap, Settings, Loader2, Save } from "lucide-react";

const RARITY_STYLES: Record<string, string> = {
  common: 'bg-muted',
  rare: 'bg-blue-500/10 text-blue-400',
  epic: 'bg-purple-500/10 text-purple-400',
  legendary: 'bg-amber-500/10 text-amber-400',
};

export default function AdminGamification() {
  const { toast } = useToast();
  const { data: rules, isLoading: loadingRules } = useGamificationRules();
  const { data: badges, isLoading: loadingBadges } = useBadges();
  const updateRule = useUpdateGamificationRule();
  const [editedRules, setEditedRules] = useState<Record<string, { xp_value: number; is_enabled: boolean }>>({});

  const handleSaveRule = async (rule: any) => {
    const edited = editedRules[rule.id];
    if (!edited) return;
    try {
      await updateRule.mutateAsync({ id: rule.id, ...edited });
      toast({ title: "Regra atualizada!" });
      setEditedRules(prev => { const next = { ...prev }; delete next[rule.id]; return next; });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const getEdited = (rule: any) => editedRules[rule.id] || { xp_value: rule.xp_value, is_enabled: rule.is_enabled };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Gamificação</h1>
            <p className="text-muted-foreground">Gerenciar regras de XP e badges</p>
          </div>
        </div>

        {/* Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5" /> Regras de XP</CardTitle>
            <CardDescription>Configurar valor de XP por tipo de acerto</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRules ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Regra</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-24">XP</TableHead>
                    <TableHead className="w-24">Ativo</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules?.map(rule => {
                    const edited = getEdited(rule);
                    const isDirty = editedRules[rule.id] !== undefined;
                    return (
                      <TableRow key={rule.id}>
                        <TableCell className="font-mono text-xs">{rule.rule_key}</TableCell>
                        <TableCell className="text-sm">{rule.description}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={edited.xp_value}
                            onChange={(e) => setEditedRules(prev => ({ ...prev, [rule.id]: { ...edited, xp_value: parseInt(e.target.value) || 0 } }))}
                            className="w-20 h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={edited.is_enabled}
                            onCheckedChange={(v) => setEditedRules(prev => ({ ...prev, [rule.id]: { ...edited, is_enabled: v } }))}
                          />
                        </TableCell>
                        <TableCell>
                          {isDirty && (
                            <Button size="sm" variant="outline" onClick={() => handleSaveRule(rule)}>
                              <Save className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Badges Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBadges ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {badges?.map(badge => (
                  <div key={badge.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <Badge className={RARITY_STYLES[badge.rarity]}>{badge.rarity}</Badge>
                    <div>
                      <p className="font-medium text-sm">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
