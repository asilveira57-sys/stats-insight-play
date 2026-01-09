import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  policyVersion: string;
}

export interface LgpdConfig {
  id: string;
  banner_enabled: boolean;
  banner_title: string;
  banner_text: string;
  category_essential_description: string;
  category_analytics_description: string;
  category_marketing_description: string;
  policy_version: string;
  policy_updated_at: string;
  updated_at: string;
  updated_by: string | null;
}

const CONSENT_STORAGE_KEY = 'statball_cookie_consent';

// Generate anonymous visitor hash
function generateVisitorHash(): string {
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width,
    screen.height,
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Get consent from localStorage
export function getStoredConsent(): CookieConsent | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading consent from storage:', e);
  }
  return null;
}

// Save consent to localStorage
export function saveConsent(consent: CookieConsent): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch (e) {
    console.error('Error saving consent to storage:', e);
  }
}

// Clear consent from localStorage
export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing consent from storage:', e);
  }
}

// Check if consent has been given
export function hasConsentBeenGiven(): boolean {
  return getStoredConsent() !== null;
}

// Check specific consent
export function hasAnalyticsConsent(): boolean {
  const consent = getStoredConsent();
  return consent?.analytics ?? false;
}

export function hasMarketingConsent(): boolean {
  const consent = getStoredConsent();
  return consent?.marketing ?? false;
}

// Hook to fetch LGPD config
export function useLgpdConfig() {
  return useQuery({
    queryKey: ['lgpd-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lgpd_config')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as LgpdConfig;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

// Hook to update LGPD config (admin only)
export function useUpdateLgpdConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<LgpdConfig> & { logChanges?: Array<{ field: string; oldValue: string; newValue: string }>; userId?: string }) => {
      const { logChanges, userId, ...configUpdates } = updates;

      // Get current config ID
      const { data: currentConfig, error: fetchError } = await supabase
        .from('lgpd_config')
        .select('id')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // Update config
      const { data, error } = await supabase
        .from('lgpd_config')
        .update({
          ...configUpdates,
          updated_at: new Date().toISOString(),
          updated_by: userId || null,
        })
        .eq('id', currentConfig.id)
        .select()
        .single();

      if (error) throw error;

      // Log changes
      if (logChanges && logChanges.length > 0) {
        for (const change of logChanges) {
          await supabase.from('lgpd_config_logs').insert({
            field_changed: change.field,
            old_value: change.oldValue,
            new_value: change.newValue,
            changed_by: userId || null,
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-config'] });
      queryClient.invalidateQueries({ queryKey: ['lgpd-config-logs'] });
      toast.success('Configuração LGPD salva');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configuração LGPD');
      console.error('Error updating LGPD config:', error);
    },
  });
}

// Hook to record consent
export function useRecordConsent() {
  const { data: config } = useLgpdConfig();

  return useMutation({
    mutationFn: async (params: { 
      analytics: boolean; 
      marketing: boolean; 
      action: 'accept_all' | 'reject_non_essential' | 'custom' | 'update' 
    }) => {
      const visitorHash = generateVisitorHash();
      
      // Save to localStorage
      const consent: CookieConsent = {
        essential: true,
        analytics: params.analytics,
        marketing: params.marketing,
        timestamp: new Date().toISOString(),
        policyVersion: config?.policy_version || '1.0',
      };
      saveConsent(consent);

      // Record in database for audit
      const { error } = await supabase.from('lgpd_consent_records').insert({
        visitor_hash: visitorHash,
        essential_accepted: true,
        analytics_accepted: params.analytics,
        marketing_accepted: params.marketing,
        policy_version: config?.policy_version || '1.0',
        user_agent_hash: btoa(navigator.userAgent.slice(0, 50)),
        action: params.action,
      });

      if (error) {
        console.error('Error recording consent:', error);
        // Don't throw - consent is already saved locally
      }

      return consent;
    },
  });
}

// Hook to fetch consent records (admin)
export function useConsentRecords(limit = 100) {
  return useQuery({
    queryKey: ['lgpd-consent-records', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lgpd_consent_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  });
}

// Hook to fetch config logs (admin)
export function useLgpdConfigLogs() {
  return useQuery({
    queryKey: ['lgpd-config-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lgpd_config_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });
}

// Hook to get consent stats (admin)
export function useConsentStats() {
  return useQuery({
    queryKey: ['lgpd-consent-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lgpd_consent_records')
        .select('analytics_accepted, marketing_accepted, action, created_at');
      
      if (error) throw error;

      const total = data.length;
      const analyticsAccepted = data.filter(r => r.analytics_accepted).length;
      const marketingAccepted = data.filter(r => r.marketing_accepted).length;
      const acceptAll = data.filter(r => r.action === 'accept_all').length;
      const rejectNonEssential = data.filter(r => r.action === 'reject_non_essential').length;
      const custom = data.filter(r => r.action === 'custom').length;

      // Last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentRecords = data.filter(r => new Date(r.created_at) > sevenDaysAgo);

      return {
        total,
        analyticsAccepted,
        marketingAccepted,
        acceptAll,
        rejectNonEssential,
        custom,
        analyticsRate: total > 0 ? Math.round((analyticsAccepted / total) * 100) : 0,
        marketingRate: total > 0 ? Math.round((marketingAccepted / total) * 100) : 0,
        last7Days: recentRecords.length,
      };
    },
  });
}
