import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface AutoResolveProgress {
  merged: number;
  dismissed: number;
  inconclusive: number;
  errors: number;
  processed: number;
  total_pending: number;
  remaining: number;
  has_more: boolean;
  details: {
    team_a: string;
    team_b: string;
    result: string;
    confidence?: number;
    error?: string;
  }[];
}

const INITIAL_PROGRESS: AutoResolveProgress = {
  merged: 0,
  dismissed: 0,
  inconclusive: 0,
  errors: 0,
  processed: 0,
  total_pending: 0,
  remaining: 0,
  has_more: false,
  details: [],
};

export function useAutoResolveDuplicates() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<AutoResolveProgress>(INITIAL_PROGRESS);
  const shouldStopRef = useRef(false);
  const jobIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const start = useCallback(async () => {
    setIsRunning(true);
    shouldStopRef.current = false;
    setProgress(INITIAL_PROGRESS);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setIsRunning(false);
      return;
    }

    // Create a background job for tracking
    const { data: job } = await supabase
      .from("background_jobs")
      .insert({
        job_type: "auto_resolve_duplicates",
        status: "running",
        progress: { status: "starting" },
      })
      .select()
      .single();

    jobIdRef.current = job?.id || null;

    const cumulative: AutoResolveProgress = { ...INITIAL_PROGRESS };
    let hasMore = true;
    let retryCount = 0;
    const MAX_FRONTEND_RETRIES = 3;

    while (hasMore && !shouldStopRef.current) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-resolve-duplicates`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({ job_id: jobIdRef.current }),
          }
        );

        if (response.status === 429) {
          retryCount++;
          if (retryCount >= MAX_FRONTEND_RETRIES) {
            console.error("Max frontend retries reached");
            break;
          }
          // Wait 60s and retry
          await new Promise((r) => setTimeout(r, 60_000));
          continue;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error("Auto-resolve batch error:", errData);
          retryCount++;
          if (retryCount >= MAX_FRONTEND_RETRIES) break;
          await new Promise((r) => setTimeout(r, 5_000));
          continue;
        }

        retryCount = 0; // reset on success
        const batchResult = await response.json();

        // Accumulate results
        cumulative.merged += batchResult.merged || 0;
        cumulative.dismissed += batchResult.dismissed || 0;
        cumulative.inconclusive += batchResult.inconclusive || 0;
        cumulative.errors += batchResult.errors || 0;
        cumulative.processed += batchResult.processed || 0;
        cumulative.total_pending = batchResult.total_pending || 0;
        cumulative.remaining = batchResult.remaining || 0;
        cumulative.has_more = batchResult.has_more || false;
        cumulative.details = [
          ...cumulative.details,
          ...(batchResult.details || []),
        ];

        hasMore = batchResult.has_more && !shouldStopRef.current;
        setProgress({ ...cumulative });
      } catch (err) {
        console.error("Auto-resolve network error:", err);
        retryCount++;
        if (retryCount >= MAX_FRONTEND_RETRIES) break;
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }

    // Mark job completed
    if (jobIdRef.current) {
      await supabase
        .from("background_jobs")
        .update({
          status: "completed",
          progress: { ...cumulative, status: "completed" },
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobIdRef.current);
    }

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ["suggested-duplicates"] });
    queryClient.invalidateQueries({ queryKey: ["dismissed-duplicates"] });
    queryClient.invalidateQueries({ queryKey: ["teams-canonical"] });
    queryClient.invalidateQueries({ queryKey: ["merge-logs"] });

    setIsRunning(false);
  }, [queryClient]);

  const stop = useCallback(() => {
    shouldStopRef.current = true;
  }, []);

  return { isRunning, progress, start, stop };
}
