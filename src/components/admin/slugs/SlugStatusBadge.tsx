import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lock, AlertCircle, Check } from "lucide-react";
import { SlugStatus } from "@/hooks/useSlugAdmin";

interface SlugStatusBadgeProps {
  status: SlugStatus;
  conflictCount?: number;
}

export function SlugStatusBadge({ status, conflictCount }: SlugStatusBadgeProps) {
  switch (status) {
    case "no_slug":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          SEM SLUG
        </Badge>
      );
    case "conflict":
      return (
        <Badge variant="destructive" className="gap-1 bg-orange-500 hover:bg-orange-600">
          <AlertTriangle className="h-3 w-3" />
          CONFLITO {conflictCount && `(${conflictCount})`}
        </Badge>
      );
    case "locked":
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 hover:bg-green-200">
          <Lock className="h-3 w-3" />
          TRAVADO
        </Badge>
      );
    case "editable":
      return (
        <Badge variant="outline" className="gap-1">
          <Check className="h-3 w-3" />
          OK
        </Badge>
      );
    default:
      return null;
  }
}
