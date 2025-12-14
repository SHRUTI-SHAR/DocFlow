import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFormSubmissions } from '@/hooks/useFormSubmissions';
import { TemplateLearningService } from '@/services/templateLearning';
import type { TemplateField } from '@/types/template';
import type { Template } from '@/hooks/useTemplateManager';

interface FormData {
  title: string;
  description: string;
  isPublic: boolean;
  template?: Template;
  fields: TemplateField[];
  hierarchicalData?: any;
  sections?: Array<{id: string, name: string, order: number}>;
}

interface UseFormSaveOptions {
  isEditMode: boolean;
  formId?: string;
  preservedOriginalHierarchicalData: any;
}

export const useFormSave = ({ isEditMode, formId, preservedOriginalHierarchicalData }: UseFormSaveOptions) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createPublicForm } = useFormSubmissions();

  const prepareHierarchicalData = (formData: FormData, hierarchicalData?: any): any => {
    let hierarchicalDataToSave: any = {};
    
    if (preservedOriginalHierarchicalData && typeof preservedOriginalHierarchicalData === 'object' && 
        Object.keys(preservedOriginalHierarchicalData).length > 0) {
      // Deep clone with order preservation for nested objects (especially table columns)
      const entries = Object.entries(preservedOriginalHierarchicalData);
      hierarchicalDataToSave = Object.fromEntries(entries.map(([key, value]) => {
        if (Array.isArray(value)) {
          return [key, value.map((item: any) => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              return Object.fromEntries(Object.entries(item));
            }
            return item;
          })];
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return [key, Object.fromEntries(Object.entries(value))];
        }
        return [key, value];
      }));
    } else if (formData.hierarchicalData && typeof formData.hierarchicalData === 'object' && 
               Object.keys(formData.hierarchicalData).length > 0) {
      const entries = Object.entries(formData.hierarchicalData);
      hierarchicalDataToSave = Object.fromEntries(entries);
    } else if (hierarchicalData && typeof hierarchicalData === 'object' && 
               Object.keys(hierarchicalData).length > 0) {
      const entries = Object.entries(hierarchicalData);
      hierarchicalDataToSave = Object.fromEntries(entries);
    }

    // Build from sections if no original data exists
    if (!hierarchicalDataToSave || Object.keys(hierarchicalDataToSave).length === 0) {
      hierarchicalDataToSave = {};
      const sectionsToSave = formData.sections || [];
      const fieldsToSave = formData.fields || [];
      
      sectionsToSave.forEach(section => {
        const sectionFields = fieldsToSave.filter(f => f.section === section.id);
        const sectionData: any = {};
        const nameCounts: Record<string, number> = {};

        sectionFields.forEach(field => {
          const baseKey = (field.label || 'field').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field';
          const count = (nameCounts[baseKey] || 0) + 1;
          nameCounts[baseKey] = count;
          const key = count === 1 ? baseKey : `${baseKey}_${count}`;

          if (field.type === 'table') {
            const rows = (field as any).rows as any[] | undefined;
            if (Array.isArray(rows) && rows.length > 0) {
              sectionData[key] = rows;
            } else {
              const cols = field.columns && field.columns.length > 0 ? field.columns : ['column_1', 'column_2'];
              sectionData[key] = [Object.fromEntries(cols.map((c) => [c, '']))];
            }
          } else if (field.type === 'checkbox') {
            sectionData[key] = [] as string[];
          } else if (field.type === 'signature') {
            sectionData[key] = [{ image_url: '', signed_at: '' }];
          } else {
            sectionData[key] = null;
          }
        });

        const sectionKey = (section.name || 'section').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'section';
        hierarchicalDataToSave[sectionKey] = sectionData;
      });
    }
    
    // Store key order metadata to preserve order through PostgreSQL JSONB storage
    if (Object.keys(hierarchicalDataToSave).length > 0) {
      (hierarchicalDataToSave as any)._keyOrder = Object.keys(hierarchicalDataToSave);
      
      // Store column order for tables AND field order for sections
      Object.entries(hierarchicalDataToSave).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          // Table: store column order
          (hierarchicalDataToSave as any)[`_${key}_columnOrder`] = Object.keys(value[0]);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Section object: store field order (keys within this section)
          const fieldKeys = Object.keys(value).filter(k => !k.startsWith('_')); // Exclude metadata
          if (fieldKeys.length > 0) {
            (hierarchicalDataToSave as any)[`_${key}_fieldOrder`] = fieldKeys;
          }
        }
      });
    }

    return hierarchicalDataToSave;
  };

  const saveForm = async (formData: FormData) => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a form title",
        variant: "destructive"
      });
      return;
    }

    if (formData.fields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one field to your form",
        variant: "destructive"
      });
      return;
    }

    try {
      let sectionsToSave = formData.sections || [];
      let fieldsToSave = formData.fields || [];
      
      // Sort sections by order to preserve LLM/manual order
      if (sectionsToSave.length > 0 && sectionsToSave.some(s => s.order !== undefined)) {
        sectionsToSave = [...sectionsToSave].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const fieldsBySection = new Map<string, typeof fieldsToSave>();
        sectionsToSave.forEach(section => {
          fieldsBySection.set(section.id, []);
        });
        
        fieldsToSave.forEach(field => {
          const sectionId = field.section || 'general';
          if (fieldsBySection.has(sectionId)) {
            fieldsBySection.get(sectionId)!.push(field);
          }
        });
        
        fieldsToSave = sectionsToSave.flatMap(section => 
          fieldsBySection.get(section.id) || []
        );
      } else if (fieldsToSave.length > 0 && sectionsToSave.length === 0) {
        const generalSection = { id: 'general', name: 'General', order: 0 };
        sectionsToSave = [generalSection];
        fieldsToSave = fieldsToSave.map(f => ({ ...f, section: generalSection.id }));
      }
      
      // Clean up unnecessary fields before saving (remove canvas positioning, AI metadata, etc.)
      fieldsToSave = fieldsToSave.map(field => {
        const cleaned: any = {
          id: field.id,
          type: field.type,
          label: field.label,
          required: field.required ?? false,
        };
        
        // Only include section if it exists
        if (field.section) {
          cleaned.section = field.section;
        }
        
        // Only include options if they exist and the field type needs them
        if (field.options && field.options.length > 0 && 
            (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox')) {
          cleaned.options = field.options;
        }
        
        // Only include columns and rows for table fields
        if (field.type === 'table') {
          if (field.columns && field.columns.length > 0) {
            cleaned.columns = field.columns;
          }
          // Preserve rows data if present (for table initialization)
          if ((field as any).rows && Array.isArray((field as any).rows) && (field as any).rows.length > 0) {
            cleaned.rows = (field as any).rows;
          }
        }
        
        // Only include validation if it has actual validation rules
        if (field.validation && Object.keys(field.validation).length > 0) {
          cleaned.validation = field.validation;
        }
        
        // Note: We're NOT including:
        // - x, y (canvas positioning - not needed for form rendering)
        // - width, height (canvas sizing - not needed for form rendering)
        // - confidence (AI detection confidence - not needed)
        // - value (field values - not needed, forms start empty)
        // - suggested (AI suggestion flag - not needed)
        // - Empty options/validation objects
        
        return cleaned;
      });

      const hierarchicalDataToSave = prepareHierarchicalData(formData);

      if (isEditMode && formId) {
        const { error } = await supabase
          .from('public_forms')
          .update({
            form_title: formData.title,
            form_description: formData.description,
            form_config: {
              fields: fieldsToSave,
              sections: sectionsToSave,
              hierarchicalData: hierarchicalDataToSave,
              settings: { isPublic: formData.isPublic },
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', formId);

        if (error) {
          throw error;
        }

        toast({
          title: 'Form updated successfully',
          description: `${formData.title} has been saved`,
        });

        navigate('/forms');
      } else {
        // Create new form
        const baseSlug = formData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        let slug = baseSlug || `form-${Date.now()}`;

        const attemptCreate = async (s: string) => {
          return createPublicForm({
            template_id: formData.template?.id,
            form_title: formData.title,
            form_description: formData.description,
            form_config: {
              fields: fieldsToSave,
              sections: sectionsToSave,
              hierarchicalData: hierarchicalDataToSave,
              settings: { isPublic: formData.isPublic },
            },
            requires_auth: !formData.isPublic,
            allow_multiple_submissions: true,
            public_url_slug: s,
            success_message: 'Thank you for your submission!',
          });
        };

        try {
          await attemptCreate(slug);
        } catch (err: any) {
          const msg = `${err?.message ?? ''} ${err?.details ?? ''}`;
          if (err?.code === '23505' || /duplicate|unique|public_url_slug/i.test(msg)) {
            const suffix = Math.random().toString(36).slice(2, 6);
            slug = `${baseSlug}-${suffix}`;
            await attemptCreate(slug);
          } else if (/not authenticated|auth/i.test(msg)) {
            toast({
              title: 'Session expired',
              description: 'Please sign in to create forms',
              variant: 'destructive',
            });
            navigate('/auth');
            return;
          } else {
            throw err;
          }
        }

        toast({
          title: 'Form created successfully',
          description: `${formData.title} is ready to collect responses`,
        });

        // Track successful template usage
        if (formData.template) {
          await TemplateLearningService.getInstance().trackTemplateUsage(formData.template.id, 'form_creation_success');
        }

        navigate('/forms');
      }
    } catch (error: any) {
      console.error('Error saving form:', error);
      toast({
        title: 'Error saving form',
        description: error?.message || 'Failed to create form. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return { saveForm };
};

