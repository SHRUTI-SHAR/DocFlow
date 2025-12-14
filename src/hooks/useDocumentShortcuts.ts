import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentShortcut {
  id: string;
  document_id: string;
  folder_id: string;
  user_id: string;
  shortcut_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocumentShortcuts() {
  const [shortcuts, setShortcuts] = useState<DocumentShortcut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchShortcuts = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('document_shortcuts')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShortcuts(data || []);
    } catch (error) {
      console.error('Error fetching shortcuts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShortcuts();
  }, [fetchShortcuts]);

  const createShortcut = useCallback(async (documentId: string, folderId: string, name?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Check if shortcut already exists
      const { data: existing } = await supabase
        .from('document_shortcuts')
        .select('id')
        .eq('document_id', documentId)
        .eq('folder_id', folderId)
        .eq('user_id', user.user.id)
        .single();

      if (existing) {
        toast({
          title: "Shortcut exists",
          description: "This document already has a shortcut in this folder",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from('document_shortcuts')
        .insert({
          document_id: documentId,
          folder_id: folderId,
          user_id: user.user.id,
          shortcut_name: name,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Shortcut created",
        description: "Document shortcut added to folder",
      });

      fetchShortcuts();
      return data;
    } catch (error) {
      console.error('Error creating shortcut:', error);
      toast({
        title: "Error",
        description: "Failed to create shortcut",
        variant: "destructive",
      });
      return null;
    }
  }, [fetchShortcuts, toast]);

  const deleteShortcut = useCallback(async (shortcutId: string) => {
    try {
      const { error } = await supabase
        .from('document_shortcuts')
        .delete()
        .eq('id', shortcutId);

      if (error) throw error;

      toast({
        title: "Shortcut removed",
        description: "Document shortcut has been removed",
      });

      fetchShortcuts();
    } catch (error) {
      console.error('Error deleting shortcut:', error);
      toast({
        title: "Error",
        description: "Failed to remove shortcut",
        variant: "destructive",
      });
    }
  }, [fetchShortcuts, toast]);

  const getShortcutsForDocument = useCallback((documentId: string) => {
    return shortcuts.filter(s => s.document_id === documentId);
  }, [shortcuts]);

  const getShortcutsForFolder = useCallback((folderId: string) => {
    return shortcuts.filter(s => s.folder_id === folderId);
  }, [shortcuts]);

  const hasShortcutInFolder = useCallback((documentId: string, folderId: string) => {
    return shortcuts.some(s => s.document_id === documentId && s.folder_id === folderId);
  }, [shortcuts]);

  return {
    shortcuts,
    isLoading,
    createShortcut,
    deleteShortcut,
    getShortcutsForDocument,
    getShortcutsForFolder,
    hasShortcutInFolder,
    refetch: fetchShortcuts,
  };
}
