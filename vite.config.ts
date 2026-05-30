import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { writeFileSync } from "fs";
import { componentTagger } from "lovable-tagger";

const SITEMAP_FN =
  "https://wlvwcbxegrmobefloikr.supabase.co/functions/v1/sitemap";

const SITEMAP_FILES: { filename: string; type: string; page?: number }[] = [
  { filename: "sitemap.xml", type: "index" },
  { filename: "sitemap-static.xml", type: "static" },
  { filename: "sitemap-noticias-1.xml", type: "noticias", page: 1 },
  { filename: "sitemap-partidas-1.xml", type: "partidas", page: 1 },
  { filename: "sitemap-partidas-2.xml", type: "partidas", page: 2 },
  { filename: "sitemap-times.xml", type: "times" },
  { filename: "sitemap-estatisticas.xml", type: "estatisticas" },
];

// Auto-regenerates public/sitemap*.xml from the live edge function on every build.
// Fails soft: if the function is unreachable, keeps the existing files and logs a warning.
function sitemapRegenPlugin(): Plugin {
  return {
    name: "statball-sitemap-regen",
    apply: "build",
    async buildStart() {
      console.log("[sitemap] regenerating from edge function...");
      for (const f of SITEMAP_FILES) {
        try {
          const params = new URLSearchParams({ type: f.type });
          if (f.page) params.set("page", String(f.page));
          const res = await fetch(`${SITEMAP_FN}?${params}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const xml = await res.text();
          writeFileSync(path.resolve(__dirname, "public", f.filename), xml);
          console.log(`[sitemap] wrote public/${f.filename} (${xml.length}b)`);
        } catch (e) {
          console.warn(
            `[sitemap] skip ${f.filename}: ${(e as Error).message} — keeping existing file`,
          );
        }
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    sitemapRegenPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
