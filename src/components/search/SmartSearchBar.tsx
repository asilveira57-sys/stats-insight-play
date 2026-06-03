import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SmartSearchBarProps {
  autoFocus?: boolean;
  size?: "default" | "lg";
  className?: string;
  initialValue?: string;
  onSubmit?: (q: string) => void;
  loading?: boolean;
}

export function SmartSearchBar({
  autoFocus,
  size = "lg",
  className,
  initialValue = "",
  onSubmit,
  loading,
}: SmartSearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const submit = () => {
    const q = value.trim();
    if (!q) return;
    if (onSubmit) onSubmit(q);
    else navigate(`/pesquisa?q=${encodeURIComponent(q)}`);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className={cn("w-full max-w-3xl mx-auto", className)}>
      <div className="relative flex items-center gap-2 bg-card border-2 border-border rounded-full shadow-lg hover:shadow-xl transition-shadow focus-within:border-primary">
        <Search className={cn("absolute left-5 text-muted-foreground", size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder="Pesquise times, jogadores, campeonatos, estatísticas ou faça uma pergunta sobre futebol"
          className={cn(
            "border-0 bg-transparent rounded-full pl-14 pr-32 focus-visible:ring-0 focus-visible:ring-offset-0",
            size === "lg" ? "h-14 text-base md:text-lg" : "h-11 text-sm",
          )}
        />
        <Button
          onClick={submit}
          disabled={loading || !value.trim()}
          className={cn("absolute right-1.5 rounded-full", size === "lg" ? "h-11 px-6" : "h-9 px-4")}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pesquisar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2 hidden md:block">
        Dica: pressione <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">/</kbd> para focar a busca
      </p>
    </div>
  );
}
