import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface DashboardFiltersProps {
  focusRegion: string;
  onRegionChange: (region: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function DashboardFilters({ focusRegion, onRegionChange, searchQuery, onSearchChange }: DashboardFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex gap-2">
        <Badge
          variant={focusRegion === 'BR' ? 'default' : 'outline'}
          className="cursor-pointer px-3 py-1.5 text-sm"
          onClick={() => onRegionChange('BR')}
        >
          🇧🇷 Brasil
        </Badge>
        <Badge
          variant={focusRegion === 'INT' ? 'default' : 'outline'}
          className="cursor-pointer px-3 py-1.5 text-sm"
          onClick={() => onRegionChange('INT')}
        >
          🌍 Internacional
        </Badge>
      </div>
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar time, liga..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>
    </div>
  );
}
