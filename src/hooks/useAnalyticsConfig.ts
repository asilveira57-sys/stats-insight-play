import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AnalyticsConfig {
  id: string;
  ga4_enabled: boolean;
  ga4_measurement_id: string | null;
  ga4_property_name: string | null;
  ga4_test_measurement_id: string | null;
  ga4_use_test_in_dev: boolean;
  pixel_enabled: boolean;
  pixel_id: string | null;
  pixel_account_name: string | null;
  pixel_test_id: string | null;
  pixel_use_test_in_dev: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface AnalyticsConfigLog {
  id: string;
  action: string;
  field_changed: string | null;
  old_value_masked: string | null;
  new_value_masked: string | null;
  environment: string | null;
  changed_by: string | null;
  changed_at: string;
}

// Mask ID for display (show first 3 and last 2 characters)
export function maskId(id: string | null): string {
  if (!id || id.length < 6) return id || '';
  return `${id.slice(0, 3)}***${id.slice(-2)}`;
}

// Validate GA4 Measurement ID format
export function isValidGA4Id(id: string): boolean {
  return /^G-[A-Z0-9]{10,}$/i.test(id);
}

// Validate Meta Pixel ID format (numeric)
export function isValidPixelId(id: string): boolean {
  return /^\d{15,16}$/.test(id);
}

export function useAnalyticsConfig() {
  return useQuery({
    queryKey: ['analytics-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_config')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as AnalyticsConfig;
    },
  });
}

export function useAnalyticsConfigLogs() {
  return useQuery({
    queryKey: ['analytics-config-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_config_logs')
        .select('*')
        .order('changed_at', { ascending: false });
      
      if (error) throw error;
      return data as AnalyticsConfigLog[];
    },
  });
}

export function useUpdateAnalyticsConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<AnalyticsConfig> & { logAction?: string; logField?: string; oldValue?: string; newValue?: string }) => {
      const { logAction, logField, oldValue, newValue, ...configUpdates } = updates;

      // Get current config to find ID
      const { data: currentConfig, error: fetchError } = await supabase
        .from('analytics_config')
        .select('id')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // Update config
      const { data, error } = await supabase
        .from('analytics_config')
        .update({
          ...configUpdates,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', currentConfig.id)
        .select()
        .single();

      if (error) throw error;

      // Log the change
      if (logAction && logField) {
        await supabase.from('analytics_config_logs').insert({
          action: logAction,
          field_changed: logField,
          old_value_masked: oldValue ? maskId(oldValue) : null,
          new_value_masked: newValue ? maskId(newValue) : null,
          environment: import.meta.env.DEV ? 'development' : 'production',
          changed_by: user?.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-config'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-config-logs'] });
      toast.success('Configuração salva com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configuração');
      console.error('Error updating analytics config:', error);
    },
  });
}

// Public hook for script injection (no auth required)
export function usePublicAnalyticsConfig() {
  return useQuery({
    queryKey: ['public-analytics-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_config')
        .select('ga4_enabled, ga4_measurement_id, ga4_test_measurement_id, ga4_use_test_in_dev, pixel_enabled, pixel_id, pixel_test_id, pixel_use_test_in_dev')
        .limit(1)
        .single();
      
      if (error) return null;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
