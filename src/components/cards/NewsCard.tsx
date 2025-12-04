import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface NewsCardProps {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  featured?: boolean;
}

export function NewsCard({ id, title, excerpt, image, date, featured }: NewsCardProps) {
  if (featured) {
    return (
      <Link
        to={`/noticias/${id}`}
        className="glass-card overflow-hidden group hover-glow block"
      >
        <div className="relative h-64 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium mb-3">
              Destaque
            </span>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {date}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/noticias/${id}`}
      className="glass-card overflow-hidden group hover-glow flex gap-4 p-4"
    >
      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{excerpt}</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {date}
        </div>
      </div>
    </Link>
  );
}
