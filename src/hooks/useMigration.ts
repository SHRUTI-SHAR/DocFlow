import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  MigrationJob, 
  MigrationItem, 
  MigrationConfig, 
  MigrationMetrics,
  MigrationAuditLog,
  SourceSystem,
  MigrationCredentials,
  IdentityMapping
} from '@/types/migration';

export function useMigration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Fetch all migration jobs
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['migration-jobs'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('migration_jobs')
        .select('*')
        .order('created_at', { ascending: false }) as any);
      
      if (error) throw error;
      
      // Map database columns to expected TypeScript interface
      return (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.job_name || row.name || 'Untitled Job',
        source_system: row.migration_type || row.source_system || 'google_drive',
        status: row.job_status || row.status || 'pending',
        config: row.source_config || row.config || {},
        source_credentials_id: row.source_credentials_id,
        total_items: row.total_items || 0,
        processed_items: row.processed_items || 0,
        failed_items: row.failed_items || 0,
        skipped_items: row.skipped_items || 0,
        total_bytes: row.total_bytes || 0,
        transferred_bytes: row.transferred_bytes || 0,
        started_at: row.start_time || row.started_at,
        completed_at: row.end_time || row.completed_at,
        last_checkpoint: row.last_checkpoint,
        error_summary: row.error_summary,
        created_at: row.created_at,
        updated_at: row.updated_at
      })) as MigrationJob[];
    }
  });

  // Fetch items for selected job with pagination
  const { data: jobItems = [], isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ['migration-items', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return [];
      
      const { data, error } = await (supabase
        .from('migration_items')
        .select('*')
        .eq('job_id', selectedJobId)
        .order('created_at', { ascending: false })
        .limit(100) as any);
      
      if (error) throw error;
      return data as MigrationItem[];
    },
    enabled: !!selectedJobId
  });

  // Fetch metrics for selected job
  const { data: metrics = [] } = useQuery({
    queryKey: ['migration-metrics', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return [];
      
      const { data, error } = await (supabase
        .from('migration_metrics')
        .select('*')
        .eq('job_id', selectedJobId)
        .order('recorded_at', { ascending: false })
        .limit(60) as any);
      
      if (error) throw error;
      return data as MigrationMetrics[];
    },
    enabled: !!selectedJobId,
    refetchInterval: 5000 // Refresh every 5 seconds for live updates
  });

  // Fetch audit logs for selected job
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['migration-audit-logs', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return [];
      
      const { data, error } = await (supabase
        .from('migration_audit_log')
        .select('*')
        .eq('job_id', selectedJobId)
        .order('created_at', { ascending: false })
        .limit(100) as any);
      
      if (error) throw error;
      return data as MigrationAuditLog[];
    },
    enabled: !!selectedJobId
  });

  // Fetch credentials
  const { data: credentials = [] } = useQuery({
    queryKey: ['migration-credentials'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('migration_credentials')
        .select('*')
        .order('created_at', { ascending: false }) as any);
      
      if (error) throw error;
      return data as MigrationCredentials[];
    }
  });

  // Fetch identity mappings
  const { data: identityMappings = [] } = useQuery({
    queryKey: ['identity-mappings'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('identity_mappings')
        .select('*')
        .order('created_at', { ascending: false }) as any);
      
      if (error) throw error;
      return data as IdentityMapping[];
    }
  });

  // Create new migration job
  const createJobMutation = useMutation({
    mutationFn: async (params: {
      name: string;
      source_system: SourceSystem;
      config: MigrationConfig;
      credentials_id?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('migration_jobs')
        .insert({
          user_id: userData.user.id,
          job_name: params.name,
          migration_type: params.source_system,
          source_config: params.config,
          job_status: 'pending'
        } as any)
        .select()
        .single() as any);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-jobs'] });
      toast({ title: 'Migration job created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create job', description: error.message, variant: 'destructive' });
    }
  });

  // Start migration job
  const startJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await (supabase
        .from('migration_jobs')
        .update({ 
          job_status: 'discovering',
          start_time: new Date().toISOString()
        } as any)
        .eq('id', jobId) as any);
      
      if (error) throw error;

      // Trigger edge function to start processing
      const { error: funcError } = await supabase.functions.invoke('migration-orchestrator', {
        body: { action: 'start', job_id: jobId }
      });
      
      if (funcError) throw funcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-jobs'] });
      toast({ title: 'Migration started' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to start migration', description: error.message, variant: 'destructive' });
    }
  });

  // Pause migration job
  const pauseJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await (supabase
        .from('migration_jobs')
        .update({ job_status: 'paused' } as any)
        .eq('id', jobId) as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-jobs'] });
      toast({ title: 'Migration paused' });
    }
  });

  // Resume migration job
  const resumeJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await (supabase
        .from('migration_jobs')
        .update({ job_status: 'running' } as any)
        .eq('id', jobId) as any);
      
      if (error) throw error;

      await supabase.functions.invoke('migration-orchestrator', {
        body: { action: 'resume', job_id: jobId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-jobs'] });
      toast({ title: 'Migration resumed' });
    }
  });

  // Cancel migration job
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await (supabase
        .from('migration_jobs')
        .update({ 
          job_status: 'cancelled',
          end_time: new Date().toISOString()
        } as any)
        .eq('id', jobId) as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-jobs'] });
      toast({ title: 'Migration cancelled' });
    }
  });

  // Retry failed items
  const retryFailedMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await (supabase
        .from('migration_items')
        .update({ 
          status: 'pending',
          attempt_count: 0,
          last_error: null,
          error_code: null
        })
        .eq('job_id', jobId)
        .eq('status', 'failed') as any);
      
      if (error) throw error;

      await supabase.functions.invoke('migration-orchestrator', {
        body: { action: 'retry_failed', job_id: jobId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-items', selectedJobId] });
      toast({ title: 'Retrying failed items' });
    }
  });

  // Save credentials
  const saveCredentialsMutation = useMutation({
    mutationFn: async (params: {
      name: string;
      source_system: SourceSystem;
      credentials: Record<string, any>;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('migration_credentials')
        .insert({
          user_id: userData.user.id,
          name: params.name,
          source_system: params.source_system,
          credentials_encrypted: params.credentials
        })
        .select()
        .single() as any);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-credentials'] });
      toast({ title: 'Credentials saved' });
    }
  });

  // Save identity mapping
  const saveIdentityMappingMutation = useMutation({
    mutationFn: async (mapping: Omit<IdentityMapping, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase
        .from('identity_mappings')
        .upsert(mapping, { onConflict: 'user_id,source_system,source_principal_id' })
        .select()
        .single() as any);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-mappings'] });
      toast({ title: 'Identity mapping saved' });
    }
  });

  // Get job statistics
  const getJobStats = useCallback((job: MigrationJob) => {
    const progress = job.total_items > 0 
      ? Math.round((job.processed_items / job.total_items) * 100) 
      : 0;
    
    const bytesProgress = job.total_bytes > 0 
      ? Math.round((job.transferred_bytes / job.total_bytes) * 100) 
      : 0;

    const eta = calculateEta(job, metrics[0]);

    return {
      progress,
      bytesProgress,
      eta,
      filesPerMinute: metrics[0]?.files_per_minute || 0,
      bytesPerSecond: metrics[0]?.bytes_per_second || 0,
      throttleCount: metrics[0]?.api_throttle_count || 0
    };
  }, [metrics]);

  return {
    // Data
    jobs,
    jobItems,
    metrics,
    auditLogs,
    credentials,
    identityMappings,
    selectedJobId,
    
    // Loading states
    jobsLoading,
    itemsLoading,
    
    // Actions
    setSelectedJobId,
    createJob: createJobMutation.mutate,
    startJob: startJobMutation.mutate,
    pauseJob: pauseJobMutation.mutate,
    resumeJob: resumeJobMutation.mutate,
    cancelJob: cancelJobMutation.mutate,
    retryFailed: retryFailedMutation.mutate,
    saveCredentials: saveCredentialsMutation.mutate,
    saveIdentityMapping: saveIdentityMappingMutation.mutate,
    refetchJobs,
    refetchItems,
    
    // Helpers
    getJobStats,
    
    // Mutation states
    isCreating: createJobMutation.isPending,
    isStarting: startJobMutation.isPending
  };
}

function calculateEta(job: MigrationJob, latestMetric?: MigrationMetrics): string | null {
  if (!latestMetric?.files_per_minute || job.status !== 'running') return null;
  
  const remaining = job.total_items - job.processed_items;
  const minutesRemaining = remaining / latestMetric.files_per_minute;
  
  if (minutesRemaining < 1) return 'Less than 1 minute';
  if (minutesRemaining < 60) return `~${Math.round(minutesRemaining)} minutes`;
  
  const hours = Math.floor(minutesRemaining / 60);
  const mins = Math.round(minutesRemaining % 60);
  return `~${hours}h ${mins}m`;
}
