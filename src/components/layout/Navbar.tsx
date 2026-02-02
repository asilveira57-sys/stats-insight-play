import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Menu, X, Zap, Trophy, BarChart3, Target, Newspaper, Crown, Search, 
  LogIn, LogOut, User, ChevronDown, Calendar, Shield, TrendingUp, 
  Award, FileText, CheckCircle, LineChart, Users, Settings, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import statballLogo from "@/assets/statball-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Estrutura de menu semântica
const menuStructure = {
  jogos: {
    label: "Jogos",
    icon: Calendar,
    items: [
      { href: "/resultados", label: "Jogos do Dia", description: "Resultados e próximos jogos" },
      { href: "/estatisticas", label: "Estatísticas", description: "Dados detalhados por partida" },
    ]
  },
  campeonatos: {
    label: "Campeonatos",
    icon: Trophy,
    items: [
      { href: "/campeonatos", label: "Todos os Campeonatos", description: "Explorar todas as competições" },
      { href: "/campeonatos/brasileirao-serie-a", label: "Brasileirão Série A", description: "Principal liga do Brasil" },
      { href: "/artilheiros", label: "Artilheiros", description: "Ranking de goleadores" },
    ]
  },
  times: {
    label: "Times",
    icon: Shield,
    items: [
      { href: "/times", label: "Todos os Times", description: "Explorar clubes e seleções" },
      { href: "/ranking-selecoes", label: "Seleções", description: "Ranking de seleções nacionais" },
      { href: "/confrontos", label: "Confrontos Diretos", description: "Histórico entre equipes" },
    ]
  },
  analises: {
    label: "Análises",
    icon: FileText,
    items: [
      { href: "/noticias", label: "Análises e Notícias", description: "Conteúdo analítico e séries" },
      { href: "/palpites", label: "Pré-Jogo", description: "Análise matemática antes do jogo" },
    ]
  },
  validacao: {
    label: "Validação",
    icon: CheckCircle,
    items: [
      { href: "/validacao/semanal", label: "Série Semanal", description: "Validação semanal de palpites" },
      { href: "/ranking/ia-vs-humanos", label: "IA vs Humanos", description: "Comparativo de acertos" },
      { href: "/retrospectiva/brasileirao-2024", label: "Retrospectiva", description: "Análise histórica completa" },
    ]
  },
  performance: {
    label: "Performance",
    icon: TrendingUp,
    items: [
      { href: "/performance/previsoes", label: "Visão Geral", description: "Dashboard de performance" },
      { href: "/evolucao", label: "Evolução", description: "Evolução semanal IA x Humanos" },
      { href: "/performance/evolucao-semanal", label: "Histórico Semanal", description: "Detalhes por semana" },
    ]
  },
};

// Links para mobile
const mobileLinks = [
  { href: "/", label: "Início", icon: Zap },
  { href: "/resultados", label: "Jogos", icon: Calendar },
  { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { href: "/noticias", label: "Análises", icon: FileText },
  { href: "/palpites", label: "Palpites", icon: Target },
  { href: "/validacao/semanal", label: "Validação", icon: CheckCircle },
  { href: "/evolucao", label: "Evolução", icon: TrendingUp },
  { href: "/performance/previsoes", label: "Performance", icon: LineChart },
  { href: "/ranking-selecoes", label: "Seleções", icon: Shield },
  { href: "/artilheiros", label: "Artilheiros", icon: Award },
  { href: "/confrontos", label: "Confrontos", icon: Users },
];

// Componente de Menu Dropdown
function NavDropdown({ 
  menuKey, 
  menu, 
  isActiveSection 
}: { 
  menuKey: string; 
  menu: typeof menuStructure.jogos; 
  isActiveSection: boolean;
}) {
  const Icon = menu.icon;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "nav-link flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md transition-colors",
            "hover:bg-muted/50 focus:outline-none",
            isActiveSection && "nav-link-active bg-primary/10 text-primary"
          )}
        >
          <Icon className="w-4 h-4" />
          {menu.label}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        sideOffset={8}
        className="w-64 bg-card border border-border shadow-xl z-50"
      >
        {menu.items.map((item) => (
          <DropdownMenuItem key={item.href} asChild className="cursor-pointer p-0">
            <Link 
              to={item.href} 
              className="flex flex-col gap-0.5 px-3 py-2.5 w-full hover:bg-muted rounded-sm"
            >
              <span className="text-sm font-medium text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const isActiveSection = (items: { href: string }[]) => {
    return items.some(item => location.pathname === item.href);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <img 
              src={statballLogo} 
              alt="StatBall Logo" 
              className="h-10 object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Início */}
            <Link
              to="/"
              className={cn(
                "nav-link flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md transition-colors",
                location.pathname === "/" && "nav-link-active bg-primary/10 text-primary"
              )}
            >
              <Zap className="w-4 h-4" />
              Início
            </Link>

            {/* Dropdowns */}
            <NavDropdown 
              menuKey="jogos" 
              menu={menuStructure.jogos} 
              isActiveSection={isActiveSection(menuStructure.jogos.items)} 
            />
            <NavDropdown 
              menuKey="campeonatos" 
              menu={menuStructure.campeonatos} 
              isActiveSection={isActiveSection(menuStructure.campeonatos.items)} 
            />
            <NavDropdown 
              menuKey="times" 
              menu={menuStructure.times} 
              isActiveSection={isActiveSection(menuStructure.times.items)} 
            />
            <NavDropdown 
              menuKey="analises" 
              menu={menuStructure.analises} 
              isActiveSection={isActiveSection(menuStructure.analises.items)} 
            />
            <NavDropdown 
              menuKey="validacao" 
              menu={menuStructure.validacao} 
              isActiveSection={isActiveSection(menuStructure.validacao.items)} 
            />
            <NavDropdown 
              menuKey="performance" 
              menu={menuStructure.performance} 
              isActiveSection={isActiveSection(menuStructure.performance.items)} 
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Theme Toggle */}
            <ThemeToggle className="hidden sm:flex" />
            
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Search className="w-5 h-5" />
            </Button>
            <Link to="/precos">
              <Button variant="premium" size="sm" className="hidden sm:flex">
                <Crown className="w-4 h-4" />
                Premium
              </Button>
            </Link>
            
            {/* Auth */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <User className="w-5 h-5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-secondary rounded-full" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border z-50">
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem asChild>
                    <Link to="/precos" className="flex items-center cursor-pointer">
                      <Star className="w-4 h-4 mr-2" />
                      Meu Plano
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/palpites" className="flex items-center cursor-pointer">
                      <Target className="w-4 h-4 mr-2" />
                      Meus Palpites
                    </Link>
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
          <div className="lg:hidden py-4 border-t border-border/50 animate-slide-up max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-1">
              {mobileLinks.map((link) => {
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
              
              {/* Theme Toggle Mobile */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 mt-2">
                <span className="text-sm text-muted-foreground">Tema</span>
                <ThemeToggle variant="outline" />
              </div>
              
              <div className="border-t border-border/50 mt-2 pt-2">
                <Link to="/precos" onClick={() => setIsOpen(false)}>
                  <Button variant="premium" className="w-full">
                    <Crown className="w-4 h-4" />
                    Clube Statball
                  </Button>
                </Link>
              </div>
              
              {/* Mobile Auth */}
              <div className="mt-2">
                {user ? (
                  <Button 
                    variant="outline" 
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
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
                    <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/10">
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar / Cadastrar
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
