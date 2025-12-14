/**
 * Hook for template field extraction from documents
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DocumentAnalysisService } from '@/services/documentAnalysis';
import type { TemplateField } from '@/types/template';
import { convertHierarchicalToFields } from '../utils/templateDataConverters';
import { formatFieldName } from '../utils/templateHelpers';

interface UseTemplateExtractionReturn {
  isExtracting: boolean;
  extractionText: string | null;
  showExtraction: boolean;
  setIsExtracting: React.Dispatch<React.SetStateAction<boolean>>;
  setExtractionText: React.Dispatch<React.SetStateAction<string | null>>;
  setShowExtraction: React.Dispatch<React.SetStateAction<boolean>>;
  extractFields: (
    documentImage: string,
    templateName: string,
    onFieldsExtracted: (fields: TemplateField[], sections: Array<{id: string, name: string, order: number}>) => void,
    onHierarchicalDataExtracted?: (hierarchicalData: any) => void
  ) => Promise<void>;
}

export const useTemplateExtraction = (): UseTemplateExtractionReturn => {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionText, setExtractionText] = useState<string | null>(null);
  const [showExtraction, setShowExtraction] = useState(false);

  const extractFields = useCallback(async (
    documentImage: string,
    templateName: string,
    onFieldsExtracted: (fields: TemplateField[], sections: Array<{id: string, name: string, order: number}>) => void,
    onHierarchicalDataExtracted?: (hierarchicalData: any) => void
  ) => {
    if (!documentImage) {
      toast({
        title: "No document available",
        description: "Upload a document or open a template with a sample document first.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExtracting(true);
      toast({
        title: "Running Field Detection",
        description: "Analyzing document and detecting form fields...",
      });

      // Validate documentImage is a string (data URL)
      if (typeof documentImage !== 'string') {
        throw new Error('Document image is not in the correct format. Please upload the document again.');
      }

      if (!documentImage.startsWith('data:')) {
        throw new Error('Document image is not a valid data URL. Please upload the document again.');
      }

      const service = DocumentAnalysisService.getInstance();
      const result = await service.analyzeDocument(
        documentImage,
        'field_detection',
        templateName || 'document',
        null
      );

      // For field_detection task, we don't need extractedText
      // Only show extraction text if we actually have text content
      const text = result?.extractedText || '';
      if (text) {
        setExtractionText(text);
        setShowExtraction(true);
      }

      // Auto-create fields based on detected fields
      let autoFields: TemplateField[] = [];
      let detectedSections: Array<{id: string, name: string, order: number}> = [];
      
      // First, check if we have hierarchical_data from backend (prioritize this)
      // Note: result structure is { success, task, result: { hierarchical_data, fields, ... }, ... }
      const hierarchicalData = result?.result?.hierarchical_data;
      
      if (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)) {
        // Get key order from metadata to preserve section sequence
        const keyOrder = (hierarchicalData as any)?._keyOrder;
        const orderedKeys: string[] = [];
        
        if (Array.isArray(keyOrder) && keyOrder.length > 0) {
          // Use _keyOrder to determine section order
          orderedKeys.push(...keyOrder);
        }
        
        // Convert hierarchical_data to sections and fields
        const sectionMap = new Map<string, {id: string, name: string, order: number}>();
        let fieldIndex = 0;
        const baseTimestamp = Date.now();
        
        // First pass: collect all keys (in order if _keyOrder exists, otherwise in natural order)
        const allKeys = orderedKeys.length > 0 
          ? [...orderedKeys, ...Object.keys(hierarchicalData).filter(k => !k.startsWith('_') && !orderedKeys.includes(k))]
          : Object.keys(hierarchicalData).filter(k => !k.startsWith('_'));
        
        // Process keys in order
        allKeys.forEach((key, orderIndex) => {
          // Skip if key doesn't exist in hierarchicalData or is metadata
          if (!(key in hierarchicalData) || key.startsWith('_')) return;
          
          const value = hierarchicalData[key];
          
          // Format section name - strip page suffixes for display
          // Remove page suffixes from key before formatting
          const cleanedKey = key
            .replace(/_page_\d+$/i, '')
            .replace(/[_\s]page\s*\d+$/i, '')
            .replace(/\s+page\s+\d+$/i, '');
          const sectionName = formatFieldName(cleanedKey);
          const sectionId = cleanedKey.toLowerCase();
          
          // Create section if it doesn't exist, using order from _keyOrder
          if (!sectionMap.has(sectionId)) {
            sectionMap.set(sectionId, {
              id: sectionId,
              name: sectionName,
              order: orderedKeys.length > 0 ? orderIndex : sectionMap.size
            });
          }
          
          // Process the value based on its type
          // Check for null first (typeof null === 'object' in JavaScript, which is a quirk)
          if (value === null) {
            // Simple field with null value
            autoFields.push({
              id: `auto-field-${baseTimestamp}-${fieldIndex}`,
              type: 'text',
              label: sectionName,
              required: false,
              confidence: 0.85,
              value: '',
              suggested: true,
              section: sectionId
            });
            fieldIndex++;
          } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
            // This is a table structure
            const firstRow = value[0];
            
            // Check for column order metadata (preserves LLM/database order)
            const columnOrderKey = `_${key}_columnOrder`;
            const columnOrder = (hierarchicalData as any)?.[columnOrderKey];
            const tableColumns = Array.isArray(columnOrder) && columnOrder.length > 0 
              ? columnOrder.filter((col: string) => firstRow && col in firstRow) // Only include columns that exist
              : (firstRow ? Object.keys(firstRow) : []); // Fallback to object keys (preserves insertion order)
            
            // Ensure all columns from firstRow are included (some might be missing from metadata)
            const allColumns = new Set(tableColumns);
            if (firstRow) {
              Object.keys(firstRow).forEach(col => allColumns.add(col));
            }
            const orderedColumns = Array.from(allColumns);
            
            // Check for nested objects in table rows (for grouped headers)
            const hasNestedObjects = firstRow ? Object.values(firstRow).some(val => 
              typeof val === 'object' && val !== null && !Array.isArray(val)
            ) : false;
            
            let groupedHeaders: Array<{ name: string; colspan: number; subHeaders: string[] }> | undefined;
            let flatColumns: string[] | undefined;
            
            if (hasNestedObjects) {
              // Create grouped headers structure - preserve column order
              groupedHeaders = [];
              flatColumns = [];
              
              // Use ordered columns to preserve original order
              orderedColumns.forEach((colKey) => {
                const colValue = firstRow[colKey];
                if (typeof colValue === 'object' && colValue !== null && !Array.isArray(colValue)) {
                  // Nested object - create grouped header
                  // Preserve sub-key order from object (Object.keys preserves insertion order)
                  const subKeys = Object.keys(colValue);
                  groupedHeaders!.push({
                    name: colKey,
                    colspan: subKeys.length,
                    subHeaders: subKeys
                  });
                  // Add flat columns for sub-keys in order
                  subKeys.forEach(subKey => {
                    flatColumns!.push(`${colKey}_${subKey}`);
                  });
                } else {
                  // Regular column
                  flatColumns!.push(colKey);
                  groupedHeaders!.push({
                    name: colKey,
                    colspan: 1,
                    subHeaders: []
                  });
                }
              });
            }
            
            const tableField: TemplateField = {
              id: `auto-field-${baseTimestamp}-${fieldIndex}`,
              type: 'table',
              label: sectionName,
              required: false,
              confidence: 0.85,
              value: '',
              suggested: true,
              section: sectionId,
              columns: hasNestedObjects ? flatColumns! : orderedColumns,
              isGroupedTable: hasNestedObjects,
              groupedHeaders: hasNestedObjects ? groupedHeaders : undefined
            };
            
            autoFields.push(tableField);
            fieldIndex++;
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            // This is a nested object - process each property
            // Get field order from metadata to preserve field sequence within section
            const fieldOrderKey = `_${key}_fieldOrder`;
            const fieldOrder = (hierarchicalData as any)?.[fieldOrderKey];
            const orderedFieldKeys: string[] = [];
            
            if (Array.isArray(fieldOrder) && fieldOrder.length > 0) {
              // Use _${key}_fieldOrder to determine field order
              orderedFieldKeys.push(...fieldOrder);
            }
            
            // Get all field keys (in order if _${key}_fieldOrder exists, otherwise in natural order)
            const allFieldKeys = orderedFieldKeys.length > 0
              ? [...orderedFieldKeys, ...Object.keys(value).filter(k => !k.startsWith('_') && !orderedFieldKeys.includes(k))]
              : Object.keys(value).filter(k => !k.startsWith('_'));
            
            if (allFieldKeys.length === 0) {
              // Empty object - skip this section
              return;
            }
            
            // Process fields in order
            allFieldKeys.forEach((nestedKey) => {
              // Skip if key doesn't exist in value
              if (!(nestedKey in value)) return;
              
              const nestedValue = value[nestedKey];
              
              if (Array.isArray(nestedValue) && nestedValue.length > 0 && typeof nestedValue[0] === 'object' && nestedValue[0] !== null) {
                // Nested table
                const firstRow = nestedValue[0];
                
                // Check for column order metadata for nested table
                const nestedColumnOrderKey = `_${key}_${nestedKey}_columnOrder`;
                const nestedColumnOrder = (hierarchicalData as any)?.[nestedColumnOrderKey];
                const tableColumns = Array.isArray(nestedColumnOrder) && nestedColumnOrder.length > 0
                  ? nestedColumnOrder.filter((col: string) => firstRow && col in firstRow)
                  : (firstRow ? Object.keys(firstRow) : []); // Fallback to object keys
                
                // Ensure all columns are included
                const allNestedColumns = new Set(tableColumns);
                if (firstRow) {
                  Object.keys(firstRow).forEach(col => allNestedColumns.add(col));
                }
                const orderedNestedColumns = Array.from(allNestedColumns);
                
                // Check for nested objects in nested table rows
                const hasNestedObjects = firstRow ? Object.values(firstRow).some(val => 
                  typeof val === 'object' && val !== null && !Array.isArray(val)
                ) : false;
                
                let groupedHeaders: Array<{ name: string; colspan: number; subHeaders: string[] }> | undefined;
                let flatColumns: string[] | undefined;
                
                if (hasNestedObjects) {
                  groupedHeaders = [];
                  flatColumns = [];
                  
                  orderedNestedColumns.forEach((colKey) => {
                    const colValue = firstRow[colKey];
                    if (typeof colValue === 'object' && colValue !== null && !Array.isArray(colValue)) {
                      const subKeys = Object.keys(colValue);
                      groupedHeaders!.push({
                        name: colKey,
                        colspan: subKeys.length,
                        subHeaders: subKeys
                      });
                      subKeys.forEach(subKey => {
                        flatColumns!.push(`${colKey}_${subKey}`);
                      });
                    } else {
                      flatColumns!.push(colKey);
                      groupedHeaders!.push({
                        name: colKey,
                        colspan: 1,
                        subHeaders: []
                      });
                    }
                  });
                }
                
                const nestedTableField: TemplateField = {
                  id: `auto-field-${baseTimestamp}-${fieldIndex}`,
                  type: 'table',
                  label: formatFieldName(nestedKey),
                  required: false,
                  confidence: 0.85,
                  value: '',
                  suggested: true,
                  section: sectionId,
                  columns: hasNestedObjects ? flatColumns! : orderedNestedColumns,
                  isGroupedTable: hasNestedObjects,
                  groupedHeaders: hasNestedObjects ? groupedHeaders : undefined
                };
                
                autoFields.push(nestedTableField);
                fieldIndex++;
              } else if (typeof nestedValue === 'object' && nestedValue !== null && !Array.isArray(nestedValue)) {
                // This is a nested object - check if it contains actual fields or is just metadata
                const nestedObjectKeys = Object.keys(nestedValue).filter(k => !k.startsWith('_') && k !== 'type' && k !== 'value');
                
                if (nestedObjectKeys.length > 0) {
                  // This nested object contains fields - create a section for it and extract fields
                  // Use only the nested key name (not concatenated with parent) for display
                  let cleanedNestedKey = nestedKey
                    .replace(/_page_\d+$/i, '')
                    .replace(/[_\s]page\s*\d+$/i, '')
                    .replace(/\s+page\s+\d+$/i, '');
                  
                  // If the nested key contains the parent section ID, extract just the unique part
                  // e.g., "registration_certificate_of_vehicle_registration_details" -> "registration_details"
                  const parentSectionIdLower = sectionId.toLowerCase();
                  const cleanedNestedKeyLower = cleanedNestedKey.toLowerCase();
                  
                  // Check if nested key starts with parent section ID
                  if (cleanedNestedKeyLower.startsWith(parentSectionIdLower + '_')) {
                    // Extract the part after the parent section ID
                    cleanedNestedKey = cleanedNestedKey.substring(parentSectionIdLower.length + 1);
                  } else if (cleanedNestedKeyLower.includes(parentSectionIdLower)) {
                    // If parent section ID appears anywhere in the nested key, extract the suffix
                    const parts = cleanedNestedKey.split('_');
                    const parentParts = parentSectionIdLower.split('_');
                    
                    // Find the index where parent parts end
                    let matchStart = -1;
                    for (let i = 0; i <= parts.length - parentParts.length; i++) {
                      let matches = true;
                      for (let j = 0; j < parentParts.length; j++) {
                        if (parts[i + j]?.toLowerCase() !== parentParts[j]) {
                          matches = false;
                          break;
                        }
                      }
                      if (matches) {
                        matchStart = i;
                        break;
                      }
                    }
                    
                    if (matchStart >= 0 && matchStart + parentParts.length < parts.length) {
                      // Use the parts after the parent section
                      cleanedNestedKey = parts.slice(matchStart + parentParts.length).join('_');
                    } else {
                      // Fallback: use the last 1-2 parts (usually the actual section name)
                      cleanedNestedKey = parts.slice(-2).join('_');
                    }
                  }
                  
                  const nestedSectionName = formatFieldName(cleanedNestedKey);
                  // Create unique section ID by concatenating, but use cleaned key for uniqueness
                  const nestedSectionId = `${sectionId}_${cleanedNestedKey}`.toLowerCase();
                  
                  // Create section if it doesn't exist
                  if (!sectionMap.has(nestedSectionId)) {
                    sectionMap.set(nestedSectionId, {
                      id: nestedSectionId,
                      name: nestedSectionName,
                      order: sectionMap.size
                    });
                  } else {
                    // If section already exists, ensure the name is correct (not concatenated)
                    const existingSection = sectionMap.get(nestedSectionId);
                    if (existingSection && existingSection.name !== nestedSectionName) {
                      existingSection.name = nestedSectionName;
                    }
                  }
                  
                  // Get field order for nested section
                  const nestedFieldOrderKey = `_${key}_${nestedKey}_fieldOrder`;
                  const nestedFieldOrder = (hierarchicalData as any)?.[nestedFieldOrderKey];
                  const orderedNestedFieldKeys: string[] = [];
                  
                  if (Array.isArray(nestedFieldOrder) && nestedFieldOrder.length > 0) {
                    orderedNestedFieldKeys.push(...nestedFieldOrder);
                  }
                  
                  const allNestedFieldKeys = orderedNestedFieldKeys.length > 0
                    ? [...orderedNestedFieldKeys, ...nestedObjectKeys.filter(k => !orderedNestedFieldKeys.includes(k))]
                    : nestedObjectKeys;
                  
                  // Extract fields from nested object
                  allNestedFieldKeys.forEach((fieldKey) => {
                    if (!(fieldKey in nestedValue)) return;
                    
                    const fieldValue = nestedValue[fieldKey];
                    
                    // Skip metadata fields
                    if (fieldKey === 'type' || fieldKey === 'value') return;
                    
                    // Check if it's a typed field
                    if (typeof fieldValue === 'object' && fieldValue !== null && '_type' in fieldValue) {
                      autoFields.push({
                        id: `auto-field-${baseTimestamp}-${fieldIndex}`,
                        type: fieldValue._type || 'text',
                        label: formatFieldName(fieldKey),
                        required: false,
                        confidence: 0.85,
                        value: '',
                        suggested: true,
                        section: nestedSectionId,
                        options: Array.isArray(fieldValue.options) ? fieldValue.options : []
                      });
                    } else {
                      // Regular field
                      autoFields.push({
                        id: `auto-field-${baseTimestamp}-${fieldIndex}`,
                        type: 'text',
                        label: formatFieldName(fieldKey),
                        required: false,
                        confidence: 0.85,
                        value: '',
                        suggested: true,
                        section: nestedSectionId
                      });
                    }
                    fieldIndex++;
                  });
                } else {
                  // Empty nested object or only metadata - treat as simple field
                  const fieldLabel = formatFieldName(nestedKey);
                  autoFields.push({
                    id: `auto-field-${baseTimestamp}-${fieldIndex}`,
                    type: 'text',
                    label: fieldLabel,
                    required: false,
                    confidence: 0.85,
                    value: '',
                    suggested: true,
                    section: sectionId
                  });
                  fieldIndex++;
                }
              } else {
                // Skip "type" and "value" metadata fields - they're not actual form fields
                if (nestedKey === 'type' || nestedKey === 'value') {
                  return;
                }
                
                // Check if nested value is a typed field (new LLM format)
                if (typeof nestedValue === 'object' && nestedValue !== null && '_type' in nestedValue) {
                  // Handle typed field
                  const fieldLabel = formatFieldName(nestedKey);
                  autoFields.push({
                    id: `auto-field-${baseTimestamp}-${fieldIndex}`,
                    type: nestedValue._type || 'text',
                    label: fieldLabel,
                    required: false,
                    confidence: 0.85,
                    value: '',
                    suggested: true,
                    section: sectionId,
                    options: Array.isArray(nestedValue.options) ? nestedValue.options : []
                  });
                  fieldIndex++;
                } else {
                  // Regular field (handles null, string, number, etc.)
                  const fieldLabel = formatFieldName(nestedKey);
                  autoFields.push({
                    id: `auto-field-${baseTimestamp}-${fieldIndex}`,
                    type: 'text',
                    label: fieldLabel,
                    required: false,
                    confidence: 0.85,
                    value: '',
                    suggested: true,
                    section: sectionId
                  });
                  fieldIndex++;
                }
              }
            });
          } else {
            // Check if it's a typed field at top level
            if (typeof value === 'object' && value !== null && '_type' in value) {
              const fieldLabel = formatFieldName(key);
              autoFields.push({
                id: `auto-field-${baseTimestamp}-${fieldIndex}`,
                type: value._type || 'text',
                label: fieldLabel,
                required: false,
                confidence: 0.85,
                value: '',
                suggested: true,
                section: sectionId,
                options: Array.isArray(value.options) ? value.options : []
              });
              fieldIndex++;
            } else {
              // Primitive values (string, number, boolean, etc.) - though unlikely in hierarchical_data
              autoFields.push({
                id: `auto-field-${baseTimestamp}-${fieldIndex}`,
                type: 'text',
                label: sectionName,
                required: false,
                confidence: 0.85,
                value: '',
                suggested: true,
                section: sectionId
              });
              fieldIndex++;
            }
          }
        });
        
        // Convert sectionMap to array and sort by order (preserves LLM order from _keyOrder)
        detectedSections = Array.from(sectionMap.values()).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        
        // Preserve hierarchical data for saving
        if (onHierarchicalDataExtracted) {
          onHierarchicalDataExtracted(hierarchicalData);
        }
      } else {
        // Fallback to fields array if hierarchical_data is not available
        const detectedFields = result?.result?.fields || [];
        if (Array.isArray(detectedFields) && detectedFields.length > 0) {
          autoFields = detectedFields.map((field: any, index: number) => {
            const fieldLabel = field.label || field.name || `Field ${index + 1}`;
            // If field doesn't have a section, use field label as section name
            const fieldSection = field.section || fieldLabel.toLowerCase().replace(/\s+/g, '_');
            
            return {
              id: field.id || `auto-field-${Date.now()}-${index}`,
              type: field.type || 'text',
              label: fieldLabel,
              required: field.required ?? false,
              confidence: field.confidence || 0.85,
              value: '',
              suggested: true,
              section: fieldSection,
              columns: field.columns || [],
              isGroupedTable: field.isGroupedTable,
              groupedHeaders: field.groupedHeaders
            };
          });
          
          // Extract unique sections from fields
          const sectionMap = new Map<string, {id: string, name: string, order: number}>();
          autoFields.forEach(field => {
            const sectionId = field.section;
            if (!sectionMap.has(sectionId)) {
              sectionMap.set(sectionId, {
                id: sectionId,
                name: formatFieldName(sectionId),
                order: sectionMap.size
              });
            }
          });
          detectedSections = Array.from(sectionMap.values());
        }
      }

      // Update fields and sections via callback
      if (autoFields.length > 0) {
        onFieldsExtracted(autoFields, detectedSections);
        toast({
          title: "Field Detection Complete",
          description: `Detected ${autoFields.length} field(s) and ${detectedSections.length} section(s)`,
        });
      } else {
        toast({
          title: "No Fields Detected",
          description: "Could not detect any fields in the document. Please try again or add fields manually.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Field detection error:', error);
      toast({
        title: "Field Detection Failed",
        description: error instanceof Error ? error.message : "An error occurred during field detection",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  }, [toast]);

  return {
    isExtracting,
    extractionText,
    showExtraction,
    setIsExtracting,
    setExtractionText,
    setShowExtraction,
    extractFields
  };
};

