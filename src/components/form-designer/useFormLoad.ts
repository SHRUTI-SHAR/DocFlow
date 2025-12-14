import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TemplateField } from '@/types/template';

interface FormData {
  title: string;
  description: string;
  isPublic: boolean;
  fields: TemplateField[];
  hierarchicalData?: any;
  sections?: Array<{id: string, name: string, order: number}>;
}

interface UseFormLoadOptions {
  isEditMode: boolean;
  formId?: string;
  user: any;
  onFormLoaded: (data: {
    formData: FormData;
    hierarchicalData: any;
    preservedOriginalHierarchicalData: any;
  }) => void;
  onLoadingChange: (loading: boolean) => void;
}

export const useFormLoad = ({ 
  isEditMode, 
  formId, 
  user, 
  onFormLoaded,
  onLoadingChange 
}: UseFormLoadOptions) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only load if we haven't already loaded this formId
    if (isEditMode && formId && user && hasLoadedRef.current !== formId) {
      hasLoadedRef.current = formId;
      const loadForm = async () => {
        try {
          const { data, error } = await supabase
            .from('public_forms')
            .select('id, user_id, form_title, form_description, form_config, public_url_slug')
            .eq('id', formId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to load form.', variant: 'destructive' });
            navigate('/forms');
            return;
          }
          
          if (!data) {
            toast({ title: 'Not found', description: 'Form not found or you lack access.', variant: 'destructive' });
            navigate('/forms');
            return;
          }

          const cfg = (data.form_config as any) || {};
          const formData: FormData = {
            title: data.form_title,
            description: data.form_description || '',
            isPublic: !cfg.settings?.requires_auth,
            fields: cfg.fields || [],
            hierarchicalData: cfg.hierarchicalData || {},
            sections: cfg.sections || []
          };
          
          let hierarchicalData = cfg.hierarchicalData || {};
          let preservedOriginalHierarchicalData = null;

          if (cfg.hierarchicalData) {
            // Restore key order from metadata if available
            let orderedData = cfg.hierarchicalData;
            if (typeof cfg.hierarchicalData === 'object' && cfg.hierarchicalData !== null) {
              const keyOrder = (cfg.hierarchicalData as any)._keyOrder;
              if (Array.isArray(keyOrder) && keyOrder.length > 0) {
                const unordered = { ...cfg.hierarchicalData };
                delete (unordered as any)._keyOrder;
                Object.keys(unordered).forEach(key => {
                  if (key.startsWith('_') && key.endsWith('_columnOrder')) {
                    delete (unordered as any)[key];
                  }
                });
                
                orderedData = {} as any;
                keyOrder.forEach((key: string) => {
                  if (key in unordered) {
                    const value = unordered[key];
                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                      const columnOrder = (cfg.hierarchicalData as any)[`_${key}_columnOrder`];
                      if (Array.isArray(columnOrder)) {
                        orderedData[key] = value.map((row: any) => {
                          if (typeof row === 'object' && row !== null) {
                            const orderedRow: any = {};
                            columnOrder.forEach((colKey: string) => {
                              if (colKey in row) {
                                orderedRow[colKey] = row[colKey];
                              }
                            });
                            return orderedRow;
                          }
                          return row;
                        });
                      } else {
                        orderedData[key] = value;
                      }
                    } else {
                      orderedData[key] = value;
                    }
                  }
                });
              }
            }
            
            hierarchicalData = orderedData;
            preservedOriginalHierarchicalData = typeof orderedData === 'object' && orderedData !== null
              ? JSON.parse(JSON.stringify(orderedData))
              : orderedData;
          }

          onFormLoaded({
            formData,
            hierarchicalData,
            preservedOriginalHierarchicalData
          });

          onLoadingChange(false);
        } catch (error) {
          console.error('Error loading form:', error);
          toast({ title: 'Error', description: 'Failed to load form.', variant: 'destructive' });
          navigate('/forms');
        }
      };
      
      loadForm();
    }
  }, [isEditMode, formId, user?.id, navigate, toast]);
};