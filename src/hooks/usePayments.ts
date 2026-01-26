import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  type: "one_time_days" | "subscription_monthly";
  price_cents: number;
  days: number | null;
  period_months: number | null;
  active: boolean;
  display_order: number;
  highlight_label: string | null;
  mp_preapproval_plan_id: string | null;
  features: string[];
}

export interface UserSubscription {
  id: string;
  user_id: string;
  subscription_status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_until: string | null;
  tipo_plano: string;
  status: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  total_days_credited: number;
}

export interface PaymentHistory {
  id: string;
  status: string;
  amount_cents: number;
  payment_method: string;
  days_granted: number;
  created_at: string;
  approved_at: string | null;
  refundable_until: string | null;
  plan: { name: string } | null;
}

export interface SubscriptionRecord {
  id: string;
  status: string;
  reason: string | null;
  next_payment_date: string | null;
  created_at: string;
  cancelled_at: string | null;
  plan: { name: string } | null;
}

// Fetch active plans
export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      return (data || []).map((plan) => ({
        ...plan,
        type: plan.type as "one_time_days" | "subscription_monthly",
        features: Array.isArray(plan.features) ? plan.features as string[] : [],
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch user subscription status
export function useUserSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-subscription", user?.id],
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as UserSubscription | null;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

// Fetch payment history
export function usePaymentHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payment-history", user?.id],
    queryFn: async (): Promise<PaymentHistory[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("mp_payments")
        .select("id, status, amount_cents, payment_method, days_granted, created_at, approved_at, refundable_until, plan:plans(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PaymentHistory[];
    },
    enabled: !!user,
  });
}

// Fetch subscription records
export function useSubscriptionRecords() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription-records", user?.id],
    queryFn: async (): Promise<SubscriptionRecord[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("mp_subscriptions")
        .select("id, status, reason, next_payment_date, created_at, cancelled_at, plan:plans(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SubscriptionRecord[];
    },
    enabled: !!user,
  });
}

// Create one-time payment
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      plan_id: string; 
      payment_method?: "pix" | "credit_card" | "boleto";
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-create-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
    },
  });
}

// Create subscription
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { plan_id: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-create-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create subscription");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-records"] });
    },
  });
}

// Cancel subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-cancel-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel subscription");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-records"] });
    },
  });
}

// Request refund
export function useRequestRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { payment_id: string; reason?: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-request-refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to request refund");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
    },
  });
}

// Helper to check if user has active access
export function useHasActiveAccess() {
  const { data: subscription, isLoading } = useUserSubscription();

  const hasAccess = subscription?.subscription_status && 
    ["trial_active", "active", "past_due"].includes(subscription.subscription_status);

  const periodEnd = subscription?.current_period_end 
    ? new Date(subscription.current_period_end) 
    : null;

  const isInTrial = subscription?.subscription_status === "trial_active";
  const isInGrace = subscription?.subscription_status === "past_due";

  return {
    hasAccess: !!hasAccess,
    isLoading,
    subscription,
    periodEnd,
    isInTrial,
    isInGrace,
  };
}
