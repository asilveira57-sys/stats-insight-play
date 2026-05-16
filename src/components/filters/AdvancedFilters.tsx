import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, CalendarIcon, X, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FilterValues {
  search: string;
  dateFrom: string | null; // YYYY-MM-DD
  dateTo: string | null;
  ligaId: string | null;
  temporada: string | null;
}

export const EMPTY_FILTERS: FilterValues = {
  search: "",
  dateFrom: null,
  dateTo: null,
  ligaId: null,
  temporada: null,
};

interface AdvancedFiltersProps {
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showDates?: boolean;
  showLeague?: boolean;
  showSeason?: boolean;
  className?: string;
}

function useLeagues() {
  return useQuery({
    queryKey: ["filter-leagues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ligas")
        .select("id, nome, codigo_api")
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

const SEASONS = (() => {
  const current = new Date().getFullYear();
  const arr: string[] = [];
  for (let y = current + 1; y >= 2018; y--) arr.push(String(y));
  return arr;
})();

export function AdvancedFilters({
  value,
  onChange,
  searchPlaceholder = "Buscar por time, liga ou título...",
  showSearch = true,
  showDates = true,
  showLeague = true,
  showSeason = true,
  className,
}: AdvancedFiltersProps) {
  const [searchLocal, setSearchLocal] = useState(value.search);
  const { data: leagues } = useLeagues();

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchLocal !== value.search) onChange({ ...value, search: searchLocal });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  useEffect(() => {
    setSearchLocal(value.search);
  }, [value.search]);

  const hasActive =
    !!value.search || !!value.dateFrom || !!value.dateTo || !!value.ligaId || !!value.temporada;

  const clear = () => {
    setSearchLocal("");
    onChange({ ...EMPTY_FILTERS });
  };

  return (
    <div className={cn("glass-card p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          Filtros
        </div>
        {hasActive && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-7 text-xs gap-1">
            <X className="w-3 h-3" /> Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {showSearch && (
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchLocal}
              onChange={(e) => setSearchLocal(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}

        {showLeague && (
          <Select
            value={value.ligaId ?? "all"}
            onValueChange={(v) => onChange({ ...value, ligaId: v === "all" ? null : v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Campeonato" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-72">
              <SelectItem value="all">Todos os campeonatos</SelectItem>
              {leagues?.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showSeason && (
          <Select
            value={value.temporada ?? "all"}
            onValueChange={(v) => onChange({ ...value, temporada: v === "all" ? null : v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-72">
              <SelectItem value="all">Todas as temporadas</SelectItem>
              {SEASONS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showDates && (
          <>
            <DateField
              label="De"
              value={value.dateFrom}
              onChange={(d) => onChange({ ...value, dateFrom: d })}
            />
            <DateField
              label="Até"
              value={value.dateTo}
              onChange={(d) => onChange({ ...value, dateTo: d })}
            />
          </>
        )}
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (d: string | null) => void;
}) {
  const date = value ? new Date(value + "T12:00:00") : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(date!, "dd/MM/yyyy", { locale: ptBR }) : <span>{label}</span>}
          {value && (
            <X
              className="ml-auto h-3.5 w-3.5 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
