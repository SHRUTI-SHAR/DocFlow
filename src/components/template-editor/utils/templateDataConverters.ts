/**
 * Data conversion utilities for template structures
 */

import { formatFieldName } from './templateHelpers';
import type { TemplateField } from '@/types/template';

/**
 * Convert fields array to hierarchical structure
 */
export const convertFieldsToHierarchical = (fieldsArray: any[]): any => {
  if (!fieldsArray || !Array.isArray(fieldsArray)) {
    console.warn('⚠️ convertFieldsToHierarchical: fieldsArray is not a valid array:', fieldsArray);
    return {};
  }
  
  const hierarchical: any = {};
  
  fieldsArray.forEach(field => {
    if (!field) return; // Skip null/undefined fields
    
    const section = field.section || 'general';
    const fieldName = field.label || field.name || 'unnamed_field';
    
    if (!hierarchical[section]) {
      hierarchical[section] = {};
    }
    
    if (field.type === 'table' && field.columns) {
      // For tables, create array structure
      hierarchical[section][fieldName] = [{}];
      const columnOrder: string[] = [];
      field.columns.forEach((col: string) => {
        const colKey = col.toLowerCase().replace(/\s+/g, '_');
        hierarchical[section][fieldName][0][colKey] = null;
        columnOrder.push(colKey);
      });
      // Store column order metadata to preserve LLM order
      // For nested tables in sections, use section_fieldName format to match reading logic
      if (columnOrder.length > 0) {
        hierarchical[`_${section}_${fieldName}_columnOrder`] = columnOrder;
      }
    } else {
      // For regular fields, store as simple value
      hierarchical[section][fieldName] = field.value || null;
    }
  });
  
  return hierarchical;
};

/**
 * Convert hierarchical structure to fields array
 */
export const convertHierarchicalToFields = (hierarchicalData: any): TemplateField[] => {
  if (!hierarchicalData || typeof hierarchicalData !== 'object') {
    console.warn('⚠️ convertHierarchicalToFields: hierarchicalData is not a valid object:', hierarchicalData);
    return [];
  }
  
  const fieldsArray: TemplateField[] = [];
  let fieldId = 1;
  
  Object.entries(hierarchicalData).forEach(([sectionKey, sectionData]: [string, any]) => {
    // Skip internal metadata keys
    if (sectionKey.startsWith('_')) return;
    
    if (typeof sectionData === 'object' && sectionData !== null) {
      // Check if it's a typed field (new LLM format with _type)
      if ('_type' in sectionData && sectionData._type !== 'table') {
        // Handle typed fields - skip "type" and "value" sub-fields, use the main field
        const field: TemplateField = {
          id: `field-${fieldId++}`,
          type: sectionData._type || 'text',
          label: formatFieldName(sectionKey), // Strip page suffix from display
          value: '',
          section: sectionKey, // Field key becomes the section name
          required: false,
          suggested: true,
          confidence: 0.85,
          options: Array.isArray(sectionData.options) ? sectionData.options : []
        };
        fieldsArray.push(field);
      } else if (Array.isArray(sectionData)) {
        // Table structure
        const tableField: TemplateField = {
          id: `field-${fieldId++}`,
          type: 'table',
          label: formatFieldName(sectionKey), // Strip page suffix from display
          value: '',
          section: sectionKey,
          columns: sectionData.length > 0 ? Object.keys(sectionData[0]) : [],
          required: false,
          suggested: true,
          confidence: 0.85
        };
        fieldsArray.push(tableField);
      } else {
        // Nested object structure - check if it contains "type" and "value" fields (old format)
        const hasTypeValueStructure = 'type' in sectionData && 'value' in sectionData;
        
        if (hasTypeValueStructure) {
          // Old format with separate "type" and "value" fields - skip these, they're just metadata
          // This field should have been handled at parent level
          return;
        }
        
        // Regular nested object structure
        // Respect explicit field order metadata if available: _{section}_fieldOrder
        const orderKey = `_${sectionKey}_fieldOrder`;
        const explicitOrder = Array.isArray(hierarchicalData[orderKey]) ? hierarchicalData[orderKey] as string[] : null;
        const handledKeys = new Set<string>();

        const processField = (fieldKey: string, fieldValue: any) => {
          // Skip internal metadata and "type"/"value" metadata fields
          if (fieldKey.startsWith('_') || fieldKey === 'type' || fieldKey === 'value') return;
          
          // Check if nested value is a typed field
          if (typeof fieldValue === 'object' && fieldValue !== null && '_type' in fieldValue) {
            const field: TemplateField = {
              id: `field-${fieldId++}`,
              type: fieldValue._type || 'text',
              label: formatFieldName(fieldKey), // Strip page suffix from display
              value: '',
              section: sectionKey,
              required: false,
              suggested: true,
              confidence: 0.85,
              options: Array.isArray(fieldValue.options) ? fieldValue.options : []
            };
            fieldsArray.push(field);
          } else {
            const field: TemplateField = {
              id: `field-${fieldId++}`,
              type: 'text',
              label: formatFieldName(fieldKey), // Strip page suffix from display
              value: fieldValue || '',
              section: sectionKey,
              required: false,
              suggested: true,
              confidence: 0.85
            };
            fieldsArray.push(field);
          }
        };

        // First add fields in explicit order
        if (explicitOrder) {
          explicitOrder.forEach((k) => {
            if (k && k in sectionData) {
              handledKeys.add(k);
              processField(k, (sectionData as any)[k]);
            }
          });
        }

        // Then add any remaining fields not listed in the order
        Object.entries(sectionData).forEach(([fieldKey, fieldValue]: [string, any]) => {
          if (handledKeys.has(fieldKey)) return;
          processField(fieldKey, fieldValue);
        });
      }
    } else {
      // Simple field
      const field: TemplateField = {
        id: `field-${fieldId++}`,
        type: 'text',
        label: formatFieldName(sectionKey), // Strip page suffix from display
        value: sectionData || '',
        section: sectionKey, // Field key becomes the section name
        required: false,
        suggested: true,
        confidence: 0.85
      };
      fieldsArray.push(field);
    }
  });
  
  return fieldsArray;
};

