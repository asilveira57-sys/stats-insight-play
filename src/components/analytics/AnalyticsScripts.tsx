import { useEffect, useRef, useState } from "react";
import { usePublicAnalyticsConfig } from "@/hooks/useAnalyticsConfig";
import { hasAnalyticsConsent, hasMarketingConsent, hasConsentBeenGiven } from "@/hooks/useLgpdConsent";

export function AnalyticsScripts() {
  const { data: config } = usePublicAnalyticsConfig();
  const ga4Loaded = useRef(false);
  const pixelLoaded = useRef(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Check consent on mount and when consent changes
  useEffect(() => {
    setConsentChecked(true);
  }, []);

  // Determine which IDs to use based on environment
  const isDev = import.meta.env.DEV;
  
  // LGPD: Only load GA4 if consent has been given for analytics
  const hasAnalytics = hasConsentBeenGiven() && hasAnalyticsConsent();
  const ga4Id = config?.ga4_enabled && hasAnalytics
    ? (isDev && config.ga4_use_test_in_dev && config.ga4_test_measurement_id 
        ? config.ga4_test_measurement_id 
        : config.ga4_measurement_id)
    : null;

  // LGPD: Only load Pixel if consent has been given for marketing
  const hasMarketing = hasConsentBeenGiven() && hasMarketingConsent();
  const pixelId = config?.pixel_enabled && hasMarketing
    ? (isDev && config.pixel_use_test_in_dev && config.pixel_test_id 
        ? config.pixel_test_id 
        : config.pixel_id)
    : null;

  // Google Analytics 4 - Only load with consent
  useEffect(() => {
    if (!consentChecked || !ga4Id || ga4Loaded.current) return;
    
    // Check if script already exists
    if (document.querySelector(`script[src*="googletagmanager.com/gtag"]`)) {
      ga4Loaded.current = true;
      return;
    }

    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
    document.head.appendChild(script);

    // Initialize gtag
    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${ga4Id}');
    `;
    document.head.appendChild(inlineScript);

    ga4Loaded.current = true;
  }, [ga4Id, consentChecked]);

  // Meta Pixel - Only load with consent
  useEffect(() => {
    if (!consentChecked || !pixelId || pixelLoaded.current) return;
    
    // Check if script already exists
    if (document.querySelector(`script[src*="connect.facebook.net"]`) || (window as any).fbq) {
      pixelLoaded.current = true;
      return;
    }

    // Load Meta Pixel
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Add noscript fallback
    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);

    pixelLoaded.current = true;
  }, [pixelId, consentChecked]);

  // Track page views on route changes for Meta Pixel
  useEffect(() => {
    if (!pixelId || !(window as any).fbq) return;

    const handleRouteChange = () => {
      (window as any).fbq('track', 'PageView');
    };

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [pixelId]);

  return null;
}

// Helper functions for tracking custom events (only fire if consent given)
export function trackGA4Event(eventName: string, params?: Record<string, any>) {
  if (hasAnalyticsConsent() && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}

export function trackPixelEvent(eventName: string, params?: Record<string, any>) {
  if (hasMarketingConsent() && (window as any).fbq) {
    (window as any).fbq('track', eventName, params);
  }
}

// Predefined events for Clube Aleball
export const AnalyticsEvents = {
  viewContent: (params?: { content_name?: string; content_category?: string }) => {
    trackGA4Event('view_content', params);
    trackPixelEvent('ViewContent', params);
  },
  lead: (params?: { content_name?: string }) => {
    trackGA4Event('generate_lead', params);
    trackPixelEvent('Lead', params);
  },
  subscribe: (params?: { value?: number; currency?: string }) => {
    trackGA4Event('subscribe', params);
    trackPixelEvent('Subscribe', params);
  },
  beginCheckout: (params?: { value?: number; currency?: string }) => {
    trackGA4Event('begin_checkout', params);
    trackPixelEvent('InitiateCheckout', params);
  },
  purchase: (params?: { value?: number; currency?: string; transaction_id?: string }) => {
    trackGA4Event('purchase', params);
    trackPixelEvent('Purchase', params);
  },
};
