/**
 * Helper utilities for template editing
 */

/**
 * Deep compare two arrays
 */
export const arraysEqual = (a: any[], b: any[]): boolean => {
  if (a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Deep compare two objects
 */
export const objectsEqual = (a: any, b: any): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Format field names - removes page suffixes for display (but keeps original structure)
 */
export const formatFieldName = (fieldName: string): string => {
  // Remove page number suffixes (e.g., "_page_1", " Page 1", etc.) for display only
  const cleaned = fieldName
    .replace(/_page_\d+$/i, '') // Remove "_page_1" at the end
    .replace(/[_\s]page\s*\d+$/i, '') // Remove " page 1" or "_page1" at the end
    .replace(/\s+page\s+\d+$/i, ''); // Remove " Page 1" at the end
  
  return cleaned
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Remove page suffixes from keys in hierarchical data (for saving templates)
 */
export const removePageSuffixesFromKeys = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => removePageSuffixesFromKeys(item));
  }

  const cleaned: any = {};
  const keyOrder: string[] = [];
  
  // Preserve _keyOrder metadata if it exists
  if ('_keyOrder' in data && Array.isArray(data._keyOrder)) {
    keyOrder.push(...data._keyOrder.map((k: string) => 
      k.replace(/_page_\d+$/i, '')
       .replace(/[_\s]page\s*\d+$/i, '')
       .replace(/\s+page\s+\d+$/i, '')
    ));
    cleaned._keyOrder = keyOrder;
  }
  
  // Collect all metadata keys that should be preserved (columnOrder, fieldOrder)
  const metadataKeys: string[] = [];
  Object.keys(data).forEach(key => {
    if (key.startsWith('_') && (key.endsWith('_columnOrder') || key.endsWith('_fieldOrder'))) {
      metadataKeys.push(key);
    }
  });
  
  Object.entries(data).forEach(([key, value]) => {
    // Preserve metadata keys (_keyOrder, _${sectionKey}_columnOrder, _${sectionKey}_fieldOrder)
    if (key === '_keyOrder') {
      return; // Already handled above
    }
    
    // Preserve columnOrder and fieldOrder metadata keys
    if (key.startsWith('_') && (key.endsWith('_columnOrder') || key.endsWith('_fieldOrder'))) {
      // Remove page suffixes from anywhere in the metadata key name
      // e.g., "_tax_summary_page_1_items_columnOrder" -> "_tax_summary_items_columnOrder"
      // e.g., "_invoice_details_page_1_fieldOrder" -> "_invoice_details_fieldOrder"
      let cleanedMetadataKey = key
        // Remove _page_<digits> pattern anywhere in the key (but preserve the structure)
        .replace(/_page_\d+/gi, '')
        // Clean up any double underscores that might result
        .replace(/__+/g, '_');
      cleaned[cleanedMetadataKey] = value; // Preserve order arrays as-is
      return;
    }
    
    // Skip other internal metadata keys
    if (key.startsWith('_')) {
      return;
    }

    // Remove page suffixes from key (e.g., "issuing_authority_page_1" -> "issuing_authority")
    const cleanedKey = key
      .replace(/_page_\d+$/i, '')
      .replace(/[_\s]page\s*\d+$/i, '')
      .replace(/\s+page\s+\d+$/i, '');

    // Recursively clean nested objects and arrays
    cleaned[cleanedKey] = removePageSuffixesFromKeys(value);
  });

  return cleaned;
};

