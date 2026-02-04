import { cn } from "@/lib/utils";

interface TeamBadgeProps {
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Generate initials from team name or use short_code
function getInitials(name: string): string {
  if (!name) return '??';
  
  // If it looks like a short code already (2-4 uppercase), use it directly
  if (/^[A-Z]{2,4}$/.test(name)) {
    return name;
  }
  
  // Common prefixes/suffixes to remove for cleaner initials
  const cleanName = name
    .replace(/^(FC|CF|AC|AS|SC|RC|CA|CD|AD|SL|SE|EC|CR|GD|UD|SD)\s+/i, '')
    .replace(/\s+(FC|CF|SC|AC|AF|IF)$/i, '')
    .replace(/^Club\s+/i, '')
    .replace(/\s+Club$/i, '');
  
  const words = cleanName.split(/[\s-]+/).filter(w => w.length > 0);
  
  if (words.length === 1) {
    // Single word: take first 2-3 letters
    return words[0].substring(0, 3).toUpperCase();
  }
  
  // Multiple words: take first letter of each (max 3)
  return words
    .slice(0, 3)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

// Size configurations
const sizeConfig = {
  sm: { container: 'w-6 h-6', text: 'text-[8px]' },
  md: { container: 'w-10 h-10', text: 'text-xs' },
  lg: { container: 'w-12 h-12', text: 'text-sm' },
  xl: { container: 'w-16 h-16', text: 'text-base' },
};

export function TeamBadge({
  name,
  primaryColor = '#6B7280',
  secondaryColor = '#FFFFFF',
  size = 'md',
  className,
}: TeamBadgeProps) {
  const initials = getInitials(name);
  const config = sizeConfig[size];
  
  return (
    <div
      className={cn(
        config.container,
        "rounded-full flex items-center justify-center font-bold shadow-md transition-transform hover:scale-105",
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        color: secondaryColor,
        boxShadow: `0 2px 8px ${primaryColor}40`,
      }}
      title={name}
    >
      <span className={cn(config.text, "font-bold tracking-tight leading-none")}>
        {initials}
      </span>
    </div>
  );
}
