import { Link } from "react-router-dom";
import {
  Zap,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Shield,
  Lock,
  Code2,
  ChevronDown,
} from "lucide-react";
import { CookiePreferencesButton } from "@/components/privacy/CookieConsentBanner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const nav = [
  { to: "/", label: "Início" },
  { to: "/resultados", label: "Resultados" },
  { to: "/estatisticas", label: "Estatísticas" },
  { to: "/times", label: "Clubes" },
  { to: "/campeonatos", label: "Competições" },
  { to: "/palpites", label: "Palpites" },
  { to: "/ranking", label: "Rankings" },
  { to: "/noticias", label: "Blog" },
];

const institucional = [
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
  { to: "/transparencia", label: "Transparência Editorial" },
  { to: "/sitemap.xml", label: "Sitemap", external: true },
  { to: "/trabalhe-conosco", label: "Trabalhe Conosco" },
  { to: "/parceiros", label: "Parceiros" },
];

const legal = [
  { to: "/privacidade", label: "Política de Privacidade" },
  { to: "/cookies", label: "Política de Cookies" },
  { to: "/termos", label: "Termos de Uso" },
  { to: "/lgpd", label: "LGPD" },
];

const linkClass =
  "text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]";

function RenderLink({ to, label, external }: { to: string; label: string; external?: boolean }) {
  if (external) {
    return (
      <a href={to} className={linkClass} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link to={to} className={linkClass}>
      {label}
    </Link>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      aria-label="Rodapé do Aleball"
      className="dark relative bg-gradient-to-b from-surface-1 to-background border-t border-border/50 mt-auto"
    >
      {/* Top neon accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container mx-auto px-4 py-14 lg:py-16">
        {/* Desktop / Tablet grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* COLUNA 1 — MARCA */}
          <div className="lg:col-span-4">
            <Link to="/" className="flex items-center gap-2.5 mb-5 group" aria-label="Aleball — Página inicial">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.35)] group-hover:shadow-[0_0_28px_hsl(var(--primary)/0.55)] transition-shadow">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-2xl gradient-text tracking-wide">
                ALEBALL
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-sm">
              Portal inteligente de estatísticas, análises e tendências do futebol.
            </p>

            <div className="flex gap-2.5 mb-5" aria-label="Redes sociais">
              {[
                { Icon: Twitter, label: "Twitter" },
                { Icon: Instagram, label: "Instagram" },
                { Icon: Youtube, label: "YouTube" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-10 h-10 rounded-lg bg-surface-2 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_15px_hsl(var(--primary)/0.25)] transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            <a
              href="mailto:contato@aleball.com"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-5"
            >
              <Mail className="w-4 h-4" />
              contato@aleball.com
            </a>

            <div className="rounded-lg border border-border/40 bg-surface-2/50 p-3 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-secondary mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este site <span className="text-foreground/90 font-medium">não é uma plataforma de apostas</span>. Fornecemos conteúdo estatístico e informativo.
              </p>
            </div>
          </div>

          {/* COLUNA 2 — NAVEGAÇÃO */}
          <nav className="lg:col-span-2" aria-label="Navegação">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground/90 mb-5">
              Navegação
            </h4>
            <ul className="space-y-2.5">
              {nav.map((item) => (
                <li key={item.to}>
                  <RenderLink {...item} />
                </li>
              ))}
            </ul>
          </nav>

          {/* COLUNA 3 — INSTITUCIONAL */}
          <nav className="lg:col-span-2" aria-label="Institucional">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground/90 mb-5">
              Institucional
            </h4>
            <ul className="space-y-2.5">
              {institucional.map((item) => (
                <li key={item.to}>
                  <RenderLink {...item} />
                </li>
              ))}
            </ul>
          </nav>

          {/* COLUNA 4 — LEGAL */}
          <nav className="lg:col-span-2" aria-label="Legal">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground/90 mb-5">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {legal.map((item) => (
                <li key={item.to}>
                  <RenderLink {...item} />
                </li>
              ))}
              <li>
                <CookiePreferencesButton />
              </li>
            </ul>
          </nav>

          {/* COLUNA 5 — TECNOLOGIA */}
          <div className="lg:col-span-2">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground/90 mb-5">
              Tecnologia
            </h4>
            <div className="rounded-xl border border-border/50 bg-gradient-to-br from-surface-2 to-surface-1 p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 mb-3">
                  <Code2 className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Powered by
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  Alexandre Silveira
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mlfacil Consultoria e Sistemas
                </p>
                <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">Sistema operacional</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile accordion */}
        <div className="md:hidden">
          {/* Brand block always visible on mobile */}
          <div className="mb-6">
            <Link to="/" className="flex items-center gap-2.5 mb-4" aria-label="Aleball">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_18px_hsl(var(--primary)/0.35)]">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl gradient-text tracking-wide">
                ALEBALL
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Portal inteligente de estatísticas, análises e tendências do futebol.
            </p>
            <div className="flex gap-2.5 mb-4">
              {[
                { Icon: Twitter, label: "Twitter" },
                { Icon: Instagram, label: "Instagram" },
                { Icon: Youtube, label: "YouTube" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-10 h-10 rounded-lg bg-surface-2 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
            <a
              href="mailto:contato@aleball.com"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Mail className="w-4 h-4" />
              contato@aleball.com
            </a>
          </div>

          <Accordion type="multiple" className="border-y border-border/40">
            <AccordionItem value="nav" className="border-border/40">
              <AccordionTrigger className="font-display text-sm uppercase tracking-wider">
                Navegação
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 pb-2">
                  {nav.map((item) => (
                    <li key={item.to}><RenderLink {...item} /></li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="inst" className="border-border/40">
              <AccordionTrigger className="font-display text-sm uppercase tracking-wider">
                Institucional
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 pb-2">
                  {institucional.map((item) => (
                    <li key={item.to}><RenderLink {...item} /></li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="legal" className="border-border/40">
              <AccordionTrigger className="font-display text-sm uppercase tracking-wider">
                Legal
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 pb-2">
                  {legal.map((item) => (
                    <li key={item.to}><RenderLink {...item} /></li>
                  ))}
                  <li><CookiePreferencesButton /></li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Tech badge mobile */}
          <div className="mt-6 rounded-xl border border-border/50 bg-gradient-to-br from-surface-2 to-surface-1 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 mb-2">
                <Code2 className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Powered by
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">Alexandre Silveira</p>
              <p className="text-xs text-muted-foreground">Mlfacil Consultoria e Sistemas</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border/40 bg-surface-2/50 p-3 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-secondary mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Este site <span className="text-foreground/90 font-medium">não é uma plataforma de apostas</span>. Conteúdo estatístico e informativo.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/40 bg-background/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © {year} <span className="text-foreground/90 font-semibold">Aleball</span>. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-4 text-xs">
            <Link to="/privacidade" className="text-muted-foreground hover:text-primary transition-colors">
              Privacidade
            </Link>
            <span className="text-border">•</span>
            <Link to="/termos" className="text-muted-foreground hover:text-primary transition-colors">
              Termos
            </Link>
            <span className="text-border">•</span>
            <Link to="/cookies" className="text-muted-foreground hover:text-primary transition-colors">
              Cookies
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/10 border border-secondary/30">
              <Lock className="w-3 h-3 text-secondary" />
              <span className="text-[10px] font-medium text-secondary uppercase tracking-wider">
                SSL Seguro
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30">
              <Shield className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
                LGPD
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
