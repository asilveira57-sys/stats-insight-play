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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

// Estrutura de menu semântica orientada ao usuário
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
    href: "/campeonatos",
    items: [
      { href: "/campeonatos/brasileirao-serie-a", label: "Brasileirão Série A", description: "Principal liga do Brasil" },
      { href: "/campeonatos/brasileirao-serie-b", label: "Brasileirão Série B", description: "Segunda divisão" },
      { href: "/artilheiros", label: "Artilheiros", description: "Ranking de goleadores" },
    ]
  },
  times: {
    label: "Times",
    icon: Shield,
    href: "/times",
    items: [
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

// Links simples para mobile
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

          {/* Desktop Navigation com Dropdowns */}
          <div className="hidden lg:flex items-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {/* Início */}
                <NavigationMenuItem>
                  <Link to="/">
                    <NavigationMenuLink 
                      className={cn(
                        "nav-link flex items-center gap-2 text-sm font-medium px-3 py-2",
                        location.pathname === "/" && "nav-link-active"
                      )}
                    >
                      <Zap className="w-4 h-4" />
                      Início
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {/* Jogos */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      "nav-link text-sm font-medium bg-transparent data-[state=open]:bg-muted/50",
                      isActiveSection(menuStructure.jogos.items) && "nav-link-active"
                    )}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Jogos
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2 bg-card border border-border rounded-lg shadow-xl">
                      {menuStructure.jogos.items.map((item) => (
                        <li key={item.href}>
                          <Link to={item.href}>
                            <NavigationMenuLink className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted focus:bg-muted">
                              <div className="text-sm font-medium text-foreground">{item.label}</div>
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </NavigationMenuLink>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Campeonatos */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      "nav-link text-sm font-medium bg-transparent data-[state=open]:bg-muted/50",
                      isActiveSection(menuStructure.campeonatos.items) && "nav-link-active"
                    )}
                  >
                    <Trophy className="w-4 h-4 mr-1" />
                    Campeonatos
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2 bg-card border border-border rounded-lg shadow-xl">
                      {menuStructure.campeonatos.items.map((item) => (
                        <li key={item.href}>
                          <Link to={item.href}>
                            <NavigationMenuLink className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted focus:bg-muted">
                              <div className="text-sm font-medium text-foreground">{item.label}</div>
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </NavigationMenuLink>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Times */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      "nav-link text-sm font-medium bg-transparent data-[state=open]:bg-muted/50",
                      isActiveSection(menuStructure.times.items) && "nav-link-active"
                    )}
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    Times
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2 bg-card border border-border rounded-lg shadow-xl">
                      {menuStructure.times.items.map((item) => (
                        <li key={item.href}>
                          <Link to={item.href}>
                            <NavigationMenuLink className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted focus:bg-muted">
                              <div className="text-sm font-medium text-foreground">{item.label}</div>
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </NavigationMenuLink>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Análises */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      "nav-link text-sm font-medium bg-transparent data-[state=open]:bg-muted/50",
                      isActiveSection(menuStructure.analises.items) && "nav-link-active"
                    )}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Análises
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2 bg-card border border-border rounded-lg shadow-xl">
                      {menuStructure.analises.items.map((item) => (
                        <li key={item.href}>
                          <Link to={item.href}>
                            <NavigationMenuLink className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted focus:bg-muted">
                              <div className="text-sm font-medium text-foreground">{item.label}</div>
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </NavigationMenuLink>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Validação */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      "nav-link text-sm font-medium bg-transparent data-[state=open]:bg-muted/50",
                      isActiveSection(menuStructure.validacao.items) && "nav-link-active"
                    )}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Validação
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2 bg-card border border-border rounded-lg shadow-xl">
                      {menuStructure.validacao.items.map((item) => (
                        <li key={item.href}>
                          <Link to={item.href}>
                            <NavigationMenuLink className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted focus:bg-muted">
                              <div className="text-sm font-medium text-foreground">{item.label}</div>
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </NavigationMenuLink>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Performance */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      "nav-link text-sm font-medium bg-transparent data-[state=open]:bg-muted/50",
                      isActiveSection(menuStructure.performance.items) && "nav-link-active"
                    )}
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Performance
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-1 p-2 bg-card border border-border rounded-lg shadow-xl">
                      {menuStructure.performance.items.map((item) => (
                        <li key={item.href}>
                          <Link to={item.href}>
                            <NavigationMenuLink className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted focus:bg-muted">
                              <div className="text-sm font-medium text-foreground">{item.label}</div>
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            </NavigationMenuLink>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
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
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
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
