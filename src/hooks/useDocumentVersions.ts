import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  DocumentVersion,
  VersionBranch,
  VersionComment,
  CreateVersionParams,
  RestoreVersionParams,
  CreateBranchParams,
  VersionComparison,
  VersionDiff,
} from '@/types/versionControl';

interface UseDocumentVersionsOptions {
  documentId: string;
  autoRefresh?: boolean;
}

export function useDocumentVersions({ documentId, autoRefresh = true }: UseDocumentVersionsOptions) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [branches, setBranches] = useState<VersionBranch[]>([]);
  const [currentVersion, setCurrentVersion] = useState<DocumentVersion | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all versions for a document
  const fetchVersions = useCallback(async () => {
    if (!documentId) return;
    
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (fetchError) throw fetchError;

      const typedVersions: DocumentVersion[] = ((data || []) as any[]).map((v: any) => ({
        ...v,
        change_type: (v.change_type as DocumentVersion['change_type']) || 'manual',
        is_current: v.is_current || false,
        tags: v.tags || [],
        metadata: (v.metadata as Record<string, unknown>) || {},
      }));

      setVersions(typedVersions);
      
      const current = typedVersions.find(v => v.is_current);
      if (current) {
        setCurrentVersion(current);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch versions';
      setError(message);
      console.error('Error fetching versions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    if (!documentId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('version_branches')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const typedBranches: VersionBranch[] = (data || []).map(b => ({
        ...b,
        status: (b.status as VersionBranch['status']) || 'active',
      }));

      setBranches(typedBranches);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  }, [documentId]);

  // Create a new version
  const createVersion = useCallback(async (params: CreateVersionParams): Promise<DocumentVersion> => {
    if (!user?.id) throw new Error('User not authenticated');

    // Get the latest version to determine version numbers
    const latestVersion = versions[0];
    let majorVersion = latestVersion?.major_version || 1;
    let minorVersion = (latestVersion?.minor_version || 0) + 1;

    if (params.is_major) {
      majorVersion += 1;
      minorVersion = 0;
    }

    const { data, error: insertError } = await (supabase
      .from('document_versions')
      .insert({
        document_id: params.document_id,
        content: params.content || {},
        file_url: params.file_url,
        file_size: params.file_size,
        file_hash: params.file_hash,
        change_summary: params.change_summary,
        change_type: params.change_type || 'manual',
        branch_id: params.branch_id || activeBranchId,
        parent_version_id: currentVersion?.id,
        tags: params.tags || [],
        major_version: majorVersion,
        minor_version: minorVersion,
        created_by: user.id,
        version_number: majorVersion * 100 + minorVersion,
      } as any)
      .select()
      .single());

    if (insertError) throw insertError;

    const newVersion: DocumentVersion = {
      ...(data as any),
      change_type: ((data as any).change_type as DocumentVersion['change_type']) || 'manual',
      is_current: true,
      tags: (data as any).tags || [],
      metadata: ((data as any).metadata as Record<string, unknown>) || {},
    };

    setVersions(prev => [newVersion, ...prev.map(v => ({ ...v, is_current: false }))]);
    setCurrentVersion(newVersion);
    
    toast.success(`Version ${majorVersion}.${minorVersion} created`);
    return newVersion;
  }, [user?.id, versions, currentVersion, activeBranchId]);

  // Restore a previous version
  const restoreVersion = useCallback(async (params: RestoreVersionParams): Promise<DocumentVersion> => {
    const versionToRestore = versions.find(v => v.id === params.version_id);
    if (!versionToRestore) throw new Error('Version not found');

    const newVersion = await createVersion({
      document_id: documentId,
      content: versionToRestore.content as Record<string, unknown>,
      file_url: versionToRestore.file_url,
      file_size: versionToRestore.file_size,
      file_hash: versionToRestore.file_hash,
      change_summary: params.restore_summary || `Restored from version ${versionToRestore.major_version}.${versionToRestore.minor_version}`,
      change_type: 'restore',
      parent_version_id: versionToRestore.id,
    });

    toast.success(`Restored to version ${versionToRestore.major_version}.${versionToRestore.minor_version}`);
    return newVersion;
  }, [versions, documentId, createVersion]);

  // Delete a version
  const deleteVersion = useCallback(async (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version?.is_current) {
      throw new Error('Cannot delete the current version');
    }

    const { error: deleteError } = await supabase
      .from('document_versions')
      .delete()
      .eq('id', versionId);

    if (deleteError) throw deleteError;

    setVersions(prev => prev.filter(v => v.id !== versionId));
    toast.success('Version deleted');
  }, [versions]);

  // Create a branch
  const createBranch = useCallback(async (params: CreateBranchParams): Promise<VersionBranch> => {
    if (!user?.id) throw new Error('User not authenticated');

    const { data, error: insertError } = await supabase
      .from('version_branches')
      .insert({
        document_id: params.document_id,
        branch_name: params.branch_name,
        description: params.description,
        base_version_id: params.base_version_id,
        parent_branch_id: params.parent_branch_id,
        created_by: user.id,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const newBranch: VersionBranch = {
      ...data,
      status: 'active',
    };

    setBranches(prev => [newBranch, ...prev]);
    toast.success(`Branch "${params.branch_name}" created`);
    return newBranch;
  }, [user?.id]);

  // Switch active branch
  const switchBranch = useCallback(async (branchId: string | null) => {
    setActiveBranchId(branchId);
    await fetchVersions();
  }, [fetchVersions]);

  // Compare two versions
  const compareVersions = useCallback(async (
    version1Id: string, 
    version2Id: string
  ): Promise<VersionComparison> => {
    const v1 = versions.find(v => v.id === version1Id);
    const v2 = versions.find(v => v.id === version2Id);

    if (!v1 || !v2) throw new Error('One or both versions not found');

    const diffs: VersionDiff[] = [];
    const content1 = v1.content || {};
    const content2 = v2.content || {};

    // Simple diff algorithm
    const allKeys = new Set([...Object.keys(content1), ...Object.keys(content2)]);

    for (const key of allKeys) {
      const val1 = content1[key];
      const val2 = content2[key];

      if (!(key in content1)) {
        diffs.push({ type: 'added', path: key, newValue: val2 });
      } else if (!(key in content2)) {
        diffs.push({ type: 'removed', path: key, oldValue: val1 });
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diffs.push({ type: 'modified', path: key, oldValue: val1, newValue: val2 });
      } else {
        diffs.push({ type: 'unchanged', path: key, oldValue: val1, newValue: val2 });
      }
    }

    const summary = {
      added: diffs.filter(d => d.type === 'added').length,
      removed: diffs.filter(d => d.type === 'removed').length,
      modified: diffs.filter(d => d.type === 'modified').length,
      unchanged: diffs.filter(d => d.type === 'unchanged').length,
    };

    return {
      baseVersion: v1,
      compareVersion: v2,
      diffs,
      summary,
    };
  }, [versions]);

  // Add comment to a version
  const addComment = useCallback(async (versionId: string, comment: string): Promise<VersionComment> => {
    if (!user?.id) throw new Error('User not authenticated');

    const { data, error: insertError } = await supabase
      .from('version_comments')
      .insert({
        version_id: versionId,
        user_id: user.id,
        comment,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    toast.success('Comment added');
    return data as VersionComment;
  }, [user?.id]);

  // Get comments for a version
  const getVersionComments = useCallback(async (versionId: string): Promise<VersionComment[]> => {
    const { data, error: fetchError } = await supabase
      .from('version_comments')
      .select('*')
      .eq('version_id', versionId)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;
    return (data || []) as VersionComment[];
  }, []);

  // Initial fetch
  useEffect(() => {
    if (documentId) {
      fetchVersions();
      fetchBranches();
    }
  }, [documentId, fetchVersions, fetchBranches]);

  // Real-time subscription for version updates
  useEffect(() => {
    if (!documentId || !autoRefresh) return;

    const channel = supabase
      .channel(`versions-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_versions',
          filter: `document_id=eq.${documentId}`,
        },
        () => {
          fetchVersions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, autoRefresh, fetchVersions]);

  return {
    versions,
    branches,
    currentVersion,
    activeBranchId,
    isLoading,
    error,
    createVersion,
    restoreVersion,
    deleteVersion,
    createBranch,
    switchBranch,
    compareVersions,
    addComment,
    getVersionComments,
    refreshVersions: fetchVersions,
    refreshBranches: fetchBranches,
  };
}
