import { useUserPlan } from "@/hooks/useUserPlan";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

/**
 * AdSense banner component that only renders for non-Premium users.
 * Premium users see nothing (no ads).
 */
export function AdBanner({ slot, format = "auto", className = "" }: AdBannerProps) {
  const { data: userPlan, isLoading } = useUserPlan();

  // Don't show ads to Premium users
  if (isLoading || userPlan?.isPremium) {
    return null;
  }

  // Placeholder for development - replace with actual AdSense code in production
  // The actual AdSense script should be added to index.html
  const isProduction = import.meta.env.PROD;

  if (!isProduction) {
    // Development placeholder
    return (
      <div 
        className={`w-full bg-muted/20 border border-border/30 rounded-lg flex items-center justify-center ${className}`}
        style={{ minHeight: format === "horizontal" ? "90px" : format === "rectangle" ? "250px" : "100px" }}
        aria-label="Espaço publicitário"
      >
        <span className="text-muted-foreground/50 text-sm">Publicidade</span>
      </div>
    );
  }

  // Production AdSense code
  return (
    <div className={`w-full overflow-hidden ${className}`} aria-label="Espaço publicitário">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // TODO: Replace with actual AdSense publisher ID
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
