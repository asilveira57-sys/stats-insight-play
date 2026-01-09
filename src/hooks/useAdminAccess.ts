import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useAdminAccess() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin role:", error);
        }

        const hasAdminRole = !!data;
        setIsAdmin(hasAdminRole);

        // Log access attempt
        if (hasAdminRole) {
          await supabase.from("sync_logs").insert({
            entity_type: "admin_access",
            status: "completed",
            details: {
              user_id: user.id,
              email: user.email,
              action: "control_center_access",
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (err) {
        console.error("Error in admin check:", err);
      }

      setCheckingRole(false);
    }

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !checkingRole && !isAdmin) {
      toast({
        title: "Acesso restrito",
        description: "Você não tem permissão para acessar esta área.",
        variant: "destructive"
      });
      navigate("/");
    }
  }, [authLoading, checkingRole, isAdmin, navigate, toast]);

  return {
    isAdmin,
    isLoading: authLoading || checkingRole,
    user
  };
}
