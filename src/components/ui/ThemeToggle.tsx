import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ThemeToggle({ className, variant = "ghost", size = "icon" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        "relative transition-colors",
        className
      )}
      aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      <Sun className={cn(
        "h-5 w-5 transition-all text-yellow-400",
        theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"
      )} />
      <Moon className={cn(
        "absolute h-5 w-5 transition-all text-blue-300",
        theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"
      )} />
    </Button>
  );
}
