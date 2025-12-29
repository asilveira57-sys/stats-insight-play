import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Zap, Trophy, BarChart3, Target, Newspaper, Crown, Search, LogIn, LogOut, User, Flag, Goal, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: "/", label: "Início", icon: Trophy },
  { href: "/resultados", label: "Resultados", icon: BarChart3 },
  { href: "/estatisticas", label: "Estatísticas", icon: Target },
  { href: "/palpites", label: "Palpites", icon: Zap },
  { href: "/ranking-selecoes", label: "Seleções", icon: Flag },
  { href: "/artilheiros", label: "Artilheiros", icon: Goal },
  { href: "/confrontos", label: "Confrontos", icon: Swords },
  { href: "/noticias", label: "Notícias", icon: Newspaper },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-secondary blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            </div>
            <span className="font-display font-bold text-xl gradient-text hidden sm:block">
              STATBALL
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "nav-link flex items-center gap-2 text-sm font-medium",
                    isActive && "nav-link-active"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Search className="w-5 h-5" />
            </Button>
            <Link to="/precos">
              <Button variant="premium" size="sm" className="hidden sm:flex">
                <Crown className="w-4 h-4" />
                Premium
              </Button>
            </Link>
            
            {/* Auth Button */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <User className="w-5 h-5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-secondary rounded-full" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  <DropdownMenuItem className="text-muted-foreground text-sm" disabled>
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="hidden sm:flex border-primary/50 text-primary hover:bg-primary/10">
                  <LogIn className="w-4 h-4 mr-1" />
                  Entrar
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-slide-up">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
              <Link to="/precos" onClick={() => setIsOpen(false)}>
                <Button variant="premium" className="w-full mt-2">
                  <Crown className="w-4 h-4" />
                  Assinar Premium
                </Button>
              </Link>
              
              {/* Mobile Auth */}
              {user ? (
                <Button 
                  variant="outline" 
                  className="w-full mt-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              ) : (
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full mt-2 border-primary/50 text-primary hover:bg-primary/10">
                    <LogIn className="w-4 h-4 mr-2" />
                    Entrar / Cadastrar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
