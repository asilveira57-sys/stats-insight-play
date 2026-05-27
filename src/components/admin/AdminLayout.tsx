import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useMatchResultNotifications } from "@/hooks/useMatchResultNotifications";
import { supabase } from "@/integrations/supabase/client";

interface AdminLayoutProps {
  children: ReactNode;
}

function KillSwitchBanner() {
  const { data: enabled } = useQuery({
    queryKey: ["app_settings", "content_generation_enabled"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "content_generation_enabled")
        .maybeSingle();
      return data?.value === true;
    },
    staleTime: 30_000,
  });

  if (enabled !== false) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-sm text-amber-100 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        <strong>Modo economia ativo:</strong> geração automática de artigos e
        imagens por IA está pausada. Somente o fluxo pré-jogo de partidas
        brasileiras futuras pode rodar. Peça ao Lovable para reativar quando
        quiser.
      </span>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  useMatchResultNotifications();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger />
          </header>
          <KillSwitchBanner />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
