import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateField } from "@/types/template";
import { countFieldsFromHierarchicalData } from "@/utils/templateDataOrganizer";

export interface Template {
  id: string;
  name: string;
  description?: string;
  document_type: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
  fields: TemplateField[];
  field_count: number;
  usage_count: number;
  accuracy_score: number;
  is_public: boolean;
  sample_document_url?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  user_id: string;
}

export const useTemplateManager = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const isLoadingRef = useRef(false);

  // Lightweight list fetch: only fetch small columns; supports pagination
  const fetchTemplates = useCallback(async (options?: { page?: number; pageSize?: number }) => {
    if (isLoadingRef.current) return; // Prevent multiple simultaneous fetches
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      const page = Math.max(1, options?.page ?? 1);
      const pageSize = Math.max(1, Math.min(50, options?.pageSize ?? 12));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log('useTemplateManager: User not authenticated, skipping fetch');
        setTemplates([]);
        return;
      }
      
      // Fetch lightweight list from database for current user (no heavy JSON columns)
      const { data: dbTemplates, error, count } = await supabase
        .from('document_templates')
        .select('id,name,description,document_type,version,status,field_count,usage_count,accuracy_score,is_public,created_at,updated_at,created_by,user_id', { count: 'exact' })
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      // Convert database format to frontend format (lightweight, no fields/metadata)
      const convertedTemplates: Template[] = (dbTemplates || []).map((dbTemplate: any) => ({
        id: dbTemplate.id,
        name: dbTemplate.name,
        description: dbTemplate.description || '',
        document_type: dbTemplate.document_type || 'General',
        version: dbTemplate.version || '1.0',
        status: dbTemplate.status || 'draft',
        fields: [],
        field_count: typeof dbTemplate.field_count === 'number' ? dbTemplate.field_count : 0,
        usage_count: dbTemplate.usage_count ?? 0,
        accuracy_score: Number(dbTemplate.accuracy_score ?? 0),
        is_public: Boolean(dbTemplate.is_public),
        metadata: undefined,
        created_at: dbTemplate.created_at,
        updated_at: dbTemplate.updated_at,
        created_by: dbTemplate.created_by,
        user_id: dbTemplate.user_id || 'current-user'
      }));

      // Set templates from DB
      setTemplates(convertedTemplates);
      setTotalCount(count ?? convertedTemplates.length);
      return convertedTemplates;
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Failed to fetch templates",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      setTemplates([]);
      return [];
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch full template by id (heavy data) when opening editor/preview
  const fetchTemplateById = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const { data: row, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;

      // Parse fields and metadata safely
      const dbFields = Array.isArray(row.fields)
        ? row.fields
        : row.fields
          ? (typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields)
          : [];

      let metadata: any = undefined;
      try {
        if (row.metadata) {
          metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        }
      } catch (e) {
        metadata = row.metadata;
      }

      const t: Template = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        document_type: row.document_type || 'General',
        version: row.version || '1.0',
        status: row.status || 'draft',
        fields: dbFields,
        field_count: typeof row.field_count === 'number' ? row.field_count : dbFields.length,
        usage_count: row.usage_count ?? 0,
        accuracy_score: Number(row.accuracy_score ?? 0),
        is_public: Boolean(row.is_public),
        metadata,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        user_id: row.user_id || 'current-user'
      };
      return t;
    } catch (e) {
      console.error('Error fetching template by id:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTemplate = async (templateData: {
    name: string;
    description?: string;
    document_type: string;
    fields: TemplateField[];
    version?: string;
    status?: 'draft' | 'active' | 'archived';
    is_public?: boolean;
    metadata?: any;
    hierarchical_data?: any; // Add support for hierarchical structure
  }) => {
    try {
      setIsLoading(true);
      
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // Save to database - include hierarchical_data in metadata if available
      const hierarchicalData = templateData.metadata?.hierarchical_data;
      const templateMetadata = {
        ...templateData.metadata,
        ...(hierarchicalData && { hierarchical_data: hierarchicalData })
      };
      
      const { data: dbTemplate, error } = await supabase
        .from('document_templates')
        .insert({
          user_id: user.id,
          name: templateData.name,
          description: templateData.description || '',
          document_type: templateData.document_type,
          version: templateData.version || '1.0',
          status: templateData.status || 'draft',
          fields: templateData.fields,
          field_count: hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)
            ? countFieldsFromHierarchicalData(hierarchicalData)
            : templateData.fields.length,
          usage_count: 0,
          accuracy_score: 0,
          is_public: templateData.is_public || false,
          created_by: 'Current User',
          metadata: templateMetadata
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to create template: ${error.message}`);
      }

      // Convert to frontend format
      const newTemplate: Template = {
        id: dbTemplate.id,
        name: dbTemplate.name,
        description: dbTemplate.description || '',
        document_type: dbTemplate.document_type,
        version: dbTemplate.version || '1.0',
        status: dbTemplate.status || 'draft',
        fields: dbTemplate.fields || templateData.fields,
        field_count: dbTemplate.field_count ?? (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)
          ? countFieldsFromHierarchicalData(hierarchicalData)
          : templateData.fields.length),
        usage_count: dbTemplate.usage_count ?? 0,
        accuracy_score: Number(dbTemplate.accuracy_score ?? 0),
        is_public: Boolean(dbTemplate.is_public),
        metadata: templateData.metadata || {},
        created_at: dbTemplate.created_at,
        updated_at: dbTemplate.updated_at,
        created_by: dbTemplate.created_by,
        user_id: dbTemplate.user_id || 'current-user'
      };

      setTemplates(prev => [newTemplate, ...prev]);
      toast({
        title: "Template created successfully",
        description: `${templateData.name} has been saved to database`
      });
      return newTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Failed to create template",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplate = async (id: string, updates: Partial<Template>) => {
    try {
      setIsLoading(true);
      
      // Build update object - only include fields that are actually provided
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.document_type !== undefined) updateData.document_type = updates.document_type;
      if (updates.version !== undefined) updateData.version = updates.version;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.fields !== undefined) {
        updateData.fields = updates.fields;
        // Calculate field_count from hierarchical data if available, otherwise use fields.length
        const hierarchicalData = updates.metadata?.template_structure || updates.metadata?.hierarchical_data;
        updateData.field_count = hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)
          ? countFieldsFromHierarchicalData(hierarchicalData)
          : updates.fields.length;
      }
      if (updates.is_public !== undefined) updateData.is_public = updates.is_public;
      // CRITICAL: Include metadata to save template_structure and other metadata
      // Check if metadata exists (even if it's an empty object or null)
      if ('metadata' in updates) {
        // Ensure metadata is a plain object (not undefined/null) - Supabase JSONB requires a valid JSON value
            if (updates.metadata !== null && updates.metadata !== undefined) {
              updateData.metadata = updates.metadata;
            } else {
          // Explicitly set to empty object if null/undefined to clear metadata
          updateData.metadata = {};
        }
      }
      
      // Update in database - explicitly select metadata to ensure it's returned
      const { error, data } = await supabase
        .from('document_templates')
        .update(updateData)
        .eq('id', id)
        .select('*, metadata');

      if (error) {
        console.error('❌ Database update error:', error);
        throw new Error(`Failed to update template: ${error.message}`);
      }
      if (data && data.length > 0) {
        const responseMetadata = data[0].metadata;
        const parsedMetadata = typeof responseMetadata === 'string' 
          ? JSON.parse(responseMetadata) 
          : responseMetadata;
        
        // Log only if there's an issue
        if (!parsedMetadata || !parsedMetadata.template_structure) {
          console.warn('⚠️ Template metadata missing template_structure:', {
            has_metadata: !!parsedMetadata,
            metadata_keys: parsedMetadata ? Object.keys(parsedMetadata) : []
          });
        }
        
        // Compare sent vs received
        if (updateData.metadata) {
          const sentKeys = Object.keys(updateData.metadata);
          const receivedKeys = parsedMetadata ? Object.keys(parsedMetadata) : [];
          const missingKeys = sentKeys.filter(k => !receivedKeys.includes(k));
          const extraKeys = receivedKeys.filter(k => !sentKeys.includes(k));
          
          if (missingKeys.length > 0) {
            console.error('❌ Metadata keys missing in response:', missingKeys);
            console.error('Sent metadata:', updateData.metadata);
            console.error('Received metadata:', parsedMetadata);
          }
        }
      }

      // Use the response data if available, otherwise fetch separately
      let updatedDbTemplate = data && data.length > 0 ? data[0] : null;
      
      // Verify metadata was saved (only log if there's an issue)
      if (updatedDbTemplate && updateData.metadata) {
        const savedMetadata = typeof updatedDbTemplate.metadata === 'string' 
          ? JSON.parse(updatedDbTemplate.metadata) 
          : updatedDbTemplate.metadata;
        
        // If metadata wasn't saved properly, log a warning
        if (!savedMetadata || !savedMetadata.template_structure) {
          console.error('❌ WARNING: Metadata was not saved properly in database!');
          console.error('Expected metadata:', updateData.metadata);
          console.error('Saved metadata:', savedMetadata);
        }
      }
      
      if (!updatedDbTemplate) {
        // Fetch updated template from database to get all fields including metadata
        const { data: fetchedData, error: fetchError } = await supabase
          .from('document_templates')
          .select('*')
          .eq('id', id)
          .single();
    
        if (fetchError) {
          console.error('Failed to fetch updated template:', fetchError);
          updatedDbTemplate = null;
        } else {
          updatedDbTemplate = fetchedData;
        }
      }

      let updatedTemplate: Template | undefined;
      setTemplates(prev => {
        const next = prev.map(t => {
          if (t.id === id) {
            // Use database response if available, otherwise merge updates
            if (updatedDbTemplate) {
              const dbFields = Array.isArray(updatedDbTemplate.fields)
                ? updatedDbTemplate.fields
                : updatedDbTemplate.fields
                  ? (typeof updatedDbTemplate.fields === 'string' ? JSON.parse(updatedDbTemplate.fields) : updatedDbTemplate.fields)
                  : [];
              
              let metadata: any = undefined;
              try {
                if (updatedDbTemplate.metadata) {
                  metadata = typeof updatedDbTemplate.metadata === 'string'
                    ? JSON.parse(updatedDbTemplate.metadata)
                    : updatedDbTemplate.metadata;
                }
              } catch (e) {
                console.warn('Failed to parse updated template metadata', e);
                metadata = updatedDbTemplate.metadata;
              }

              return {
                id: updatedDbTemplate.id,
                name: updatedDbTemplate.name,
                description: updatedDbTemplate.description || '',
                document_type: updatedDbTemplate.document_type || 'General',
                version: updatedDbTemplate.version || '1.0',
                status: updatedDbTemplate.status || 'draft',
                fields: dbFields,
                field_count: updatedDbTemplate.field_count ?? dbFields.length,
                usage_count: updatedDbTemplate.usage_count ?? 0,
                accuracy_score: Number(updatedDbTemplate.accuracy_score ?? 0),
                is_public: Boolean(updatedDbTemplate.is_public),
                metadata,
                created_at: updatedDbTemplate.created_at,
                updated_at: updatedDbTemplate.updated_at,
                created_by: updatedDbTemplate.created_by,
                user_id: updatedDbTemplate.user_id || 'current-user'
              } as Template;
            } else {
              // Fallback to merging updates if fetch failed
              return {
                ...t,
                ...updates,
                field_count: updates.fields?.length ?? t.field_count,
                updated_at: new Date().toISOString()
              };
            }
          }
          return t;
        });
        updatedTemplate = next.find(t => t.id === id);
        return next;
      });
      
      toast({
        title: "Template updated",
        description: "Changes have been saved to database"
      });
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Failed to update template",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Delete from database
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to delete template: ${error.message}`);
      }

      setTemplates(prev => {
        return prev.filter(t => t.id !== id);
      });
      toast({
        title: "Template deleted",
        description: "Template has been removed from database"
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Failed to delete template",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logTemplateUsage = async (templateId: string, analysisData: any) => {
    try {
      // Mock usage logging - would integrate with database in production
      console.log('Template usage logged:', { templateId, analysisData });
    } catch (error) {
      console.error('Error logging template usage:', error);
    }
  };

  return {
    templates,
    isLoading,
    fetchTemplates,
    fetchTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    logTemplateUsage
  };
};