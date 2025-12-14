import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuickAccessItem {
  id: string;
  document_id: string;
  user_id: string;
  access_count: number;
  last_accessed_at: string | null;
  ai_score: number;
  ai_reason: string | null;
  is_pinned: boolean;
  pin_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuickAccessWithDocument extends QuickAccessItem {
  document?: {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_at: string;
    storage_url?: string;
  };
}

export function useQuickAccess() {
  const [quickAccessItems, setQuickAccessItems] = useState<QuickAccessWithDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchQuickAccess = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await (supabase
        .from('quick_access')
        .select('*')
        .eq('user_id', user.user.id)
        .order('is_pinned', { ascending: false })
        .order('ai_score', { ascending: false })
        .order('access_count', { ascending: false }) as any);

      if (error) throw error;
      setQuickAccessItems(data || []);
    } catch (error) {
      console.error('Error fetching quick access:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuickAccess();
  }, [fetchQuickAccess]);

  const trackAccess = useCallback(async (documentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Check if entry exists
      const { data: existing } = await supabase
        .from('quick_access')
        .select('id, access_count')
        .eq('document_id', documentId)
        .eq('user_id', user.user.id)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from('quick_access')
          .update({
            access_count: existing.access_count + 1,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new
        await supabase
          .from('quick_access')
          .insert({
            document_id: documentId,
            user_id: user.user.id,
            access_count: 1,
            last_accessed_at: new Date().toISOString(),
            ai_score: 0,
          });
      }

      fetchQuickAccess();
    } catch (error) {
      console.error('Error tracking access:', error);
    }
  }, [fetchQuickAccess]);

  const pinDocument = useCallback(async (documentId: string, pinOrder?: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: existing } = await supabase
        .from('quick_access')
        .select('id')
        .eq('document_id', documentId)
        .eq('user_id', user.user.id)
        .single();

      if (existing) {
        await supabase
          .from('quick_access')
          .update({ is_pinned: true, pin_order: pinOrder || 0 })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('quick_access')
          .insert({
            document_id: documentId,
            user_id: user.user.id,
            is_pinned: true,
            pin_order: pinOrder || 0,
            ai_score: 0,
          });
      }

      toast({
        title: "Pinned to Quick Access",
        description: "Document is now in your priority list",
      });

      fetchQuickAccess();
    } catch (error) {
      console.error('Error pinning document:', error);
      toast({
        title: "Error",
        description: "Failed to pin document",
        variant: "destructive",
      });
    }
  }, [fetchQuickAccess, toast]);

  const unpinDocument = useCallback(async (documentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      await supabase
        .from('quick_access')
        .update({ is_pinned: false, pin_order: null })
        .eq('document_id', documentId)
        .eq('user_id', user.user.id);

      toast({
        title: "Unpinned",
        description: "Document removed from priority list",
      });

      fetchQuickAccess();
    } catch (error) {
      console.error('Error unpinning document:', error);
    }
  }, [fetchQuickAccess, toast]);

  const updateAIScore = useCallback(async (documentId: string, score: number, reason: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: existing } = await supabase
        .from('quick_access')
        .select('id')
        .eq('document_id', documentId)
        .eq('user_id', user.user.id)
        .single();

      if (existing) {
        await supabase
          .from('quick_access')
          .update({ ai_score: score, ai_reason: reason })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('quick_access')
          .insert({
            document_id: documentId,
            user_id: user.user.id,
            ai_score: score,
            ai_reason: reason,
          });
      }

      fetchQuickAccess();
    } catch (error) {
      console.error('Error updating AI score:', error);
    }
  }, [fetchQuickAccess]);

  const isPinned = useCallback((documentId: string) => {
    return quickAccessItems.some(item => item.document_id === documentId && item.is_pinned);
  }, [quickAccessItems]);

  const getAccessCount = useCallback((documentId: string) => {
    const item = quickAccessItems.find(i => i.document_id === documentId);
    return item?.access_count || 0;
  }, [quickAccessItems]);

  return {
    quickAccessItems,
    isLoading,
    trackAccess,
    pinDocument,
    unpinDocument,
    updateAIScore,
    isPinned,
    getAccessCount,
    refetch: fetchQuickAccess,
  };
}
