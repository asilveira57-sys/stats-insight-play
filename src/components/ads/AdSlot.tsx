import { useUserPlan } from "@/hooks/useUserPlan";
import { useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

type AdPosition = "article-intro" | "article-mid" | "article-end";

interface AdSlotProps {
  position: AdPosition;
  className?: string;
}

// Slot IDs mapping - replace with actual AdSense slot IDs
const SLOT_CONFIG: Record<AdPosition, { slot: string; format: string; style: React.CSSProperties }> = {
  "article-intro": {
    slot: "", // preencher com o ID real do bloco criado no painel do AdSense
    format: "fluid",
    style: { minHeight: "100px" },
  },
  "article-mid": {
    slot: "", // preencher com o ID real do bloco criado no painel do AdSense
    format: "fluid",
    style: { minHeight: "120px" },
  },
  "article-end": {
    slot: "", // preencher com o ID real do bloco criado no painel do AdSense
    format: "auto",
    style: { minHeight: "250px" },
  },
};

// Pages where ads should NEVER appear
const AD_BLOCKED_PATHS = ["/precos", "/checkout", "/pagamento", "/assinatura"];

/**
 * AdSense slot component with automatic Premium detection.
 * - Free users: see ads
 * - Premium users: component renders nothing
 * - Blocked pages: no ads on pricing/checkout
 */
export function AdSlot({ position, className = "" }: AdSlotProps) {
  const { data: userPlan, isLoading } = useUserPlan();
  const location = useLocation();
  const adRef = useRef<HTMLModElement>(null);

  // Check if current path is blocked
  const isBlockedPath = AD_BLOCKED_PATHS.some((path) => 
    location.pathname.startsWith(path)
  );

  // Premium users never see ads. Robots and people get exactly the same page.
  const isPremium = !!userPlan?.isPremium;

  // Initialize AdSense when component mounts (production only)
  useEffect(() => {
    if (import.meta.env.PROD && adRef.current && !isPremium && !isBlockedPath) {
      try {
        // @ts-ignore - AdSense global
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, [isPremium, isBlockedPath]);

  // Don't render for Premium users or on blocked pages
  if (isPremium || isBlockedPath) {
    return null;
  }

  // Show loading placeholder while checking plan
  if (isLoading) {
    return null;
  }

  const config = SLOT_CONFIG[position];
  const isProduction = import.meta.env.PROD;

  // Sem ID real de bloco não há anúncio manual (o anúncio automático do <head> continua).
  if (isProduction && !config.slot) {
    return null;
  }

  // Development placeholder
  if (!isProduction) {
    return (
      <div
        className={`w-full bg-muted/20 border border-dashed border-border/40 rounded-lg flex items-center justify-center ${className}`}
        style={config.style}
        aria-label="Espaço publicitário"
        data-ad-position={position}
      >
        <span className="text-muted-foreground/40 text-xs uppercase tracking-wider">
          Publicidade
        </span>
      </div>
    );
  }

  // Production AdSense
  return (
    <div 
      className={`w-full overflow-hidden ${className}`} 
      aria-label="Espaço publicitário"
      data-ad-position={position}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", ...config.style }}
        data-ad-client="ca-pub-2204887945491050"
        data-ad-slot={config.slot}
        data-ad-format={config.format}
        data-ad-layout={config.format === "fluid" ? "in-article" : undefined}
        data-full-width-responsive="true"
      />
    </div>
  );
}
