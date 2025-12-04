import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "primary" | "secondary";
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  variant = "default",
}: StatCardProps) {
  const variants = {
    default: "bg-card border-border",
    primary: "bg-primary/10 border-primary/30",
    secondary: "bg-secondary/10 border-secondary/30",
  };

  const iconVariants = {
    default: "text-muted-foreground",
    primary: "text-primary",
    secondary: "text-secondary",
  };

  return (
    <div className={cn(
      "stat-card border",
      variants[variant]
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          variant === "default" ? "bg-muted" : variant === "primary" ? "bg-primary/20" : "bg-secondary/20"
        )}>
          <Icon className={cn("w-5 h-5", iconVariants[variant])} />
        </div>
        {trend && trendValue && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend === "up" && "text-secondary bg-secondary/10",
            trend === "down" && "text-destructive bg-destructive/10",
            trend === "neutral" && "text-muted-foreground bg-muted"
          )}>
            {trend === "up" && "↑"} {trend === "down" && "↓"} {trendValue}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold font-display">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
