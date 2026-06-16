import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";

interface Props {
  options: { id: string; name: string }[];
  activeId?: string | null;
  onPick: (id: string) => void;
}

export function DisambiguationChips({ options, activeId, onPick }: Props) {
  if (!options || options.length <= 1) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="flex items-center gap-1 text-muted-foreground">
        <HelpCircle className="h-3.5 w-3.5" /> Você quis dizer:
      </span>
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onPick(o.id)}>
          <Badge
            variant={o.id === activeId ? "default" : "outline"}
            className="cursor-pointer hover:bg-muted"
          >
            {o.name}
          </Badge>
        </button>
      ))}
    </div>
  );
}
