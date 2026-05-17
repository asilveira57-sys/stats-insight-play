import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function useAdminAccess() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminRole() {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      // Retry with backoff to survive transient backend timeouts
      let hasAdminRole = false;
      let lastErr: any = null;
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const { data, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (error) throw error;
          hasAdminRole = !!data;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          console.warn(`Admin role check failed (attempt ${attempt + 1}/3):`, err);
          await sleep(500 * Math.pow(2, attempt));
        }
      }

      if (cancelled) return;

      if (lastErr) {
        console.error("Error checking admin role:", lastErr);
        setFailed(true);
        setIsAdmin(false);
        setCheckingRole(false);
        return;
      }

      setIsAdmin(hasAdminRole);

      // Best-effort access log (never blocks)
      if (hasAdminRole) {
        supabase.from("sync_logs").insert({
          entity_type: "admin_access",
          status: "completed",
          details: {
            user_id: user.id,
            email: user.email,
            action: "control_center_access",
            timestamp: new Date().toISOString()
          }
        }).then(() => {}, () => {});
      }

      setCheckingRole(false);
    }

    if (!authLoading) {
      checkAdminRole();
    }

    return () => { cancelled = true; };
  }, [user, authLoading]);

  useEffect(() => {
    // Only redirect when we've confirmed the user is NOT admin (not on transient failure)
    if (!authLoading && !checkingRole && !isAdmin && !failed && user) {
      toast({
        title: "Acesso restrito",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive"
      });
      navigate("/");
    }
  }, [authLoading, checkingRole, isAdmin, failed, user, navigate, toast]);

  return {
    isAdmin,
    isLoading: authLoading || checkingRole,
    failed,
    user
  };
}
