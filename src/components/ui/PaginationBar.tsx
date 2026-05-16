import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationBar({ page, pageSize, total, onPageChange, className }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  if (total <= pageSize) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className || ""}`}>
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{from}–{to}</span> de{" "}
        <span className="font-medium text-foreground">{total.toLocaleString("pt-BR")}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="px-3 text-sm font-medium tabular-nums">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
