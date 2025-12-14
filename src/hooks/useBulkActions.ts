import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentTag {
  id: string;
  name: string;
  description?: string;
  is_ai_generated?: boolean;
  usage_count?: number;
  user_id?: string;
  created_at: string;
}

export interface BulkActionHistory {
  id: string;
  user_id: string;
  action_type: 'move' | 'delete' | 'tag' | 'untag' | 'archive' | 'restore';
  document_ids: string[];
  target_folder_id?: string;
  tag_ids?: string[];
  details: Record<string, any>;
  document_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
}

export function useBulkActions() {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  const [history, setHistory] = useState<BulkActionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTags = useCallback(async () => {
    try {
      const { data, error } = await (supabase
        .from('document_tags')
        .select('*')
        .order('usage_count', { ascending: false }) as any);

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase
        .from('bulk_action_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) as any);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching bulk action history:', error);
    }
  }, []);

  const toggleSelection = useCallback((documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  }, []);

  const selectAll = useCallback((documentIds: string[]) => {
    setSelectedDocuments(documentIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDocuments([]);
  }, []);

  const logBulkAction = async (
    actionType: BulkActionHistory['action_type'],
    documentIds: string[],
    details: Record<string, any> = {},
    targetFolderId?: string,
    tagIds?: string[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase
        .from('bulk_action_history')
        .insert({
          user_id: user.id,
          action_type: actionType,
          document_ids: documentIds,
          target_folder_id: targetFolderId,
          tag_ids: tagIds,
          details,
          document_count: documentIds.length,
          status: 'completed'
        } as any) as any);

      await fetchHistory();
    } catch (error) {
      console.error('Error logging bulk action:', error);
    }
  };

  const bulkMove = useCallback(async (targetFolderId: string) => {
    if (selectedDocuments.length === 0) return;

    setProcessingAction('move');
    setLoading(true);

    try {
      // Note: Update moves documents - adjust field name if schema differs
      const { error } = await (supabase
        .from('documents')
        .update({ metadata: { folder_id: targetFolderId } } as any)
        .in('id', selectedDocuments) as any);

      if (error) throw error;

      await logBulkAction('move', selectedDocuments, { target_folder_id: targetFolderId }, targetFolderId);

      toast({
        title: "Documents moved",
        description: `${selectedDocuments.length} document(s) moved successfully.`,
      });

      clearSelection();
    } catch (error: any) {
      toast({
        title: "Error moving documents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProcessingAction(null);
    }
  }, [selectedDocuments, toast, clearSelection]);

  const bulkDelete = useCallback(async () => {
    if (selectedDocuments.length === 0) return;

    setProcessingAction('delete');
    setLoading(true);

    try {
      const { error } = await (supabase
        .from('documents')
        .delete()
        .in('id', selectedDocuments) as any);

      if (error) throw error;

      await logBulkAction('delete', selectedDocuments, { permanently_deleted: true });

      toast({
        title: "Documents deleted",
        description: `${selectedDocuments.length} document(s) deleted successfully.`,
      });

      clearSelection();
    } catch (error: any) {
      toast({
        title: "Error deleting documents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProcessingAction(null);
    }
  }, [selectedDocuments, toast, clearSelection]);

  const bulkTag = useCallback(async (tagIds: string[]) => {
    if (selectedDocuments.length === 0 || tagIds.length === 0) return;

    setProcessingAction('tag');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create tag assignments for each document-tag pair
      const assignments = selectedDocuments.flatMap(docId =>
        tagIds.map(tagId => ({
          document_id: docId,
          tag_id: tagId,
          assigned_by: user.id
        }))
      );

      const { error } = await (supabase
        .from('document_tag_assignments')
        .upsert(assignments as any, { onConflict: 'document_id,tag_id' }) as any);

      if (error) throw error;

      await logBulkAction('tag', selectedDocuments, { tags_applied: tagIds.length }, undefined, tagIds);

      toast({
        title: "Tags applied",
        description: `${tagIds.length} tag(s) applied to ${selectedDocuments.length} document(s).`,
      });

      clearSelection();
    } catch (error: any) {
      toast({
        title: "Error applying tags",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProcessingAction(null);
    }
  }, [selectedDocuments, toast, clearSelection]);

  const bulkUntag = useCallback(async (tagIds: string[]) => {
    if (selectedDocuments.length === 0 || tagIds.length === 0) return;

    setProcessingAction('untag');
    setLoading(true);

    try {
      const { error } = await (supabase
        .from('document_tag_assignments')
        .delete()
        .in('document_id', selectedDocuments)
        .in('tag_id', tagIds) as any);

      if (error) throw error;

      await logBulkAction('untag', selectedDocuments, { tags_removed: tagIds.length }, undefined, tagIds);

      toast({
        title: "Tags removed",
        description: `${tagIds.length} tag(s) removed from ${selectedDocuments.length} document(s).`,
      });

      clearSelection();
    } catch (error: any) {
      toast({
        title: "Error removing tags",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProcessingAction(null);
    }
  }, [selectedDocuments, toast, clearSelection]);

  const createTag = useCallback(async (name: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('document_tags')
        .insert({ name, description, user_id: user.id } as any)
        .select()
        .single() as any);

      if (error) throw error;

      await fetchTags();

      toast({
        title: "Tag created",
        description: `Tag "${name}" created successfully.`,
      });

      return data as DocumentTag;
    } catch (error: any) {
      toast({
        title: "Error creating tag",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  }, [toast, fetchTags]);

  const deleteTag = useCallback(async (tagId: string) => {
    try {
      const { error } = await (supabase
        .from('document_tags')
        .delete()
        .eq('id', tagId) as any);

      if (error) throw error;

      await fetchTags();

      toast({
        title: "Tag deleted",
        description: "Tag deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting tag",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchTags]);

  return {
    selectedDocuments,
    tags,
    history,
    loading,
    processingAction,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkMove,
    bulkDelete,
    bulkTag,
    bulkUntag,
    createTag,
    deleteTag,
    fetchTags,
    fetchHistory,
  };
}
