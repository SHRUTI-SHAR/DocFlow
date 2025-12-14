/**
 * Data organization utilities for template preview
 * Handles conversion of hierarchical data structures into displayable sections
 */

import React from 'react';
import { formatFieldName } from './templateUtils';
import type { TemplateField } from '@/types/template';
import { FileText } from 'lucide-react';

export interface Section {
  title: string;
  icon: React.ReactNode;
  isTable?: boolean;
  isGroupedTable?: boolean;
  isSignature?: boolean;
  tableHeaders?: string[];
  tableData?: any[];
  groupedHeaders?: Array<{ name: string; colspan: number; subHeaders: string[] }>;
  fields?: Array<{ name: string; value: any; type?: string }>;
  subsections?: Array<{ title: string; fields: Array<{ name: string; value: any }> }>;
  signatures?: Array<{
    id: string;
    label: string;
    bbox: any;
    position: string;
    image_base64?: string;
    [key: string]: any;
  }>;
  signatureData?: Array<{
    id?: string;
    label?: string;
    bbox?: any;
    position?: string;
    image_base64?: string;
    [key: string]: any;
  }>;
}

/**
 * Organizes hierarchical data into sections for display
 */
export const organizeDataIntoSections = (data: any, fields?: TemplateField[]): Section[] => {
  try {
    // Preserve _keyOrder for ordering, but filter out other internal metadata
    const filteredData = { ...data };
    const keyOrder = Array.isArray(data._keyOrder) ? [...data._keyOrder] : null;
    
    const keysToRemove = Object.keys(filteredData).filter(k => {
      // Keep _keyOrder for ordering sections
      if (k === '_keyOrder') return false;
      // Keep column order metadata keys (e.g., _tax_summary_items_columnOrder, _sectionKey_columnOrder)
      if (k.endsWith('_columnOrder')) return false;
      // Remove other keys starting with underscore (internal metadata)
      if (k.startsWith('_')) return true;
      // Filter out image_size - it's only for internal backend processing (signature cropping)
      const normalizedKey = k.toLowerCase().replace(/[_\s]/g, '');
      return normalizedKey === 'imagesize';
    });
    keysToRemove.forEach(key => delete filteredData[key]);
    
    // Use filteredData for processing (renamed to avoid shadowing parameter)
    const processData = filteredData;
    
    // Prioritize template_structure from saved template
    if (processData && typeof processData === 'object') {
      // Convert hierarchical structure to sections format
      const sections: Section[] = [];
      
      Object.entries(processData).forEach(([sectionKey, sectionData]) => {
        // Skip all metadata keys (they're not sections)
        if (sectionKey.startsWith('_')) return;
        
        // Skip metadata fields (has_photo_id, has_signature, etc.) - they're internal flags only
        // Only show them if they're explicitly true AND there are faces/signatures to display
        if (sectionKey.toLowerCase().startsWith('has_')) {
          // Skip all has_* metadata fields - they shouldn't be rendered as sections
          // Faces and signatures are displayed through dedicated sections instead
          return;
        }
        
        // Check if this is a face/photo section
        const isFaceSection = sectionKey.toLowerCase().includes('face') || 
          (Array.isArray(sectionData) && sectionData.length > 0 && 
           typeof sectionData[0] === 'object' && 
           sectionData[0] && sectionData[0].label === 'face');
        
        if (isFaceSection) {
          // Special handling for face sections
          if (Array.isArray(sectionData) && sectionData.length > 0) {
            const faceData = sectionData.map((item, index) => ({
              id: `face-${index}`,
              label: (item && item.label) || 'Photo ID',
              bbox: (item && item.bbox) || null,
              confidence: (item && item.confidence) || null,
              // Preserve all face fields including image_base64
              ...(item && typeof item === 'object' ? item : {})
            }));
            sections.push({
              title: formatFieldName(sectionKey),
              icon: <FileText className="h-4 w-4" />,
              isFace: true,
              faces: faceData,
              faceData: faceData, // Frontend expects faceData
              fields: []
            });
          }
          return; // Skip normal processing for face sections
        }
        
        // Check if this is a signature section
        const isSignatureSection = sectionKey.toLowerCase().includes('signature') || 
          (Array.isArray(sectionData) && sectionData.length > 0 && 
           typeof sectionData[0] === 'object' && 
           sectionData[0] && sectionData[0].label && sectionData[0].bbox);
        
        if (isSignatureSection) {
          // Special handling for signature sections
          if (Array.isArray(sectionData) && sectionData.length > 0) {
            const signatureData = sectionData.map((item, index) => ({
              id: `signature-${index}`,
              label: (item && item.label) || 'Signature',
              bbox: (item && item.bbox) || null,
              position: (item && item.bbox) ? `Position: ${Array.isArray(item.bbox) ? item.bbox.join(', ') : item.bbox}` : 'Position not specified',
              // Preserve all signature fields including image_base64
              ...(item && typeof item === 'object' ? item : {})
            }));
            sections.push({
              title: formatFieldName(sectionKey),
              icon: <FileText className="h-4 w-4" />,
              isSignature: true,
              signatures: signatureData,
              signatureData: signatureData, // Frontend expects signatureData
              fields: []
            });
          } else if (typeof sectionData === 'object' && sectionData !== null) {
            // Signature object with multiple signature fields (e.g., { receiver_signature: null, authorized_signatory: null })
            const signatureEntries = Object.entries(sectionData);
            const signatures = signatureEntries
              .filter(([key]) => !key.startsWith('_')) // Skip metadata keys
              .map(([key, value], index) => {
                // If value is an object with label/bbox, use it; otherwise treat key as label
                const sigValue = value as any;
                return {
                  id: `signature-${index}`,
                  label: (sigValue && sigValue.label) || formatFieldName(key),
                  bbox: (sigValue && sigValue.bbox) || null,
                  position: (sigValue && sigValue.bbox) 
                    ? `Position: ${Array.isArray(sigValue.bbox) ? sigValue.bbox.join(', ') : sigValue.bbox}` 
                    : 'Position not specified',
                  // Preserve all signature fields including image_base64
                  ...(sigValue && typeof sigValue === 'object' ? sigValue : {})
                };
              });
            
            if (signatures.length > 0) {
              sections.push({
                title: formatFieldName(sectionKey),
                icon: <FileText className="h-4 w-4" />,
                isSignature: true,
                signatures: signatures,
                signatureData: signatures, // Frontend expects signatureData
                fields: []
              });
            }
          } else {
            // Single signature object (legacy format)
            const sigData = sectionData as any;
            const signatureData = [{
              id: 'signature-0',
              label: (sigData && sigData.label) || 'Signature',
              bbox: (sigData && sigData.bbox) || null,
              position: (sigData && sigData.bbox) ? `Position: ${Array.isArray(sigData.bbox) ? sigData.bbox.join(', ') : sigData.bbox}` : 'Position not specified',
              // Preserve all signature fields including image_base64
              ...(sigData && typeof sigData === 'object' ? sigData : {})
            }];
            sections.push({
              title: formatFieldName(sectionKey),
              icon: <FileText className="h-4 w-4" />,
              isSignature: true,
              signatures: signatureData,
              signatureData: signatureData, // Frontend expects signatureData
              fields: []
            });
          }
        } else if (Array.isArray(sectionData) && sectionData.length > 0 && typeof sectionData[0] === 'object') {
          // Pure structure-based detection: check if this should be rendered as a table
          const firstItem = sectionData[0];
          const columnCount = Object.keys(firstItem).length;
          const hasMultipleColumns = columnCount >= 2;
          
          // Check if all objects have the same keys (uniform structure = table)
          const firstKeys = Object.keys(firstItem).sort().join('|');
          const hasUniformStructure = sectionData.every(item => 
            typeof item === 'object' && item !== null &&
            Object.keys(item).sort().join('|') === firstKeys
          );
          
          // Pure structure-based decision: render as table if uniform structure AND 2+ columns
          if (hasUniformStructure && hasMultipleColumns) {
            // Check for nested objects in table rows (for grouped headers)
            const hasNestedObjects = Object.values(firstItem).some(val => 
              typeof val === 'object' && val !== null && !Array.isArray(val)
            );
            
            if (hasNestedObjects) {
              // Detect nested objects and create grouped headers
              // Check for column order metadata (preserves LLM/database order)
              const columnOrderKey = `_${sectionKey}_columnOrder`;
              const columnOrder = processData?.[columnOrderKey];
              
              // Build ordered columns list: use metadata order if available, otherwise use object keys order
              let orderedColumns: string[];
              if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                // Use metadata order, filter to only include columns that exist
                orderedColumns = columnOrder.filter((col: string) => col in firstItem);
                // Add any missing columns from firstItem at the end (preserve metadata order for existing columns)
                const orderedSet = new Set(orderedColumns);
                Object.keys(firstItem).forEach(col => {
                  if (!orderedSet.has(col)) {
                    orderedColumns.push(col);
                  }
                });
              } else {
                // No metadata - use object keys order (preserves insertion order)
                orderedColumns = Object.keys(firstItem);
              }
              
              const finalOrderedColumns = orderedColumns;
              
              // First, analyze the structure from the first item
              const flatHeaders: string[] = [];
              const groupedHeaders: Array<{ name: string; colspan: number; subHeaders: string[] }> = [];
              
              // Build structure from first item - use ordered columns to preserve order
              finalOrderedColumns.forEach((key) => {
                const value = firstItem[key];
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  // Nested object - create grouped header
                  // Preserve sub-key order from object (Object.keys preserves insertion order)
                  const subKeys = Object.keys(value);
                  if (subKeys.length > 0) {
                    groupedHeaders.push({
                      name: key,
                      colspan: subKeys.length,
                      subHeaders: subKeys
                    });
                    // Add flat headers for sub-keys in order
                    subKeys.forEach(subKey => {
                      flatHeaders.push(`${key}_${subKey}`);
                    });
                  }
                } else {
                  // Regular field
                  flatHeaders.push(key);
                  groupedHeaders.push({
                    name: key,
                    colspan: 1,
                    subHeaders: []
                  });
                }
              });
              
              // Now flatten all rows based on the structure - use ordered columns
              const flatTableData = sectionData.map((item: any) => {
                const flatRow: any = {};
                
                finalOrderedColumns.forEach((key) => {
                  const value = item[key];
                  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // Nested object - flatten it
                    const subKeys = Object.keys(value);
                    subKeys.forEach(subKey => {
                      flatRow[`${key}_${subKey}`] = (value as any)[subKey];
                    });
                  } else {
                    // Regular field
                    flatRow[key] = value;
                  }
                });
                
                return flatRow;
              });
              
              sections.push({
                title: formatFieldName(sectionKey),
                icon: <FileText className="h-4 w-4" />,
                isTable: true,
                isGroupedTable: true,
                tableHeaders: flatHeaders,
                tableData: flatTableData,
                groupedHeaders: groupedHeaders,
                fields: []
              });
            } else {
              // Regular table without nested objects
              // Check for column order metadata (preserves LLM/database order)
              const columnOrderKey = `_${sectionKey}_columnOrder`;
              const columnOrder = processData?.[columnOrderKey];
              
              // Build ordered headers list: use metadata order if available, otherwise use object keys order
              let tableHeaders: string[];
              if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                // Use metadata order, filter to only include columns that exist
                tableHeaders = columnOrder.filter((col: string) => col in firstItem);
                // Add any missing columns from firstItem at the end (preserve metadata order for existing columns)
                const orderedSet = new Set(tableHeaders);
                Object.keys(firstItem).forEach(col => {
                  if (!orderedSet.has(col)) {
                    tableHeaders.push(col);
                  }
                });
              } else {
                // No metadata - use object keys order (preserves insertion order)
                tableHeaders = Object.keys(firstItem);
              }
              
              const finalTableHeaders = tableHeaders;
              
              sections.push({
                title: formatFieldName(sectionKey),
                icon: <FileText className="h-4 w-4" />,
                isTable: true,
                tableHeaders: finalTableHeaders,
                tableData: sectionData.map((item, index) => {
                  // Reorder row data to match header order
                  const orderedRow: any = { _rowIndex: index + 1 };
                  finalTableHeaders.forEach(header => {
                    orderedRow[header] = item[header];
                  });
                  return orderedRow;
                }),
                fields: []
              });
            }
          } else {
            // Render as individual fields
            const nestedFields = sectionData.map((item, index) => {
              const fields = Object.entries(item).map(([fieldKey, fieldValue]) => ({
                name: `${formatFieldName(fieldKey)} ${index + 1}`,
                value: fieldValue || 'Not specified'
              }));
              return fields;
            }).flat();
            
            sections.push({
              title: formatFieldName(sectionKey),
              icon: <FileText className="h-4 w-4" />,
              isTable: false,
              fields: nestedFields
            });
          }
        } else if (typeof sectionData === 'object' && sectionData !== null) {
          // NEW: Check if this is a nested object table structure
          // Pattern: object where all values are objects with the same keys (each key = row, each value = row data)
          const nestedObjectEntries = Object.entries(sectionData);
          if (nestedObjectEntries.length > 0) {
            // First check if there's an array that should be a table (priority check)
            const hasTableArrayInSection = nestedObjectEntries.some(([_, value]) => {
              if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                const firstItem = value[0];
                const columnCount = Object.keys(firstItem).length;
                return columnCount >= 2;
              }
              return false;
            });
            
            // If we found a table array, skip the nested object table check and go to array processing
            if (!hasTableArrayInSection) {
              const allValuesAreObjects = nestedObjectEntries.every(([_, value]) => 
                typeof value === 'object' && value !== null && !Array.isArray(value)
              );
              
              if (allValuesAreObjects && nestedObjectEntries.length >= 2) {
                // Check if all nested objects have the same keys (uniform structure)
                const firstNestedObject = nestedObjectEntries[0][1] as Record<string, any>;
                const firstNestedKeys = Object.keys(firstNestedObject).sort();
                const hasUniformNestedStructure = nestedObjectEntries.every(([_, value]) => {
                  const nestedObj = value as Record<string, any>;
                  return Object.keys(nestedObj).sort().join(',') === firstNestedKeys.join(',');
                });
                
                // If uniform structure and has 2+ columns, render as table
                if (hasUniformNestedStructure && firstNestedKeys.length >= 2) {
                  // Convert nested object to array of objects (table format)
                  const tableRows = nestedObjectEntries.map(([rowKey, rowData]) => {
                    const rowDataObj = rowData as Record<string, any>;
                    // Include row key as first column if it's meaningful (not just "row1", "row2")
                    const isMeaningfulRowKey = !/^(row|item|entry|record)[_\s]?\d+$/i.test(rowKey);
                    if (isMeaningfulRowKey) {
                      return {
                        _rowKey: rowKey,
                        ...rowDataObj
                      };
                    }
                    return rowDataObj;
                  });
                  
                  sections.push({
                    title: formatFieldName(sectionKey),
                    icon: <FileText className="h-4 w-4" />,
                    isTable: true,
                    tableHeaders: tableRows[0]?._rowKey 
                      ? ['_rowKey', ...firstNestedKeys]
                      : firstNestedKeys,
                    tableData: tableRows,
                    fields: []
                  });
                  return; // Skip to next section - we've created this one
                }
              }
            }
            
            // If we reach here, either hasTableArray is true OR allValuesAreObjects was false
            // Process as regular fields with subsections, checking for table arrays
            // Not a table - render as regular fields with subsections for nested objects
            // BUT first check if any field is an array that should be rendered as a table
            const regularFields: Array<{ name: string; value: any }> = [];
            const subsections: Array<{ title: string; fields: Array<{ name: string; value: any }> }> = [];
            let hasTableArray = false;
            let tableArrayKey: string | null = null;
            let tableArrayData: any[] | null = null;
                
            Object.entries(sectionData).forEach(([key, value]) => {
              // Skip metadata keys (they should be at top level, not in section data)
              if (key.startsWith('_')) return;
              
              // Skip metadata fields that shouldn't be displayed as regular fields
              // Only show boolean metadata if it's true (like has_photo_id: true)
              const isMetadataField = key.toLowerCase().startsWith('has_');
              if (isMetadataField) {
                // Only skip if the value is false or null/undefined
                // If it's true, we'll still filter it out as it's metadata
                if (value === false || value === null || value === undefined) {
                  return; // Skip false/null metadata
                }
                // Even if true, skip has_ metadata fields as they're internal flags
                return;
              }
              
              // Check if this is an array that should be rendered as a table
              if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                const firstItem = value[0];
                const columnCount = Object.keys(firstItem).length;
                const hasMultipleColumns = columnCount >= 2;
                
                // Check if all objects have the same keys (uniform structure = table)
                // For single-item arrays, this will always be true, which is fine
                const firstKeys = Object.keys(firstItem).sort().join('|');
                const hasUniformStructure = value.length === 1 || value.every((item: any) => 
                  typeof item === 'object' && item !== null &&
                  Object.keys(item).sort().join('|') === firstKeys
                );
                
                if (hasUniformStructure && hasMultipleColumns) {
                  // This array should be rendered as a table
                  hasTableArray = true;
                  tableArrayKey = key;
                  tableArrayData = value;
                } else {
                  // Regular array field
                  regularFields.push({
                    name: formatFieldName(key),
                    value: `Array of ${value.length} objects`
                  });
                }
              } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Nested object - create subsection
                const subsectionFields: Array<{ name: string; value: any }> = [];
                Object.entries(value).forEach(([subKey, subValue]) => {
                  subsectionFields.push({
                    name: formatFieldName(subKey),
                    value: subValue
                  });
                });
                
                subsections.push({
                  title: formatFieldName(key),
                  fields: subsectionFields
                });
              } else {
                // Regular field
                regularFields.push({
                  name: formatFieldName(key),
                  value: typeof value === 'object' && value !== null 
                    ? JSON.stringify(value, null, 2)
                    : String(value || 'Not specified')
                });
              }
            });
            
            // If we found a table array, render it as a table section
            if (hasTableArray && tableArrayKey && tableArrayData) {
              const firstItem = tableArrayData[0];
              // Try to find column order metadata (handle both with and without page suffixes)
              // Metadata can be at top level (processData) OR inside sectionData
              const columnOrderKey = `_${sectionKey}_${tableArrayKey}_columnOrder`;
              
              // Helper function to search for column order in an object
              const findColumnOrder = (searchObj: any): any[] | null => {
                if (!searchObj || typeof searchObj !== 'object') return null;
                
                // First try exact match (without page suffix)
                let columnOrder = searchObj[columnOrderKey];
                if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                  return columnOrder;
                }
                
                // If not found, try to find key with page suffix pattern (e.g., _tax_summary_page_1_items_columnOrder)
                const escapedSectionKey = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const escapedTableArrayKey = String(tableArrayKey).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Pattern: _sectionKey_page_<digits>_tableArrayKey_columnOrder
                const pageSuffixPattern = new RegExp(`^_${escapedSectionKey}_page_\\d+_${escapedTableArrayKey}_columnOrder$`);
                const matchingKey = Object.keys(searchObj).find(k => pageSuffixPattern.test(k));
                if (matchingKey) {
                  columnOrder = searchObj[matchingKey];
                  if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                    return columnOrder;
                  }
                }
                
                // Also try to find any key that matches the pattern after removing page suffixes
                const normalizedTargetKey = columnOrderKey;
                const normalizedMatchingKey = Object.keys(searchObj).find(k => {
                  if (!k.endsWith('_columnOrder')) return false;
                  // Remove page suffixes from the key and compare
                  const normalizedKey = k.replace(/_page_\d+/gi, '').replace(/__+/g, '_');
                  return normalizedKey === normalizedTargetKey;
                });
                if (normalizedMatchingKey) {
                  columnOrder = searchObj[normalizedMatchingKey];
                  if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                    return columnOrder;
                  }
                }
                
                return null;
              };
              
              // Search in sectionData first (metadata might be nested inside section)
              let columnOrder = findColumnOrder(sectionData);
              
              // If not found in sectionData, search at top level
              if (!columnOrder || columnOrder.length === 0) {
                const topLevelOrder = findColumnOrder(processData);
                if (topLevelOrder) {
                  columnOrder = topLevelOrder;
                }
              }
              
              // Build ordered columns list: use metadata order if available, otherwise use object keys order
              let orderedColumns: string[];
              if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                // Use metadata order, filter to only include columns that exist
                orderedColumns = columnOrder.filter((col: string) => col in firstItem);
                // Add any missing columns from firstItem at the end (preserve metadata order for existing columns)
                const orderedSet = new Set(orderedColumns);
                Object.keys(firstItem).forEach(col => {
                  if (!orderedSet.has(col)) {
                    orderedColumns.push(col);
                  }
                });
              } else {
                // No metadata - use object keys order (preserves insertion order)
                orderedColumns = Object.keys(firstItem);
              }
              
              const finalOrderedColumns = orderedColumns;
              
              // Check for nested objects in table rows (for grouped headers)
              const hasNestedObjects = Object.values(firstItem).some(val => 
                typeof val === 'object' && val !== null && !Array.isArray(val)
              );
              
              let tableHeaders: string[];
              let groupedHeaders: Array<{ name: string; colspan: number; subHeaders: string[] }> | undefined;
              let flatTableData: any[];
              
              if (hasNestedObjects) {
                // Create grouped headers structure
                const flatHeaders: string[] = [];
                groupedHeaders = [];
                
                // Build structure from first item - use ordered columns to preserve order
                finalOrderedColumns.forEach((key) => {
                  const value = firstItem[key];
                  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // Nested object - create grouped header
                    const subKeys = Object.keys(value);
                    if (subKeys.length > 0) {
                      groupedHeaders.push({
                        name: key,
                        colspan: subKeys.length,
                        subHeaders: subKeys
                      });
                      // Add flat headers for sub-keys in order
                      subKeys.forEach(subKey => {
                        flatHeaders.push(`${key}_${subKey}`);
                      });
                    }
                  } else {
                    // Regular field
                    flatHeaders.push(key);
                    groupedHeaders.push({
                      name: key,
                      colspan: 1,
                      subHeaders: []
                    });
                  }
                });
                
                tableHeaders = flatHeaders;
                
                // Flatten all rows based on the structure
                flatTableData = tableArrayData.map((item: any, index: number) => {
                  const flatRow: any = { _rowIndex: index + 1 };
                  
                  finalOrderedColumns.forEach((key) => {
                    const value = item[key];
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                      // Nested object - flatten it
                      const subKeys = Object.keys(value);
                      subKeys.forEach(subKey => {
                        flatRow[`${key}_${subKey}`] = (value as any)[subKey];
                      });
                    } else {
                      // Regular field
                      flatRow[key] = value;
                    }
                  });
                  
                  return flatRow;
                });
              } else {
                // Regular table without nested objects
                tableHeaders = finalOrderedColumns;
                flatTableData = tableArrayData.map((item, index) => {
                  const orderedRow: any = { _rowIndex: index + 1 };
                  finalOrderedColumns.forEach(header => {
                    orderedRow[header] = item[header];
                  });
                  return orderedRow;
                });
              }
              
              sections.push({
                title: formatFieldName(sectionKey),
                icon: <FileText className="h-4 w-4" />,
                isTable: true,
                isGroupedTable: hasNestedObjects,
                tableHeaders: tableHeaders,
                tableData: flatTableData,
                groupedHeaders: groupedHeaders,
                fields: regularFields.length > 0 ? regularFields : [],
                subsections: subsections.length > 0 ? subsections : undefined
              });
            } else {
              // No table array - render as regular section
              sections.push({
                title: formatFieldName(sectionKey),
                icon: <FileText className="h-4 w-4" />,
                isTable: false,
                fields: regularFields,
                subsections: subsections.length > 0 ? subsections : undefined
              });
            }
          }
        } else {
          // Simple field
          sections.push({
            title: formatFieldName(sectionKey),
            icon: <FileText className="h-4 w-4" />,
            isTable: false,
            fields: [{ name: formatFieldName(sectionKey), value: sectionData || 'Not specified' }]
          });
        }
      });
      
      // Sort sections by _keyOrder if available, otherwise keep natural order
      if (keyOrder && keyOrder.length > 0) {
        // Create a map of section titles to sections (for matching)
        const titleToSection = new Map<string, Section>();
        sections.forEach(section => {
          // Normalize section title for matching (lowercase, remove spaces/underscores)
          const normalizedTitle = section.title.toLowerCase().replace(/[_\s]/g, '');
          titleToSection.set(normalizedTitle, section);
        });
        
        // Create ordered sections array based on _keyOrder
        const orderedSections: Section[] = [];
        const seenKeys = new Set<string>();
        
        // First, add sections in _keyOrder sequence
        keyOrder.forEach(key => {
          const normalizedKey = key.toLowerCase().replace(/[_\s]/g, '');
          const section = titleToSection.get(normalizedKey);
          if (section && !seenKeys.has(normalizedKey)) {
            orderedSections.push(section);
            seenKeys.add(normalizedKey);
          }
        });
        
        // Then add any remaining sections not in _keyOrder (in case _keyOrder is incomplete)
        sections.forEach(section => {
          const normalizedTitle = section.title.toLowerCase().replace(/[_\s]/g, '');
          if (!seenKeys.has(normalizedTitle)) {
            orderedSections.push(section);
            seenKeys.add(normalizedTitle);
          }
        });
        
        return orderedSections;
      }
      
      return sections;
    }
    
    // Fallback: convert flat fields array to hierarchical structure
    if (fields && Array.isArray(fields) && fields.length > 0) {
      
      // Group fields by section
      const groupedFields = fields.reduce((acc: Record<string, any[]>, field: any) => {
        const section = field.section || 'general';
        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(field);
        return acc;
      }, {});
      
      // Convert grouped fields to sections
      const sections: Section[] = [];
      Object.entries(groupedFields).forEach(([sectionKey, sectionFields]) => {
        // Skip metadata fields (has_photo_id, has_signature, etc.)
        if (sectionKey.toLowerCase().startsWith('has_')) {
          return; // Skip has_* metadata sections
        }
        
        // Check if this is a signature section
        const isSignatureSection = sectionKey.toLowerCase().includes('signature') || 
          sectionFields.some(field => field && (field.type === 'signature' || 
            (field.value && typeof field.value === 'object' && field.value.label && field.value.bbox)));
        
        if (isSignatureSection) {
          // Handle signature fields
          const signatures = sectionFields
            .filter(field => field && (field.type === 'signature' || 
              (field.value && typeof field.value === 'object' && field.value.label && field.value.bbox)))
            .map((field, index) => ({
              id: `signature-${index}`,
              label: (field && field.label) || (field && field.name) || 'Signature',
              bbox: field.value?.bbox || null,
              position: field.value?.bbox ? 
                `Position: ${Array.isArray(field.value.bbox) ? field.value.bbox.join(', ') : field.value.bbox}` : 
                'Position not specified'
            }));
          
          sections.push({
            title: formatFieldName(sectionKey),
            icon: <FileText className="h-4 w-4" />,
            isSignature: true,
            signatures: signatures,
            fields: []
          });
        } else {
          // Regular fields
          sections.push({
            title: formatFieldName(sectionKey),
            icon: <FileText className="h-4 w-4" />,
            isTable: false,
            fields: sectionFields.map(field => ({
              name: (field && field.label) || (field && field.name) || 'Unnamed Field',
              value: (field && field.value) || 'Not specified',
              type: (field && field.type) || 'text'
            }))
          });
        }
      });
      
      return sections;
    }
    
    // Final fallback: show empty state
    return [];
  } catch (error) {
    console.error('Error organizing data into sections:', error);
    return [];
  }
};