/**
 * Convert sections and fields to hierarchical structure
 * This preserves the section organization when template is created manually
 */
export const convertSectionsToHierarchical = (
  sectionsArray: Array<{id: string, name: string, order: number}>,
  fieldsArray: TemplateField[]
): any => {
  const hierarchical: any = {};
  const keyOrder: string[] = [];
  
  // Sort sections by order to preserve sequence
  const sortedSections = [...sectionsArray].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Group fields by their section
  const fieldsBySection = new Map<string, TemplateField[]>();
  fieldsArray.forEach((field) => {
    if (!field) return;
    const sectionId = field.section || 'general';
    if (!fieldsBySection.has(sectionId)) {
      fieldsBySection.set(sectionId, []);
    }
    fieldsBySection.get(sectionId)!.push(field);
  });
  
  sortedSections.forEach((section) => {
    if (!section || !section.id) return;
    
    const sectionKey = section.id.toLowerCase().replace(/\s+/g, '_');
    const sectionFields = fieldsBySection.get(section.id) || [];
    
    // Only add section if it has fields
    if (sectionFields.length > 0) {
      keyOrder.push(sectionKey);
      hierarchical[sectionKey] = {};
      const fieldOrder: string[] = [];
      
      // Process fields in this section
      // Track field names to handle duplicates
      const seenFieldNames = new Map<string, number>();
      
      sectionFields.forEach((field: TemplateField) => {
        if (!field) return;
        
        let fieldName = (field.label || field.name || 'unnamed_field').toLowerCase().replace(/\s+/g, '_');
        
        // Handle duplicate field names by appending a number
        if (seenFieldNames.has(fieldName)) {
          const count = (seenFieldNames.get(fieldName) || 0) + 1;
          seenFieldNames.set(fieldName, count);
          fieldName = `${fieldName}_${count}`;
        } else {
          seenFieldNames.set(fieldName, 1);
        }
        
        fieldOrder.push(fieldName);
        
        if (field.type === 'table' && field.columns && Array.isArray(field.columns) && field.columns.length > 0) {
          // For tables, check if it's a grouped table with nested structure
          if (field.isGroupedTable && field.groupedHeaders && Array.isArray(field.groupedHeaders)) {
            // Create nested structure for grouped tables
            hierarchical[sectionKey][fieldName] = [{}];
            field.groupedHeaders.forEach((groupHeader: any) => {
              if (groupHeader.subHeaders && Array.isArray(groupHeader.subHeaders) && groupHeader.subHeaders.length > 0) {
                // Nested object structure (e.g., cess: { tax_percent: null, amount: null })
                const groupHeaderKey = groupHeader.name.toLowerCase().replace(/\s+/g, '_');
                if (!hierarchical[sectionKey][fieldName][0][groupHeaderKey]) {
                  hierarchical[sectionKey][fieldName][0][groupHeaderKey] = {};
                }
                groupHeader.subHeaders.forEach((subHeader: string) => {
                  const subHeaderKey = subHeader.toLowerCase().replace(/\s+/g, '_');
                  hierarchical[sectionKey][fieldName][0][groupHeaderKey][subHeaderKey] = null;
                });
              } else if (groupHeader.colspan === 1) {
                // Single column header (no sub-headers)
                const singleColKey = groupHeader.name.toLowerCase().replace(/\s+/g, '_');
                hierarchical[sectionKey][fieldName][0][singleColKey] = null;
              }
            });
            // Track column order for grouped tables
            const columnOrder: string[] = [];
            
            // Build column order from grouped headers first
            field.groupedHeaders.forEach((groupHeader: any) => {
              if (groupHeader.subHeaders && Array.isArray(groupHeader.subHeaders) && groupHeader.subHeaders.length > 0) {
                const groupHeaderKey = groupHeader.name.toLowerCase().replace(/\s+/g, '_');
                groupHeader.subHeaders.forEach((subHeader: string) => {
                  const subHeaderKey = subHeader.toLowerCase().replace(/\s+/g, '_');
                  columnOrder.push(`${groupHeaderKey}_${subHeaderKey}`);
                });
              } else if (groupHeader.colspan === 1) {
                const singleColKey = groupHeader.name.toLowerCase().replace(/\s+/g, '_');
                columnOrder.push(singleColKey);
              }
            });
            
            // Add regular columns that aren't part of grouped headers
            if (field.columns && Array.isArray(field.columns)) {
              field.columns.forEach((col: string) => {
                const colKey = col.toLowerCase().replace(/\s+/g, '_');
                // Only add if not already added as part of grouped headers
                const flatColName = colKey.includes('_') ? colKey : colKey;
                if (!hierarchical[sectionKey][fieldName][0][flatColName] && 
                    !Object.values(hierarchical[sectionKey][fieldName][0]).some((val: any) => 
                      typeof val === 'object' && val !== null && val !== null && Object.keys(val).some(k => k === colKey || k.endsWith(`_${colKey}`))
                    )) {
                  // Check if this column is already represented in nested structure
                  let alreadyExists = false;
                  Object.values(hierarchical[sectionKey][fieldName][0]).forEach((val: any) => {
                    if (typeof val === 'object' && val !== null) {
                      Object.keys(val).forEach(k => {
                        if (k === colKey || colKey.includes(k) || k.includes(colKey)) {
                          alreadyExists = true;
                        }
                      });
                    }
                  });
                  if (!alreadyExists) {
                    hierarchical[sectionKey][fieldName][0][flatColName] = null;
                    // Add to column order if not already there
                    if (!columnOrder.includes(flatColName)) {
                      columnOrder.push(flatColName);
                    }
                  }
                } else {
                  // Column already exists, but add to order if not already there
                  if (!columnOrder.includes(flatColName)) {
                    columnOrder.push(flatColName);
                  }
                }
              });
            }
            
            // Store column order metadata to preserve LLM order for grouped tables
            // For nested tables in sections, use sectionKey_fieldName format
            if (columnOrder.length > 0) {
              hierarchical[`_${sectionKey}_${fieldName}_columnOrder`] = columnOrder;
            }
          } else {
            // Regular table - create array structure with columns
            hierarchical[sectionKey][fieldName] = [{}];
            // Preserve column order from field.columns array (this preserves LLM order)
            const columnOrder: string[] = [];
            field.columns.forEach((col: string) => {
              const colKey = col.toLowerCase().replace(/\s+/g, '_');
              hierarchical[sectionKey][fieldName][0][colKey] = null;
              columnOrder.push(colKey);
            });
            // Store column order metadata to preserve LLM order
            // For nested tables in sections, use sectionKey_fieldName format
            if (columnOrder.length > 0) {
              hierarchical[`_${sectionKey}_${fieldName}_columnOrder`] = columnOrder;
            }
          }
        } else {
          // For regular fields, store as null (template structure)
          hierarchical[sectionKey][fieldName] = null;
        }
      });
      
      // Add field order metadata if we have fields
      if (fieldOrder.length > 0) {
        hierarchical[`_${sectionKey}_fieldOrder`] = fieldOrder;
      }
    }
  });
  
  // Add key order metadata
  if (keyOrder.length > 0) {
    hierarchical['_keyOrder'] = keyOrder;
  }
  
  return hierarchical;
};

