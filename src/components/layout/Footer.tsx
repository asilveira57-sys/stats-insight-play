import { Link } from "react-router-dom";
import { Zap, Twitter, Instagram, Youtube, Mail } from "lucide-react";
import { CookiePreferencesButton } from "@/components/privacy/CookieConsentBanner";

export function Footer() {
  return (
    <footer className="dark bg-surface-1 border-t border-border/50 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl gradient-text">
                STATBALL
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Portal inteligente de resultados, estatísticas e palpites matemáticos de futebol.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Navegação</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Início</Link></li>
              <li><Link to="/resultados" className="hover:text-primary transition-colors">Resultados</Link></li>
              <li><Link to="/estatisticas" className="hover:text-primary transition-colors">Estatísticas</Link></li>
              <li><Link to="/palpites" className="hover:text-primary transition-colors">Palpites</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Premium</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/precos" className="hover:text-primary transition-colors">Planos</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors">Suporte</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><CookiePreferencesButton /></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                contato@statball.com
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Este site não é uma plataforma de apostas. Fornecemos apenas análises estatísticas.
            </p>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 StatBall. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
