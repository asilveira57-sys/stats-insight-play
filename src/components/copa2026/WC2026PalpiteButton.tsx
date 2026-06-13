import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPalpiteForWC2026Match, useCreateUserPalpiteWC2026 } from "@/hooks/useUserPalpitesWC2026";
import { TeamFlag } from "./TeamCard";
import { Target, Loader2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export function WC2026PalpiteButton({ match }: { match: any }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: existing } = useUserPalpiteForWC2026Match(match.id);
  const create = useCreateUserPalpiteWC2026();
  const [home, setHome] = useState(existing?.placar_casa ?? 1);
  const [away, setAway] = useState(existing?.placar_fora ?? 1);

  // Só mostra o botão se a partida está agendada. Para live/finished, retorna null.
  if (match.status !== "scheduled") return null;

  return (
    <>
      <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}>
        <Target className="w-3.5 h-3.5 mr-1.5" />
        {existing ? `Seu palpite: ${existing.placar_casa}-${existing.placar_fora}` : "Fazer palpite"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Palpite — Copa 2026</DialogTitle></DialogHeader>
          {!user ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">Entre para registrar seu palpite.</p>
              <Link to="/auth"><Button>Entrar</Button></Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 py-3">
                <div className="flex flex-col items-center gap-1 flex-1"><TeamFlag team={match.home} size="lg" /><span className="text-sm font-medium text-center truncate">{match.home?.name}</span></div>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={20} value={home} onChange={(e) => setHome(Math.max(0, parseInt(e.target.value) || 0))} className="w-16 text-center text-2xl font-bold h-14" />
                  <span className="text-xl text-muted-foreground">x</span>
                  <Input type="number" min={0} max={20} value={away} onChange={(e) => setAway(Math.max(0, parseInt(e.target.value) || 0))} className="w-16 text-center text-2xl font-bold h-14" />
                </div>
                <div className="flex flex-col items-center gap-1 flex-1"><TeamFlag team={match.away} size="lg" /><span className="text-sm font-medium text-center truncate">{match.away?.name}</span></div>
              </div>
              <Button className="w-full" disabled={create.isPending} onClick={async () => {
                try {
                  await create.mutateAsync({ matchId: match.id, placarCasa: home, placarFora: away });
                  toast({ title: "Palpite registrado!" });
                  setOpen(false);
                } catch (e: any) {
                  toast({ title: "Erro", description: e.message, variant: "destructive" });
                }
              }}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {existing ? "Atualizar palpite" : "Confirmar palpite"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
