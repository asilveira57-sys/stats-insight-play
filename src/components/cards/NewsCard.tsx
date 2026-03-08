import { Calendar, Clock, Newspaper } from "lucide-react";

interface NewsCardProps {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  slug?: string;
  featured?: boolean;
}

// Estimate reading time from excerpt (full article is ~5x longer)
function estimateReadingTime(excerpt: string): number {
  const words = excerpt.split(/\s+/).length;
  // Excerpt is typically ~150 chars, full article ~1500+ words
  return Math.max(5, Math.ceil((words * 10) / 200));
}

const FALLBACK_GRADIENT = "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--muted) / 0.8))";

export function NewsCard({ title, excerpt, image, date, featured }: NewsCardProps) {
  const readingTime = estimateReadingTime(excerpt);

  if (featured) {
    return (
      <article className="glass-card overflow-hidden group hover-glow block cursor-pointer">
        <div className="relative h-64 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.style.background = FALLBACK_GRADIENT;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50" style={{ background: FALLBACK_GRADIENT }}>
              <Newspaper className="w-12 h-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium mb-3">
              Análise em Destaque
            </span>
            <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{excerpt}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {date}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {readingTime} min
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="glass-card overflow-hidden group hover-glow flex gap-4 p-4 cursor-pointer">
      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.style.background = FALLBACK_GRADIENT;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg" style={{ background: FALLBACK_GRADIENT }}>
            <Newspaper className="w-6 h-6 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{excerpt}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {date}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {readingTime} min
          </div>
        </div>
      </div>
    </article>
  );
}
