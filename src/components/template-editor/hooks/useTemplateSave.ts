/**
 * Hook for saving templates
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Template } from '@/hooks/useTemplateManager';
import type { TemplateField } from '@/types/template';
import { TemplateLearningService } from '@/services/templateLearning';
import { convertFieldsToHierarchical, convertSectionsToHierarchical } from '../utils/templateDataConverters';
import { removePageSuffixesFromKeys } from '../utils/templateHelpers';

/**
 * Ensures column order metadata exists for all table arrays in hierarchical data
 * This is needed when preserving LLM data that might not have column order metadata
 */
const ensureColumnOrderMetadata = (data: any, parentKey: string = ''): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => ensureColumnOrderMetadata(item, parentKey));
  }

  const result: any = { ...data };

  // Process each key-value pair
  Object.entries(data).forEach(([key, value]) => {
    // Skip metadata keys
    if (key.startsWith('_')) {
      return;
    }

    const currentKey = parentKey ? `${parentKey}_${key}` : key;

    // If value is an array of objects (table), ensure column order metadata exists
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const firstItem = value[0];
      const columnOrderKey = `_${currentKey}_columnOrder`;
      
      // Only add if column order metadata doesn't exist
      if (!(columnOrderKey in result)) {
        // Use object keys order (preserves insertion order from LLM)
        const columnOrder = Object.keys(firstItem);
        if (columnOrder.length > 0) {
          result[columnOrderKey] = columnOrder;
        }
      }

      // Recursively process nested objects in array items (for nested structures)
      result[key] = value.map((item: any) => ensureColumnOrderMetadata(item, currentKey));
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively process nested objects
      result[key] = ensureColumnOrderMetadata(value, currentKey);
    }
  });

  return result;
};

interface UseTemplateSaveParams {
  template: Template;
  fields: TemplateField[];
  sections: Array<{id: string, name: string, order: number}>;
  templateMetadata: {
    name: string;
    description: string;
    document_type: string;
    version: string;
    status: 'draft' | 'active' | 'archived';
    is_public: boolean;
  };
  documentImage?: string;
  preservedHierarchicalData?: any;
  onSave?: (templateData: any) => void;
}

export const useTemplateSave = ({
  template,
  fields,
  sections,
  templateMetadata,
  documentImage,
  preservedHierarchicalData,
  onSave
}: UseTemplateSaveParams) => {
  const { toast } = useToast();

  const saveTemplate = useCallback(async () => {
    // Always regenerate structure from current fields and sections
    // This ensures manually added fields and sections are properly saved
    // Preserved hierarchical data is only used during initial AI extraction, not when saving
    
    // Ensure fields is defined and is an array
    if (!fields || !Array.isArray(fields)) {
      console.error('❌ Fields is not defined or not an array:', fields);
      toast({
        title: "Error",
        description: "No fields found to save. Please add some fields first.",
        variant: "destructive"
      });
      return;
    }
    
    // Build hierarchical structure from current fields and sections (always regenerate)
    // This ensures all manually added fields and sections are included
    let finalHierarchicalStructure;
    if (fields && fields.length > 0) {
      // If we have fields, try to convert from sections first, then fallback to fields
      if (sections && sections.length > 0) {
        // Convert from sections and fields (manually created templates)
        const hierarchicalFromSections = convertSectionsToHierarchical(sections, fields);
        // Only use sections-based conversion if it actually produced fields
        if (Object.keys(hierarchicalFromSections).length > 0 && 
            !Object.values(hierarchicalFromSections).every((val: any) => 
              typeof val === 'object' && val !== null && Object.keys(val).length === 0
            )) {
          finalHierarchicalStructure = hierarchicalFromSections;
        } else {
          // Sections conversion produced empty structure, fallback to fields conversion
          finalHierarchicalStructure = convertFieldsToHierarchical(fields);
        }
      } else {
        // No sections, convert directly from fields array
        finalHierarchicalStructure = convertFieldsToHierarchical(fields);
      }
    } else {
      // No fields at all - return empty structure
      finalHierarchicalStructure = {};
    }
    
    // Remove page suffixes from keys when saving template (for clean template structure)
    const cleanedHierarchicalStructure = removePageSuffixesFromKeys(finalHierarchicalStructure);
    
    // Build metadata object ensuring template_structure preserves LLM order (without page suffixes)
    const existingMetadata = template.metadata || {};
    const finalMetadata: any = {
      ...existingMetadata,
      // Store template_structure without page suffixes for clean template storage
      template_structure: cleanedHierarchicalStructure
    };
    
    // Only include document_image if it has a value (don't set undefined, as JSON will strip it)
    const documentImageValue = documentImage || existingMetadata.document_image || existingMetadata.sample_document_url;
    if (documentImageValue) {
      finalMetadata.document_image = documentImageValue;
    }
    
    const templateData = {
      name: templateMetadata.name,
      description: templateMetadata.description,
      document_type: templateMetadata.document_type,
      fields: fields, // Keep fields array for compatibility with useTemplateManager
      version: templateMetadata.version,
      status: templateMetadata.status,
      is_public: templateMetadata.is_public,
      metadata: finalMetadata  // Explicitly include metadata
    };

    // Track template usage and learning
    if (!template.id.startsWith('new-') && !template.id.startsWith('temp-')) {
      try {
        const learningService = TemplateLearningService.getInstance();
        await learningService.logTemplateUsage(template.id, 'template_saved', true, 1.0);
      } catch (error) {
        console.error('Failed to log template usage:', error);
      }
    }

    if (onSave) {
      onSave(templateData);
    } else {
      toast({
        title: "Template saved",
        description: `${template.name} has been updated successfully`,
      });
    }
  }, [
    template,
    fields,
    sections,
    templateMetadata,
    documentImage,
    preservedHierarchicalData,
    onSave,
    toast
  ]);

  return { saveTemplate };
};

