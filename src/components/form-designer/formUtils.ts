import type { TemplateField } from '@/types/template';

/**
 * Convert hierarchical_data from LLM to form fields and sections
 * Similar to TemplateEditor conversion logic
 */
export const convertHierarchicalDataToFields = (
  hierarchicalData: any
): { fields: TemplateField[]; sections: Array<{ id: string; name: string; order: number }> } => {
  const fields: TemplateField[] = [];
  const sectionMap = new Map<string, { id: string; name: string; order: number }>();
  let fieldIndex = 0;
  const baseTimestamp = Date.now();

  if (!hierarchicalData || typeof hierarchicalData !== 'object' || Array.isArray(hierarchicalData)) {
    return { fields: [], sections: [] };
  }

  Object.entries(hierarchicalData).forEach(([key, value]) => {
    const sectionName = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const sectionId = key.toLowerCase();

    // Create section if it doesn't exist
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, {
        id: sectionId,
        name: sectionName,
        order: sectionMap.size,
      });
    }

    // Helper to extract field type and value from new LLM format
    const extractFieldInfo = (fieldValue: any): { type: TemplateField['type'], value: any, options?: string[] } => {
      // Check if field has new LLM format with _type metadata
      if (fieldValue && typeof fieldValue === 'object' && '_type' in fieldValue) {
        const type = fieldValue._type as TemplateField['type'];
        const value = fieldValue.value ?? null;
        const options = Array.isArray(fieldValue.options) ? fieldValue.options : [];
        return { type, value, options };
      }
      // Legacy format: default to text
      return { type: 'text', value: fieldValue };
    };

    // Skip internal metadata keys
    if (key.startsWith('_')) return;

    // Process the value based on its type
    if (value === null || (typeof value === 'object' && '_type' in value)) {
      // Simple field with null value or new LLM format
      const { type, options = [] } = extractFieldInfo(value);
      fields.push({
        id: `field-${baseTimestamp}-${fieldIndex}`,
        type: type,
        label: sectionName,
        required: false,
        confidence: 0.85,
        value: '',
        suggested: true,
        section: sectionId,
        options: options,
      });
      fieldIndex++;
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // Table structure
      const tableColumns = Object.keys(value[0]);
      fields.push({
        id: `field-${baseTimestamp}-${fieldIndex}`,
        type: 'table',
        label: sectionName,
        required: false,
        confidence: 0.85,
        value: '',
        suggested: true,
        section: sectionId,
        columns: tableColumns,
      });
      fieldIndex++;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Check if it's a table with _type metadata
      if ('_type' in value && value._type === 'table') {
        const tableValue = value as { _type: 'table', _columns?: string[], value?: any[] };
        const columns = Array.isArray(tableValue._columns) ? tableValue._columns : 
                       (Array.isArray(tableValue.value) && tableValue.value.length > 0 ? Object.keys(tableValue.value[0] || {}) : ['Column 1', 'Column 2']);
        fields.push({
          id: `field-${baseTimestamp}-${fieldIndex}`,
          type: 'table',
          label: sectionName,
          required: false,
          confidence: 0.85,
          value: '',
          suggested: true,
          section: sectionId,
          columns: columns,
        });
        fieldIndex++;
        return;
      }
      
      // Nested object - process each property
      const objectEntries = Object.entries(value);

      if (objectEntries.length === 0) {
        // Empty object - skip this section
        return; // Skip to next iteration
      }

      objectEntries.forEach(([nestedKey, nestedValue]) => {
        // Skip internal metadata keys
        if (nestedKey.startsWith('_')) return;
        
        // Extract field info using helper
        const { type, options = [] } = extractFieldInfo(nestedValue);
        
        if (type === 'table') {
          // Table type from LLM
          const tableNestedValue = nestedValue as { _type: 'table', _columns?: string[], value?: any[] };
          const columns = Array.isArray(tableNestedValue._columns) ? tableNestedValue._columns : 
                         (Array.isArray(tableNestedValue.value) && tableNestedValue.value.length > 0 ? Object.keys(tableNestedValue.value[0] || {}) : ['Column 1', 'Column 2']);
          const fieldLabel = nestedKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          fields.push({
            id: `field-${baseTimestamp}-${fieldIndex}`,
            type: 'table',
            label: fieldLabel,
            required: false,
            confidence: 0.85,
            value: '',
            suggested: true,
            section: sectionId,
            columns: columns,
          });
          fieldIndex++;
        } else if (Array.isArray(nestedValue) && nestedValue.length > 0 && typeof nestedValue[0] === 'object') {
          // Legacy nested table (array of objects)
          const tableColumns = Object.keys(nestedValue[0]);
          const fieldLabel = nestedKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          fields.push({
            id: `field-${baseTimestamp}-${fieldIndex}`,
            type: 'table',
            label: fieldLabel,
            required: false,
            confidence: 0.85,
            value: '',
            suggested: true,
            section: sectionId,
            columns: tableColumns,
          });
          fieldIndex++;
        } else {
          // Regular field with type from LLM or legacy format
          const fieldLabel = nestedKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          fields.push({
            id: `field-${baseTimestamp}-${fieldIndex}`,
            type: type,
            label: fieldLabel,
            required: false,
            confidence: 0.85,
            value: (typeof nestedValue === 'object' && nestedValue !== null && 'value' in nestedValue) ? (nestedValue.value || '') : (nestedValue || ''),
            suggested: true,
            section: sectionId,
            options: options,
          });
          fieldIndex++;
        }
      });
    } else {
      // Primitive values (string, number, boolean, etc.)
      fields.push({
        id: `field-${baseTimestamp}-${fieldIndex}`,
        type: 'text',
        label: sectionName,
        required: false,
        confidence: 0.85,
        value: String(value || ''),
        suggested: true,
        section: sectionId,
      });
      fieldIndex++;
    }
  });

  const sections = Array.from(sectionMap.values());
  return { fields, sections };
};