/**
 * Counts fields from hierarchical data using the same logic as organizeDataIntoSections
 * This ensures consistent field counting across template preview and extraction UI
 */
export const countFieldsFromHierarchicalData = (data: any): number => {
  if (!data || typeof data !== 'object') return 0;
  
  // Filter out metadata keys (same as organizeDataIntoSections)
  const filteredData = { ...data };
  const keysToRemove = Object.keys(filteredData).filter(k => {
    if (k === '_keyOrder') return false;
    if (k.endsWith('_columnOrder')) return false;
    if (k.startsWith('_')) return true;
    const normalizedKey = k.toLowerCase().replace(/[_\s]/g, '');
    return normalizedKey === 'imagesize';
  });
  keysToRemove.forEach(key => delete filteredData[key]);
  
  let count = 0;
  
  const countFields = (obj: any): void => {
    if (Array.isArray(obj)) {
      // For arrays, check if they should be tables
      if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
        const firstItem = obj[0];
        const columnCount = Object.keys(firstItem).length;
        const hasMultipleColumns = columnCount >= 2;
        
        // Check uniform structure
        const firstKeys = Object.keys(firstItem).sort().join('|');
        const hasUniformStructure = obj.every(item => 
          typeof item === 'object' && item !== null &&
          Object.keys(item).sort().join('|') === firstKeys
        );
        
        if (hasUniformStructure && hasMultipleColumns) {
          // This is a table - count as a single field
          count += 1;
        } else {
          // Not a table - count fields in each item
          obj.forEach(item => {
            if (typeof item === 'object' && item !== null) {
              countFields(item);
            } else {
              count += 1;
            }
          });
        }
      } else {
        // Simple array (primitives like strings) - count as a single field
        // Arrays of primitives are displayed as a single list in the UI
        count += 1;
      }
    } else if (typeof obj === 'object' && obj !== null) {
      // Check if this is a signature section
      const objValues = Object.values(obj);
      const isSignatureSection = Object.keys(obj).some(key => 
        key.toLowerCase().includes('signature')
      ) || objValues.some(val => {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          const sigVal = val as { label?: any; bbox?: any };
          return sigVal.label && sigVal.bbox;
        }
        return false;
      });
      
      if (isSignatureSection) {
        // Count signatures, but also recursively process nested objects that aren't signatures
        Object.entries(obj).forEach(([key, value]) => {
          if (key.startsWith('_')) return; // Skip metadata
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Check if this is a signature object (has label and bbox)
            const sigVal = value as { label?: any; bbox?: any };
            if (sigVal.label && sigVal.bbox) {
              count += 1; // One signature per entry
            } else {
              // Not a signature object - recursively count nested fields
              countFields(value);
            }
          } else if (Array.isArray(value)) {
            // Check if this is an array of signature objects
            if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && value[0].label && value[0].bbox) {
              // Array of signature objects - count each signature
              value.forEach((sigItem: any) => {
                if (typeof sigItem === 'object' && sigItem !== null && sigItem.label) {
                  count += 1;
                }
              });
            } else {
              // Not a signature array - process recursively as regular array
              countFields(value);
            }
          } else if (value === null || value === undefined) {
            count += 1; // Null signature still counts as a field
          } else {
            // Primitive value - count as field
            count += 1;
          }
        });
        return;
      }
      
      // Check if this object contains an array that should be a table
      const entries = Object.entries(obj);
      let hasTableArray = false;
      let tableArrayData: any[] | null = null;
      
      for (const [key, value] of entries) {
        if (key.startsWith('_')) continue; // Skip metadata
        
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          const firstItem = value[0];
          const columnCount = Object.keys(firstItem).length;
          const hasMultipleColumns = columnCount >= 2;
          
          const firstKeys = Object.keys(firstItem).sort().join('|');
          const hasUniformStructure = value.length === 1 || value.every((item: any) => 
            typeof item === 'object' && item !== null &&
            Object.keys(item).sort().join('|') === firstKeys
          );
          
          if (hasUniformStructure && hasMultipleColumns) {
            hasTableArray = true;
            tableArrayData = value;
            break;
          }
        }
      }
      
      if (hasTableArray && tableArrayData) {
        // Count the table as a single field
        count += 1;
        
        // Count remaining fields in the object (non-table fields)
        entries.forEach(([key, value]) => {
          if (key.startsWith('_')) return;
          if (Array.isArray(value) && value === tableArrayData) return; // Skip the table we already counted
          
          if (Array.isArray(value)) {
            // Other arrays - count recursively
            countFields(value);
          } else if (typeof value === 'object' && value !== null) {
            // Nested object - count recursively
            countFields(value);
          } else {
            // Regular field
            count += 1;
          }
        });
      } else {
        // Regular object - count all fields recursively
        entries.forEach(([key, value]) => {
          if (key.startsWith('_')) return; // Skip metadata
          
          if (Array.isArray(value)) {
            countFields(value);
          } else if (typeof value === 'object' && value !== null) {
            countFields(value);
          } else {
            // Leaf value - count as 1 field
            count += 1;
          }
        });
      }
    }
  };
  
  countFields(filteredData);
  return count;
};

