import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StorageSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_bytes: number;
  document_count: number;
  folder_count: number;
  by_file_type: Record<string, number>;
  by_folder: Record<string, number>;
  quota_bytes: number;
  usage_percent: number;
  created_at: string;
}

export interface StorageQuota {
  id: string;
  user_id: string;
  quota_bytes: number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  is_unlimited: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorageAnalytics {
  currentUsage: number;
  quota: number;
  usagePercent: number;
  documentCount: number;
  folderCount: number;
  byFileType: { type: string; bytes: number; count: number }[];
  byFolder: { folderId: string; folderName: string; bytes: number }[];
  trend: { date: string; bytes: number }[];
  largestFiles: { name: string; size: number; type: string }[];
}

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF Documents',
  docx: 'Word Documents',
  xlsx: 'Excel Spreadsheets',
  pptx: 'PowerPoint',
  jpg: 'JPEG Images',
  png: 'PNG Images',
  gif: 'GIF Images',
  mp4: 'Video Files',
  zip: 'Archives',
  other: 'Other Files'
};

export function useStorageAnalytics() {
  const [snapshots, setSnapshots] = useState<StorageSnapshot[]>([]);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSnapshots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('storage_usage_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setSnapshots((data || []).map(s => ({
        ...s,
        by_file_type: typeof s.by_file_type === 'object' ? s.by_file_type : {},
        by_folder: typeof s.by_folder === 'object' ? s.by_folder : {}
      })) as StorageSnapshot[]);
    } catch (error) {
      console.error('Error fetching storage snapshots:', error);
    }
  };

  const fetchQuota = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('storage_quotas')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setQuota(data as StorageQuota);
      } else {
        // Create default quota
        const { data: newQuota, error: insertError } = await supabase
          .from('storage_quotas')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setQuota(newQuota as StorageQuota);
      }
    } catch (error) {
      console.error('Error fetching storage quota:', error);
    }
  };

  const calculateAnalytics = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get documents to calculate real storage - use any to avoid deep type instantiation
      const { data: documents } = await (supabase
        .from('documents')
        .select('id, name, file_size, file_type, folder_id, created_at') as any);

      const { data: folders } = await (supabase
        .from('smart_folders')
        .select('id, name') as any);

      const docs: any[] = documents || [];
      const folderList: any[] = folders || [];

      // Calculate totals
      const totalBytes = docs.reduce((sum, d) => sum + (d.file_size || 0), 0);
      const documentCount = docs.length;
      const folderCount = folderList.length;

      // By file type
      const byFileTypeMap: Record<string, { bytes: number; count: number }> = {};
      docs.forEach(doc => {
        const ext = doc.file_type?.toLowerCase().replace('.', '') || 'other';
        const type = FILE_TYPE_LABELS[ext] ? ext : 'other';
        if (!byFileTypeMap[type]) {
          byFileTypeMap[type] = { bytes: 0, count: 0 };
        }
        byFileTypeMap[type].bytes += doc.file_size || 0;
        byFileTypeMap[type].count += 1;
      });

      const byFileType = Object.entries(byFileTypeMap)
        .map(([type, data]) => ({ type: FILE_TYPE_LABELS[type] || type, ...data }))
        .sort((a, b) => b.bytes - a.bytes);

      // By folder
      const byFolderMap: Record<string, number> = {};
      docs.forEach(doc => {
        if (doc.folder_id) {
          byFolderMap[doc.folder_id] = (byFolderMap[doc.folder_id] || 0) + (doc.file_size || 0);
        }
      });

      const byFolder = Object.entries(byFolderMap)
        .map(([folderId, bytes]) => ({
          folderId,
          folderName: folderList.find(f => f.id === folderId)?.name || 'Unknown',
          bytes
        }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 10);

      // Trend from snapshots
      const trend = snapshots
        .slice(0, 14)
        .reverse()
        .map(s => ({ date: s.snapshot_date, bytes: s.total_bytes }));

      // Largest files
      const largestFiles = [...docs]
        .sort((a, b) => (b.file_size || 0) - (a.file_size || 0))
        .slice(0, 10)
        .map(d => ({
          name: d.name || 'Unknown',
          size: d.file_size || 0,
          type: d.file_type || 'unknown'
        }));

      const quotaBytes = quota?.quota_bytes || 10737418240;
      const usagePercent = (totalBytes / quotaBytes) * 100;

      setAnalytics({
        currentUsage: totalBytes,
        quota: quotaBytes,
        usagePercent,
        documentCount,
        folderCount,
        byFileType,
        byFolder,
        trend,
        largestFiles
      });

      // Create today's snapshot if not exists
      const today = new Date().toISOString().split('T')[0];
      const hasToday = snapshots.some(s => s.snapshot_date === today);
      
      if (!hasToday) {
        await supabase
          .from('storage_usage_snapshots')
          .insert({
            user_id: user.id,
            snapshot_date: today,
            total_bytes: totalBytes,
            document_count: documentCount,
            folder_count: folderCount,
            by_file_type: byFileTypeMap,
            by_folder: byFolderMap,
            quota_bytes: quotaBytes,
            usage_percent: usagePercent
          });
      }
    } catch (error) {
      console.error('Error calculating storage analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [snapshots, quota]);

  const updateQuota = async (updates: Partial<StorageQuota>) => {
    try {
      if (!quota) return;

      const { error } = await supabase
        .from('storage_quotas')
        .update(updates)
        .eq('id', quota.id);

      if (error) throw error;

      toast({
        title: "Quota updated",
        description: "Storage quota settings have been updated."
      });

      await fetchQuota();
    } catch (error) {
      console.error('Error updating quota:', error);
      toast({
        title: "Error",
        description: "Failed to update storage quota.",
        variant: "destructive"
      });
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchSnapshots();
    fetchQuota();
  }, []);

  useEffect(() => {
    if (quota !== null) {
      calculateAnalytics();
    }
  }, [quota, calculateAnalytics]);

  return {
    snapshots,
    quota,
    analytics,
    loading,
    updateQuota,
    formatBytes,
    refetch: () => {
      fetchSnapshots();
      fetchQuota();
    }
  };
}