import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ArticleProgress {
  total: number;
  processed: number;
  remaining: number;
}

interface ProcessedArticle {
  partida_id: string;
  time_casa: string;
  time_fora: string;
  data: string;
  word_count: number;
  slug: string;
  success: boolean;
  error?: string;
}

interface GenerationResult {
  success: boolean;
  message: string;
  processed?: ProcessedArticle[];
  progress: ArticleProgress;
  error?: string;
}

export function useRetroactiveArticles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResults, setLastResults] = useState<ProcessedArticle[]>([]);

  // Fetch progress stats
  const { data: progress, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ["retroactive-articles-progress"],
    queryFn: async (): Promise<ArticleProgress> => {
      // Get total finished matches
      const { count: totalMatches } = await supabase
        .from("partidas")
        .select("*", { count: "exact", head: true })
        .eq("status", "finished");

      // Get news with partida_id (linked to matches)
      const { count: processedNews } = await supabase
        .from("noticias")
        .select("*", { count: "exact", head: true })
        .not("partida_id", "is", null);

      const total = totalMatches || 0;
      const processed = processedNews || 0;

      return {
        total,
        processed,
        remaining: total - processed,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Get recent generation logs
  const { data: recentLogs } = useQuery({
    queryKey: ["retroactive-articles-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sync_logs")
        .select("*")
        .eq("entity_type", "retroactive_articles")
        .order("started_at", { ascending: false });

      return data || [];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Generate articles mutation
  const generateMutation = useMutation({
    mutationFn: async (options: { limit?: number; leagueId?: string }): Promise<GenerationResult> => {
      const { data, error } = await supabase.functions.invoke("generate-retroactive-articles", {
        body: {
          limit: options.limit || 10,
          league_id: options.leagueId,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as GenerationResult;
    },
    onSuccess: (data) => {
      setLastResults(data.processed || []);
      refetchProgress();
      queryClient.invalidateQueries({ queryKey: ["retroactive-articles-logs"] });

      if (data.success) {
        toast({
          title: "Artigos gerados!",
          description: data.message,
        });
      } else {
        toast({
          title: "Geração pausada",
          description: data.message || data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro na geração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const startGeneration = async (limit: number = 10, leagueId?: string) => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync({ limit, leagueId });
    } finally {
      setIsGenerating(false);
    }
  };

  const progressPercentage = progress 
    ? Math.round((progress.processed / Math.max(progress.total, 1)) * 100) 
    : 0;

  return {
    progress,
    progressPercentage,
    progressLoading,
    isGenerating: isGenerating || generateMutation.isPending,
    lastResults,
    recentLogs,
    startGeneration,
    refetchProgress,
  };
}
