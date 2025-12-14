import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi-select' | 'url' | 'email';

export interface MetadataDefinition {
  id: string;
  user_id: string;
  field_name: string;
  field_type: FieldType;
  field_label: string;
  description: string | null;
  is_required: boolean;
  default_value: string | null;
  options: string[] | null;
  validation_rules: Record<string, any> | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentMetadata {
  id: string;
  document_id: string;
  definition_id: string;
  user_id: string;
  field_value: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomMetadata() {
  const [definitions, setDefinitions] = useState<MetadataDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDefinitions = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await (supabase
        .from('custom_metadata_definitions')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('is_active', true)
        .order('sort_order') as any);

      if (error) throw error;
      setDefinitions((data || []) as MetadataDefinition[]);
    } catch (error) {
      console.error('Error fetching definitions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  const createDefinition = useCallback(async (
    definition: Omit<MetadataDefinition, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('custom_metadata_definitions')
        .insert({
          ...definition,
          user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Field created',
        description: `Custom field "${definition.field_label}" has been created`,
      });

      fetchDefinitions();
      return data;
    } catch (error) {
      console.error('Error creating definition:', error);
      toast({
        title: 'Error',
        description: 'Failed to create custom field',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchDefinitions, toast]);

  const updateDefinition = useCallback(async (
    id: string,
    updates: Partial<MetadataDefinition>
  ) => {
    try {
      const { error } = await supabase
        .from('custom_metadata_definitions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Field updated',
        description: 'Custom field has been updated',
      });

      fetchDefinitions();
    } catch (error) {
      console.error('Error updating definition:', error);
      toast({
        title: 'Error',
        description: 'Failed to update custom field',
        variant: 'destructive',
      });
    }
  }, [fetchDefinitions, toast]);

  const deleteDefinition = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_metadata_definitions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Field deleted',
        description: 'Custom field has been removed',
      });

      fetchDefinitions();
    } catch (error) {
      console.error('Error deleting definition:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete custom field',
        variant: 'destructive',
      });
    }
  }, [fetchDefinitions, toast]);

  const getDocumentMetadata = useCallback(async (documentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('document_custom_metadata')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', user.user.id);

      if (error) throw error;
      return (data || []) as DocumentMetadata[];
    } catch (error) {
      console.error('Error fetching document metadata:', error);
      return [];
    }
  }, []);

  const setDocumentMetadata = useCallback(async (
    documentId: string,
    definitionId: string,
    value: string | null
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('document_custom_metadata')
        .select('id')
        .eq('document_id', documentId)
        .eq('definition_id', definitionId)
        .single();

      if (existing) {
        await supabase
          .from('document_custom_metadata')
          .update({ field_value: value })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('document_custom_metadata')
          .insert({
            document_id: documentId,
            definition_id: definitionId,
            user_id: user.user.id,
            field_value: value,
          });
      }

      toast({
        title: 'Metadata saved',
        description: 'Document metadata has been updated',
      });
    } catch (error) {
      console.error('Error setting metadata:', error);
      toast({
        title: 'Error',
        description: 'Failed to save metadata',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    definitions,
    isLoading,
    createDefinition,
    updateDefinition,
    deleteDefinition,
    getDocumentMetadata,
    setDocumentMetadata,
    refetch: fetchDefinitions,
  };
}
