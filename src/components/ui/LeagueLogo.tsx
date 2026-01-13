import { useState } from "react";
import { cn } from "@/lib/utils";

// Mapeamento de países para bandeiras emoji
const countryFlags: Record<string, string> = {
  'Brasil': '🇧🇷',
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'Colômbia': '🇨🇴',
  'Colombia': '🇨🇴',
  'Chile': '🇨🇱',
  'Uruguai': '🇺🇾',
  'Uruguay': '🇺🇾',
  'Paraguai': '🇵🇾',
  'Paraguay': '🇵🇾',
  'Peru': '🇵🇪',
  'Equador': '🇪🇨',
  'Ecuador': '🇪🇨',
  'México': '🇲🇽',
  'Mexico': '🇲🇽',
  'Estados Unidos': '🇺🇸',
  'United States': '🇺🇸',
  'USA': '🇺🇸',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Espanha': '🇪🇸',
  'Spain': '🇪🇸',
  'Alemanha': '🇩🇪',
  'Germany': '🇩🇪',
  'Itália': '🇮🇹',
  'Italy': '🇮🇹',
  'França': '🇫🇷',
  'France': '🇫🇷',
  'Portugal': '🇵🇹',
  'Holanda': '🇳🇱',
  'Netherlands': '🇳🇱',
  'Países Baixos': '🇳🇱',
  'Bélgica': '🇧🇪',
  'Belgium': '🇧🇪',
  'Internacional': '🌍',
  'International': '🌍',
  'Europe': '🇪🇺',
  'South America': '🌎',
  'World': '🌍',
};

export const getCountryFlag = (country: string | null): string => {
  if (!country) return '🏆';
  return countryFlags[country] || '🏆';
};

interface LeagueLogoProps {
  logoUrl: string | null;
  name: string;
  country?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 text-sm',
  md: 'w-5 h-5 text-base',
  lg: 'w-14 h-14 text-2xl',
};

export function LeagueLogo({ logoUrl, name, country, size = 'md', className }: LeagueLogoProps) {
  const [imgError, setImgError] = useState(false);
  
  const sizeClass = sizeClasses[size];
  const flag = getCountryFlag(country ?? null);

  // Se não tem URL ou deu erro, mostra fallback
  if (!logoUrl || imgError) {
    return (
      <span className={cn(sizeClass, className)} role="img" aria-label={name}>
        {flag}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      className={cn(sizeClass, "object-contain", className)}
      onError={() => setImgError(true)}
    />
  );
}
