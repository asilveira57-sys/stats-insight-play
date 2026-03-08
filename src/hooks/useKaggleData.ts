import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchAllRecords } from "@/lib/supabaseHelpers";

export function useKaggleData() {
  const queryClient = useQueryClient();

  // Datasets
  const datasets = useQuery({
    queryKey: ["kaggle-datasets"],
    queryFn: async () => {
      return fetchAllRecords<any>(
        "kaggle_datasets",
        "*",
        undefined,
        { column: "priority", ascending: false },
      );
    },
  });

  // Jobs
  const jobs = useQuery({
    queryKey: ["kaggle-jobs"],
    queryFn: async () => {
      return fetchAllRecords<any>(
        "kaggle_import_jobs",
        "*, kaggle_datasets(dataset_title, dataset_slug), kaggle_dataset_files(file_name)",
        undefined,
        { column: "created_at", ascending: false },
      );
    },
  });

  // Files
  const useDatasetFiles = (datasetId: string | null) => useQuery({
    queryKey: ["kaggle-files", datasetId],
    enabled: !!datasetId,
    queryFn: async () => {
      return fetchAllRecords<any>(
        "kaggle_dataset_files",
        "*",
        (q: any) => q.eq("dataset_id", datasetId!),
        { column: "file_name", ascending: true },
      );
    },
  });

  // Staging matches
  const useStagingMatches = (jobId: string | null) => useQuery({
    queryKey: ["kaggle-staging-matches", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      return fetchAllRecords<any>(
        "kaggle_staging_matches",
        "*",
        (q: any) => q.eq("job_id", jobId!),
        { column: "parsed_date", ascending: false },
      );
    },
  });

  // Staging teams
  const useStagingTeams = (jobId: string | null) => useQuery({
    queryKey: ["kaggle-staging-teams", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      return fetchAllRecords<any>(
        "kaggle_staging_teams",
        "*",
        (q: any) => q.eq("job_id", jobId!),
        { column: "resolution_status", ascending: true },
      );
    },
  });

  // Resolution queue
  const resolutionQueue = useQuery({
    queryKey: ["kaggle-resolution-queue"],
    queryFn: async () => {
      return fetchAllRecords<any>(
        "kaggle_resolution_queue",
        "*",
        (q: any) => q.eq("status", "pending"),
        { column: "created_at", ascending: true },
      );
    },
  });

  // Logs
  const useJobLogs = (jobId: string | null) => useQuery({
    queryKey: ["kaggle-logs", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      return fetchAllRecords<any>(
        "kaggle_import_logs",
        "*",
        (q: any) => q.eq("job_id", jobId!),
        { column: "created_at", ascending: false },
      );
    },
  });

  // Column mappings
  const useColumnMappings = (fileId: string | null) => useQuery({
    queryKey: ["kaggle-column-mappings", fileId],
    enabled: !!fileId,
    queryFn: async () => {
      return fetchAllRecords<any>(
        "kaggle_column_mappings",
        "*",
        (q: any) => q.eq("dataset_file_id", fileId!),
        { column: "mapping_confidence", ascending: false },
      );
    },
  });

  // File profile
  const useFileProfile = (jobId: string | null) => useQuery({
    queryKey: ["kaggle-file-profile", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase.from("kaggle_file_profiles")
        .select("*").eq("job_id", jobId!).limit(1).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Stats
  const stats = useQuery({
    queryKey: ["kaggle-stats"],
    queryFn: async () => {
      const [ds, files, jobsAll, staging, conflicts, resolution] = await Promise.all([
        supabase.from("kaggle_datasets").select("id", { count: "exact", head: true }),
        supabase.from("kaggle_dataset_files").select("id", { count: "exact", head: true }),
        supabase.from("kaggle_import_jobs").select("id, status"),
        supabase.from("kaggle_staging_matches").select("id", { count: "exact", head: true }),
        supabase.from("kaggle_staging_conflicts").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("kaggle_resolution_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      const jobsByStatus: Record<string, number> = {};
      (jobsAll.data || []).forEach((j: any) => {
        jobsByStatus[j.status] = (jobsByStatus[j.status] || 0) + 1;
      });

      return {
        totalDatasets: ds.count || 0,
        totalFiles: files.count || 0,
        totalStagingMatches: staging.count || 0,
        pendingConflicts: conflicts.count || 0,
        pendingResolution: resolution.count || 0,
        jobsByStatus,
      };
    },
  });

  const extractInvokeErrorMessage = async (error: any, fallback = "Falha na Edge Function") => {
    try {
      if (error?.context && typeof error.context.json === "function") {
        const payload = await error.context.json();
        if (payload?.error) return payload.error;
        if (payload?.details) return payload.details;
      }
    } catch {
      // ignore
    }

    return error?.message || fallback;
  };

  const callKaggleImport = async (action: string, params: any) => {
    const { data, error } = await supabase.functions.invoke("kaggle-import", {
      body: { action, ...params },
    });
    if (error) throw new Error(await extractInvokeErrorMessage(error));
    if (data?.success === false) throw new Error(data?.error || "Falha no kaggle-import");
    return data;
  };

  const callKaggleProcess = async (action: string, params: any) => {
    const { data, error } = await supabase.functions.invoke("kaggle-process", {
      body: { action, ...params },
    });
    if (error) throw new Error(await extractInvokeErrorMessage(error));
    if (data?.success === false) throw new Error(data?.error || "Falha no kaggle-process");
    return data;
  };

  const registerDataset = useMutation({
    mutationFn: (params: any) => callKaggleImport("register_dataset", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kaggle-datasets"] });
      queryClient.invalidateQueries({ queryKey: ["kaggle-stats"] });
      toast.success("Dataset registrado com sucesso");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const registerFiles = useMutation({
    mutationFn: (params: any) => callKaggleImport("register_files", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kaggle-files"] });
      toast.success("Arquivos registrados");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const createJob = useMutation({
    mutationFn: (params: any) => callKaggleImport("create_job", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kaggle-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["kaggle-stats"] });
      toast.success("Job criado");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const uploadRaw = useMutation({
    mutationFn: (params: any) => callKaggleImport("upload_raw", params),
    onSuccess: () => toast.success("Dados brutos enviados"),
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const profileFile = useMutation({
    mutationFn: (jobId: string) => callKaggleProcess("profile", { job_id: jobId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kaggle-jobs"] });
      toast.success("Profiling concluído");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const stageData = useMutation({
    mutationFn: (jobId: string) => callKaggleProcess("stage", { job_id: jobId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kaggle-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["kaggle-stats"] });
      toast.success("Staging concluído");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const resolveJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("kaggle-resolve", { body: { job_id: jobId } });
      if (error) throw new Error(await extractInvokeErrorMessage(error));
      if (data?.success === false) throw new Error(data?.error || "Falha na resolução");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kaggle-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["kaggle-stats"] });
      toast.success("Resolução concluída");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const promoteJob = useMutation({
    mutationFn: (params: { job_id: string; promote_mode?: string }) => supabase.functions.invoke("kaggle-promote", { body: params }).then(r => { if (r.error) throw r.error; return r.data; }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kaggle-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["kaggle-stats"] });
      toast.success("Promoção concluída");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const batchProcess = useMutation({
    mutationFn: (params: { action: string; batch_size?: number }) => supabase.functions.invoke("kaggle-batch", { body: params }).then(r => { if (r.error) throw r.error; return r.data; }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kaggle-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["kaggle-stats"] });
      toast.success("Batch processado");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  return {
    datasets, jobs, stats, resolutionQueue,
    useDatasetFiles, useStagingMatches, useStagingTeams, useJobLogs, useColumnMappings, useFileProfile,
    registerDataset, registerFiles, createJob, uploadRaw,
    profileFile, stageData, resolveJob, promoteJob, batchProcess,
  };
}
