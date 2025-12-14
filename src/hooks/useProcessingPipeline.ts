import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProcessingQueueItem {
  id: string;
  document_id: string;
  user_id: string;
  stage: 'uploaded' | 'virus_scan' | 'text_extraction' | 'classification' | 'embedding' | 'indexing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  max_attempts: number;
  last_error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress_percent: number;
  stage_metadata: Record<string, any>;
}

export interface SearchIndexItem {
  id: string;
  document_id: string;
  user_id: string;
  operation: 'index' | 'reindex' | 'delete';
  content_hash?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  last_error?: string;
  created_at: string;
  processed_at?: string;
}

export function useProcessingPipeline() {
  const [processingQueue, setProcessingQueue] = useState<ProcessingQueueItem[]>([]);
  const [searchQueue, setSearchQueue] = useState<SearchIndexItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch processing queue status
  const fetchProcessingQueue = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase
        .from('document_processing_queue')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100) as any);

      if (error) throw error;
      setProcessingQueue(data || []);
    } catch (error) {
      console.error('Error fetching processing queue:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch search index queue status
  const fetchSearchQueue = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase
        .from('search_index_queue')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100) as any);

      if (error) throw error;
      setSearchQueue(data || []);
    } catch (error) {
      console.error('Error fetching search queue:', error);
    }
  }, []);

  // Add document to processing queue
  const queueDocumentForProcessing = useCallback(async (
    documentId: string,
    priority: number = 100
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('document_processing_queue')
        .insert({
          document_id: documentId,
          user_id: user.id,
          stage: 'uploaded',
          priority,
        } as any)
        .select()
        .single() as any);

      if (error) throw error;

      // Also queue for search indexing
      await queueForSearchIndex(documentId, 'index', priority);

      return data.id;
    } catch (error: any) {
      toast({
        title: "Error queuing document",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Queue document for search indexing
  const queueForSearchIndex = useCallback(async (
    documentId: string,
    operation: 'index' | 'reindex' | 'delete' = 'index',
    priority: number = 100
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await (supabase
        .from('search_index_queue')
        .insert({
          document_id: documentId,
          user_id: user.id,
          operation,
          priority,
        } as any) as any);
    } catch (error) {
      console.error('Error queuing for search index:', error);
    }
  }, []);

  // Get processing status for a document
  const getDocumentStatus = useCallback((documentId: string): ProcessingQueueItem | undefined => {
    return processingQueue.find(item => item.document_id === documentId);
  }, [processingQueue]);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    const pending = processingQueue.filter(q => !q.completed_at && q.stage !== 'failed').length;
    const completed = processingQueue.filter(q => q.stage === 'completed').length;
    const failed = processingQueue.filter(q => q.stage === 'failed').length;
    const inProgress = processingQueue.filter(q => 
      q.started_at && !q.completed_at && q.stage !== 'failed'
    ).length;

    const searchPending = searchQueue.filter(q => q.status === 'pending').length;
    const searchCompleted = searchQueue.filter(q => q.status === 'completed').length;

    return {
      processing: { pending, completed, failed, inProgress },
      search: { pending: searchPending, completed: searchCompleted },
    };
  }, [processingQueue, searchQueue]);

  // Retry failed document
  const retryFailed = useCallback(async (queueId: string) => {
    try {
      await (supabase
        .from('document_processing_queue')
        .update({
          stage: 'uploaded',
          attempts: 0,
          last_error: null,
          started_at: null,
          completed_at: null,
        } as any)
        .eq('id', queueId) as any);

      await fetchProcessingQueue();

      toast({
        title: "Document requeued",
        description: "Document will be reprocessed.",
      });
    } catch (error: any) {
      toast({
        title: "Error retrying",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchProcessingQueue]);

  // Cancel pending processing
  const cancelProcessing = useCallback(async (queueId: string) => {
    try {
      await (supabase
        .from('document_processing_queue')
        .delete()
        .eq('id', queueId) as any);

      await fetchProcessingQueue();

      toast({
        title: "Processing cancelled",
        description: "Document removed from queue.",
      });
    } catch (error: any) {
      toast({
        title: "Error cancelling",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchProcessingQueue]);

  return {
    processingQueue,
    searchQueue,
    loading,
    queueDocumentForProcessing,
    queueForSearchIndex,
    getDocumentStatus,
    getQueueStats,
    retryFailed,
    cancelProcessing,
    refresh: () => {
      fetchProcessingQueue();
      fetchSearchQueue();
    },
  };
}
