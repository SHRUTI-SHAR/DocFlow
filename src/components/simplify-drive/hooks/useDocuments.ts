import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Document, DocumentStats, SortOrder } from '../types';

const SUPABASE_URL = 'https://nvdkgfptnqardtxlqoym.supabase.co';

interface UseDocumentsOptions {
  sortBy?: string;
  sortOrder?: SortOrder;
}

export function useDocuments(options: UseDocumentsOptions = {}) {
  const { sortBy = 'created_at', sortOrder = 'desc' } = options;
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: documentsData, error } = await (supabase
        .from('documents')
        .select('*')
        .or(`uploaded_by.eq.${user.user.id},user_id.eq.${user.user.id}`)
        .order('created_at', { ascending: false }) as any);

      if (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error loading documents",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const processedDocuments: Document[] = (documentsData || []).map((doc: any) => {
        const displayName = doc.file_name || doc.original_name || doc.name || doc.file_path?.split('/').pop() || 'Unknown';
        
        return {
          id: doc.id,
          file_name: displayName,
          file_type: doc.document_type || doc.mime_type || 'unknown',
          file_size: doc.file_size || 0,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          extracted_text: doc.extracted_text || '',
          processing_status: doc.processing_status || 'completed',
          metadata: doc.metadata || {},
          storage_url: undefined,
          storage_path: doc.storage_path,
          insights: undefined,
          tags: [],
          folders: []
        };
      });

      setDocuments(processedDocuments);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const stats: DocumentStats = useMemo(() => {
    const totalDocs = documents.length;
    const processedDocs = documents.filter(doc => doc.processing_status === 'completed').length;
    const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
    const avgImportance = totalDocs > 0 
      ? documents.reduce((sum, doc) => sum + (doc.insights?.importance_score || 0), 0) / totalDocs
      : 0;

    return {
      totalDocs,
      processedDocs,
      totalSize: (totalSize / (1024 * 1024)).toFixed(1) + ' MB',
      avgImportance: (avgImportance * 100).toFixed(0) + '%'
    };
  }, [documents]);

  return {
    documents,
    loading,
    stats,
    refetch: fetchDocuments,
  };
}
