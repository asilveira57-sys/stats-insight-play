import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Library, ArrowRight } from "lucide-react";
import statballLogo from "@/assets/statball-logo.png";
import heroBackground from "@/assets/hero-background.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Layer 1: Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />
      
      {/* Layer 2: Dark Overlay */}
      <div className="absolute inset-0 bg-background/85 dark:bg-background/80" />
      
      {/* Layer 3: Gradient edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />
      
      {/* Layer 4: Subtle glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Layer 5: Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Logo - 150-200% larger than navbar */}
          <div className="mb-8 flex justify-center">
            <img 
              src={statballLogo} 
              alt="StatBall" 
              className="h-20 md:h-24 lg:h-28 object-contain drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
            />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold font-display mb-6 text-foreground leading-tight">
            A maior biblioteca de dados e análises do futebol mundial
          </h1>
          
          {/* Subtitle - slightly muted but still solid color */}
          <p className="text-lg md:text-xl lg:text-2xl text-foreground/80 mb-10 max-w-3xl mx-auto leading-relaxed">
            Uma plataforma que organiza dados reais, valida análises e acompanha a evolução do futebol jogo após jogo.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="xl" className="text-lg shadow-lg shadow-primary/20">
              <Link to="/campeonatos">
                <Library className="mr-2 h-5 w-5" />
                Explorar a biblioteca
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="text-lg bg-background/50 backdrop-blur-sm">
              <Link to="/precos">
                Conhecer o Clube Statball
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
