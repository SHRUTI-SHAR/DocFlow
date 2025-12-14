import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormToolbar } from './FormToolbar.tsx';
import { SectionManager } from './SectionManager.tsx';
import { FieldEditor } from './FieldEditor.tsx';
import type { TemplateField } from '@/types/template';

interface HierarchicalSection {
  id: string;
  name: string;
  order: number;
  fields: TemplateField[];
  subsections?: HierarchicalSection[];
}

interface HierarchicalFormDesignerProps {
  initialData?: any; // Hierarchical data from template or document
  initialFields?: TemplateField[]; // Persisted fields with correct types
  initialSections?: Array<{id: string, name: string, order: number}>; // Persisted sections with correct names and order
  onDataChange?: (data: any) => void;
  onSave?: (formData: any) => void;
  formTitle?: string;
  formDescription?: string;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  hideFormSettings?: boolean;
  formId?: string; // For state persistence
}

export const HierarchicalFormDesigner: React.FC<HierarchicalFormDesignerProps> = ({
  initialData,
  initialFields,
  initialSections,
  onDataChange,
  onSave,
  formTitle = 'New Form',
  formDescription = '',
  onTitleChange,
  onDescriptionChange,
  hideFormSettings = false,
  formId
}) => {
  const [sections, setSections] = useState<HierarchicalSection[]>([]);
  const [editingField, setEditingField] = useState<TemplateField | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const initializedRef = useRef(false);
  const prevInitialDataRef = useRef<any>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  // Auto-scroll during drag and drop
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (!isDraggingRef.current) return;
      
      const scrollThreshold = 100; // Distance from edge to start scrolling
      const scrollSpeed = 10; // Pixels per frame
      const viewportHeight = window.innerHeight;
      const scrollContainer = document.querySelector('.h-dvh') || window;
      
      const mouseY = e.clientY;
      
      // Clear any existing interval
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      
      // Check if near top edge
      if (mouseY < scrollThreshold) {
        const scrollFn = () => {
          const currentScrollY = scrollContainer === window ? window.scrollY : (scrollContainer as HTMLElement).scrollTop;
          const newScrollY = Math.max(0, currentScrollY - scrollSpeed);
          if (scrollContainer === window) {
            window.scrollTo({ top: newScrollY, behavior: 'auto' });
          } else {
            (scrollContainer as HTMLElement).scrollTop = newScrollY;
          }
          if (e.clientY < scrollThreshold && newScrollY > 0) {
            scrollIntervalRef.current = requestAnimationFrame(scrollFn);
          }
        };
        scrollIntervalRef.current = requestAnimationFrame(scrollFn);
      }
      // Check if near bottom edge
      else if (mouseY > viewportHeight - scrollThreshold) {
        const scrollFn = () => {
          const scrollContainerElement = scrollContainer === window ? document.documentElement : (scrollContainer as HTMLElement);
          const scrollHeight = scrollContainerElement.scrollHeight;
          const scrollTop = scrollContainer === window ? window.scrollY : (scrollContainer as HTMLElement).scrollTop;
          const clientHeight = scrollContainer === window ? window.innerHeight : (scrollContainer as HTMLElement).clientHeight;
          const maxScroll = scrollHeight - clientHeight;
          const newScrollY = Math.min(maxScroll, scrollTop + scrollSpeed);
          
          if (scrollContainer === window) {
            window.scrollTo({ top: newScrollY, behavior: 'auto' });
          } else {
            (scrollContainer as HTMLElement).scrollTop = newScrollY;
          }
          if (e.clientY > viewportHeight - scrollThreshold && newScrollY < maxScroll) {
            scrollIntervalRef.current = requestAnimationFrame(scrollFn);
          }
        };
        scrollIntervalRef.current = requestAnimationFrame(scrollFn);
      }
    };
    
    const handleDragStart = () => {
      isDraggingRef.current = true;
    };
    
    const handleDragEnd = () => {
      isDraggingRef.current = false;
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
    
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragend', handleDragEnd);
    
    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragend', handleDragEnd);
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
      }
    };
  }, []);

  // Save expanded sections state (only if sections exist and state is meaningful)
  useEffect(() => {
    if (!formId || sections.length === 0) return;
    
    // Only save if we have sections and at least some are expanded or collapsed
    // Don't save empty state on initial load
    if (expandedSections.size > 0 || expandedSections.size < sections.length) {
      const storageKey = `editForm_${formId}_expandedSections`;
      const expandedArray = Array.from(expandedSections);
      localStorage.setItem(storageKey, JSON.stringify(expandedArray));
    }
  }, [expandedSections, formId, sections.length]);

  // Initialize sections from initial data - prioritize initialFields for manually created forms
  // Allow re-initialization if we have data but sections are empty (template loaded after mount)
  useEffect(() => {
    const hasInitialFields = initialFields && initialFields.length > 0;
    const hasInitialData = initialData && typeof initialData === 'object' && Object.keys(initialData).length > 0;
    
    // Check if initialData has changed (for template switching)
    const initialDataChanged = prevInitialDataRef.current !== initialData;
    if (initialDataChanged) {
      prevInitialDataRef.current = initialData;
      initializedRef.current = false; // Reset initialization flag when data changes
    }
    
    // Reset initialization flag if we have new data but no sections
    if ((hasInitialFields || hasInitialData) && sections.length === 0) {
      initializedRef.current = false;
    }
    
    const needsInitialization = !initializedRef.current;
    
    if (needsInitialization) {
      // If initialFields is provided, use it directly to preserve field types and options
      if (hasInitialFields) {
        const sectionsMap = new Map<string, HierarchicalSection>();
        
        // First, create sections from initialSections if available to get correct names and order
        // Format section names to remove page suffixes and filter out metadata sections
        if (initialSections && initialSections.length > 0) {
          initialSections.forEach((s) => {
            // Skip metadata sections (KeyOrder, _keyOrder, etc.)
            const normalizedId = s.id.toLowerCase();
            const normalizedName = s.name.toLowerCase();
            if (normalizedId.startsWith('_') || 
                normalizedName === 'keyorder' || 
                normalizedName.startsWith('_key') ||
                normalizedId === 'keyorder' ||
                normalizedId.startsWith('_key')) {
              return; // Skip metadata sections
            }
            
            sectionsMap.set(s.id, {
              id: s.id,
              name: formatFieldName(s.name), // Remove page suffixes from section names
              order: s.order,
              fields: []
            });
          });
        }
        
        // Then, add fields to their sections
        initialFields.forEach((field) => {
          const sectionId = field.section || 'general';
          if (!sectionsMap.has(sectionId)) {
            // If section doesn't exist in initialSections, create it
            let sectionName = 'General';
            if (initialData && typeof initialData === 'object') {
              const sectionKey = Object.keys(initialData).find(key => 
                key.toLowerCase().replace(/[^a-z0-9]+/g, '_') === sectionId.toLowerCase().replace(/[^a-z0-9]+/g, '_')
              );
              if (sectionKey) {
                sectionName = formatFieldName(sectionKey);
              }
            }
            
            sectionsMap.set(sectionId, {
              id: sectionId,
              name: sectionName,
              order: sectionsMap.size,
              fields: []
            });
          }
          
          const section = sectionsMap.get(sectionId)!;
          section.fields.push({
            ...field,
            required: field.required ?? false,
            options: (field as any).options || []
          });
        });
        
        const reconstructedSections = Array.from(sectionsMap.values());
        // Sort by order to preserve sequence
        reconstructedSections.sort((a, b) => a.order - b.order);
        
        setSections(reconstructedSections);
        
        // Restore expanded sections from localStorage if available
        if (formId) {
          const storageKey = `editForm_${formId}_expandedSections`;
          const savedExpanded = localStorage.getItem(storageKey);
          if (savedExpanded && savedExpanded !== '[]') {
            try {
              const expandedArray = JSON.parse(savedExpanded) as string[];
              if (expandedArray && expandedArray.length > 0) {
                setExpandedSections(new Set(expandedArray));
              } else {
                localStorage.removeItem(storageKey);
                setExpandedSections(new Set(reconstructedSections.map(s => s.id)));
              }
            } catch (e) {
              localStorage.removeItem(storageKey);
              setExpandedSections(new Set(reconstructedSections.map(s => s.id)));
            }
          } else {
            if (savedExpanded === '[]') {
              localStorage.removeItem(storageKey);
            }
            setExpandedSections(new Set(reconstructedSections.map(s => s.id)));
          }
        } else {
          setExpandedSections(new Set(reconstructedSections.map(s => s.id)));
        }
      } else if (hasInitialData) {
        // Fallback to hierarchical data conversion if no initialFields
        const convertedSections = convertHierarchicalDataToSections(initialData);
        if (convertedSections.length > 0) {
          setSections(convertedSections);
        } else {
          // If conversion produced no sections, start empty
          setSections([]);
          setExpandedSections(new Set());
        }
        
        // Restore expanded sections from localStorage if available
        if (formId) {
          const storageKey = `editForm_${formId}_expandedSections`;
          const savedExpanded = localStorage.getItem(storageKey);
          if (savedExpanded && savedExpanded !== '[]') {
            try {
              const expandedArray = JSON.parse(savedExpanded) as string[];
              if (expandedArray && expandedArray.length > 0) {
                setExpandedSections(new Set(expandedArray));
              } else {
                localStorage.removeItem(storageKey);
                setExpandedSections(new Set(convertedSections.map(s => s.id)));
              }
            } catch (e) {
              localStorage.removeItem(storageKey);
              setExpandedSections(new Set(convertedSections.map(s => s.id)));
            }
          } else {
            if (savedExpanded === '[]') {
              localStorage.removeItem(storageKey);
            }
            setExpandedSections(new Set(convertedSections.map(s => s.id)));
          }
        } else {
          setExpandedSections(new Set(convertedSections.map(s => s.id)));
        }
      } else {
        // Start with no sections; user will add the first section explicitly
        setSections([]);
        setExpandedSections(new Set());
      }
      initializedRef.current = true;
    }
  }, [initialData, initialFields, initialSections, formId, sections.length]);


  // Notify parent component when sections change
  useEffect(() => {
    if (onDataChange && sections.length > 0) {
      const formData = {
        title: formTitle,
        description: formDescription,
        sections: sections.map(section => ({
          id: section.id,
          name: section.name,
          order: section.order
        })),
        fields: sections.flatMap(section => section.fields),
        hierarchicalData: convertSectionsToHierarchicalData(sections)
      };
      onDataChange(formData);
    }
  }, [sections, formTitle, formDescription]); // Removed onDataChange from dependencies to prevent infinite loop

  // Format field/section names for display - removes page suffixes
  const formatFieldName = (fieldName: string): string => {
    // Remove page number suffixes (e.g., "_page_1", " Page 1", etc.)
    const cleaned = fieldName
      .replace(/_page_\d+$/i, '') // Remove "_page_1" at the end
      .replace(/[_\s]page\s*\d+$/i, '') // Remove " page 1" or "_page1" at the end
      .replace(/\s+page\s+\d+$/i, ''); // Remove " Page 1" at the end
    
    return cleaned
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Convert hierarchical data to sections format
  const convertHierarchicalDataToSections = (data: any): HierarchicalSection[] => {
    if (!data || typeof data !== 'object') return [];
    
    // Get key order from metadata to preserve section/field sequence
    const keyOrder = (data as any)?._keyOrder;

    // Build a map of normalized label -> type from existing fields to preserve types (e.g., file)
    const normalize = (label: string) =>
      (label || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') || 'field';
    const fieldTypeByLabel = new Map<string, TemplateField['type']>();
    const fieldRequiredByLabel = new Map<string, boolean>();
    try {
      (initialFields || []).forEach((f) => {
        const n = normalize(f.label || '');
        fieldTypeByLabel.set(n, f.type);
        fieldRequiredByLabel.set(n, !!f.required);
      });
    } catch {}

    const sections: HierarchicalSection[] = [];
    let order = 0;

    // Helper function to extract field type and value from LLM response
    const extractFieldTypeAndValue = (fieldValue: any): { type: TemplateField['type'], value: any, options?: string[], columns?: string[], bbox?: number[], label?: string } => {
      // Check if field has new LLM format with _type metadata
      if (fieldValue && typeof fieldValue === 'object' && '_type' in fieldValue) {
        const type = fieldValue._type as TemplateField['type'];
        const value = fieldValue.value ?? null;
        const options = Array.isArray(fieldValue.options) ? fieldValue.options : [];
        const columns = Array.isArray(fieldValue._columns) ? fieldValue._columns : [];
        const bbox = Array.isArray(fieldValue.bbox) ? fieldValue.bbox : [];
        const label = fieldValue.label || undefined;
        
        return { type, value, options, columns, bbox, label };
      }
      
      // Legacy format: handle primitives and arrays
      if (fieldValue === null || typeof fieldValue === 'undefined') {
        return { type: 'text', value: null };
      }
      if (typeof fieldValue === 'number') {
        return { type: 'number', value: fieldValue };
      }
      if (typeof fieldValue === 'boolean') {
        return { type: 'checkbox', value: fieldValue };
      }
      if (Array.isArray(fieldValue)) {
        // Check if it's a table (array of objects) or checkbox (array of primitives)
        if (fieldValue.length > 0 && typeof fieldValue[0] === 'object' && fieldValue[0] !== null) {
          return { type: 'table', value: fieldValue, columns: Object.keys(fieldValue[0] || {}) };
        }
        return { type: 'checkbox', value: fieldValue, options: [] };
      }
      
      // Default to text
      return { type: 'text', value: fieldValue };
    };

    // Handle signatures array separately if present
    if (data.signatures && Array.isArray(data.signatures)) {
      const signaturesSection: HierarchicalSection = {
        id: 'signatures',
        name: 'Signatures',
        order: order++,
        fields: []
      };
      
      data.signatures.forEach((sig: any, index: number) => {
        const { type, bbox = [] } = extractFieldTypeAndValue(sig);
        const label = sig.label || `Signature ${index + 1}`;
        
        signaturesSection.fields.push({
          id: `signature_${Date.now()}_${index}`,
          label: formatFieldName(label),
          type: 'signature',
          required: false,
          x: bbox[0] || 0,
          y: bbox[1] || 0,
          width: bbox.length === 4 ? (bbox[2] - bbox[0]) : 200,
          height: bbox.length === 4 ? (bbox[3] - bbox[1]) : 60,
          section: 'signatures',
          confidence: 1,
          options: [],
          validation: {},
          bbox: bbox.length === 4 ? bbox : undefined
        });
      });
      
      if (signaturesSection.fields.length > 0) {
        sections.push(signaturesSection);
      }
    }

    // Helper to get base key without page suffix
    const getBaseKey = (key: string): string => {
      return key.replace(/_page_\d+$/i, '').replace(/[_\s]page\s*\d+$/i, '').replace(/\s+page\s+\d+$/i, '');
    };
    
    // Helper to extract prefix from a key (e.g., "company_name" -> "company")
    const extractPrefix = (key: string): string | null => {
      const baseKey = getBaseKey(key);
      const underscoreIndex = baseKey.indexOf('_');
      if (underscoreIndex > 0 && underscoreIndex < baseKey.length - 1) {
        // Has a prefix segment (e.g., "company_name" -> "company")
        return baseKey.substring(0, underscoreIndex);
      }
      return null;
    };
    
    // Group fields by base key (without page suffix) to handle PDF multi-page data
    const fieldsByBaseKey = new Map<string, Array<{ originalKey: string, value: any }>>();
    const nestedSections = new Map<string, any>();
    
    Object.entries(data).forEach(([key, value]) => {
      // Skip internal metadata keys and signatures (already handled)
      if (key.startsWith('_') || key === 'signatures') return;
      
      // Handle null/primitive values or new LLM format with _type
      if (value === null || (typeof value !== 'object') || (typeof value === 'object' && '_type' in value && value._type !== 'table')) {
        const baseKey = getBaseKey(key);
        if (!fieldsByBaseKey.has(baseKey)) {
          fieldsByBaseKey.set(baseKey, []);
        }
        fieldsByBaseKey.get(baseKey)!.push({ originalKey: key, value });
      } else if (typeof value === 'object' && value !== null) {
        // Check if it's a nested section (object with multiple fields, not a typed field)
        if (!('_type' in value) || value._type === 'table') {
          const baseKey = getBaseKey(key);
          nestedSections.set(baseKey, { originalKey: key, value });
        }
      }
    });
    
    // Group fields by prefix for PDFs (e.g., all "company_*" fields together)
    const fieldsByPrefix = new Map<string, Array<{ originalKey: string, value: any, baseKey: string }>>();
    const standaloneFields: Array<{ originalKey: string, value: any, baseKey: string }> = [];
    
    fieldsByBaseKey.forEach((fieldEntries, baseKey) => {
      const prefix = extractPrefix(baseKey);
      
      if (prefix && baseKey.startsWith(prefix + '_')) {
        // Field belongs to a prefix group (e.g., "company_name" belongs to "company")
        if (!fieldsByPrefix.has(prefix)) {
          fieldsByPrefix.set(prefix, []);
        }
        fieldEntries.forEach(entry => {
          fieldsByPrefix.get(prefix)!.push({ ...entry, baseKey });
        });
      } else {
        // Standalone field (no prefix or doesn't match prefix pattern)
        fieldEntries.forEach(entry => {
          standaloneFields.push({ ...entry, baseKey });
        });
      }
    });
    
    // Process prefix groups (e.g., "Company" section with multiple fields)
    fieldsByPrefix.forEach((fieldEntries, prefix) => {
      // Only group if we have 2+ fields with this prefix
      if (fieldEntries.length >= 2) {
        const sectionName = formatFieldName(prefix);
        const sectionId = prefix.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'section';
        
        const section: HierarchicalSection = {
          id: sectionId,
          name: sectionName,
          order: order++,
          fields: fieldEntries.map(({ originalKey, value }, index) => {
            const { type: fieldType, value: fieldValue, options = [] } = extractFieldTypeAndValue(value);
            const normalizedLabel = normalize(originalKey);
            const persistedType = fieldTypeByLabel.get(normalizedLabel);
            const finalFieldType = persistedType || fieldType;
            const persistedRequired = fieldRequiredByLabel.get(normalizedLabel);
            
            return {
              id: `${originalKey}_field_${Date.now()}_${index}`,
              label: formatFieldName(originalKey),
              type: finalFieldType,
              required: persistedRequired ?? false,
              x: 0,
              y: 0,
              width: 200,
              height: 40,
              section: sectionId,
              confidence: 1,
              options: options.length > 0 ? options : [],
              validation: {}
            };
          })
        };
        
        sections.push(section);
      } else {
        // Only one field with this prefix - treat as standalone
        fieldEntries.forEach(entry => {
          standaloneFields.push(entry);
        });
      }
    });
    
    // Process standalone fields (no prefix or single field with prefix)
    standaloneFields.forEach(({ originalKey, value, baseKey }) => {
      const { type: fieldType, value: fieldValue, options = [] } = extractFieldTypeAndValue(value);
      
      // Override with persisted type if available
      const normalizedLabel = normalize(originalKey);
      const persistedType = fieldTypeByLabel.get(normalizedLabel);
      const finalFieldType = persistedType || fieldType;
      const persistedRequired = fieldRequiredByLabel.get(normalizedLabel);

      const section: HierarchicalSection = {
        id: originalKey,
        name: formatFieldName(originalKey),
        order: order++,
        fields: [{
          id: `${originalKey}_field_${Date.now()}`,
          label: formatFieldName(originalKey),
          type: finalFieldType,
          required: persistedRequired ?? false,
          x: 0,
          y: 0,
          width: 200,
          height: 40,
          section: originalKey,
          confidence: 1,
          options: options.length > 0 ? options : [],
          validation: {}
        }]
      };
      
      sections.push(section);
    });
    
    // Process nested sections - use _keyOrder to preserve order if available
    const nestedSectionEntries = Array.from(nestedSections.entries());
    
    // Sort nested sections by _keyOrder if available
    if (keyOrder && Array.isArray(keyOrder)) {
      nestedSectionEntries.sort((a, b) => {
        const aIndex = keyOrder.indexOf(a[0]);
        const bIndex = keyOrder.indexOf(b[0]);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }
    
    nestedSectionEntries.forEach(([baseKeyFromMap, { originalKey, value }]) => {
      const baseKey = getBaseKey(originalKey);
      
      // Handle table structure with _type metadata
      if (typeof value === 'object' && value !== null && '_type' in value && value._type === 'table') {
        const section: HierarchicalSection = {
          id: originalKey,
          name: formatFieldName(originalKey),
          order: order++,
          fields: [{
            id: `${originalKey}_field_${Date.now()}`,
            label: formatFieldName(originalKey),
            type: 'table',
            required: false,
            x: 0,
            y: 0,
            width: 400,
            height: 200,
            section: originalKey,
            confidence: 1,
            columns: value._columns || (Array.isArray(value.value) && value.value.length > 0 ? Object.keys(value.value[0] || {}) : ['Column 1', 'Column 2']),
            rows: Array.isArray(value.value) ? value.value : (value.value ? [value.value] : []),
            previewRows: Array.isArray(value.value) ? Math.max(value.value.length, 1) : 1,
            options: [],
            validation: {}
          }]
        };
        sections.push(section);
        return;
      }

      // Handle object values (nested objects or arrays) - these are sections with multiple fields
      if (typeof value === 'object' && value !== null) {
        const section: HierarchicalSection = {
          id: originalKey,
          name: formatFieldName(originalKey),
          order: order++,
          fields: []
        };

        // Convert nested objects to fields
        if (Array.isArray(value)) {
          // Legacy array format (table)
          const columns = value.length > 0 && typeof value[0] === 'object' 
            ? Array.from(new Set(value.flatMap((row: any) => Object.keys(row || {})))) 
            : ['Column 1', 'Column 2'];
          
          section.fields.push({
            id: `${originalKey}_field_${Date.now()}`,
            label: section.name,
            type: 'table',
            required: false,
            x: 0,
            y: 0,
            width: 400,
            height: 200,
            section: originalKey,
            confidence: 1,
            columns,
            rows: value as any[],
            previewRows: value.length || 1,
            options: [],
            validation: {}
          });
        } else {
          // Handle nested objects
          Object.entries(value).forEach(([fieldKey, fieldValue]) => {
            // Skip internal metadata keys
            if (fieldKey.startsWith('_')) return;
            
            // Extract type and value using helper
            const { type: fieldType, value: fieldVal, options = [], columns = [], bbox = [] } = extractFieldTypeAndValue(fieldValue);
            
            // Handle table type
            if (fieldType === 'table') {
              section.fields.push({
                id: `${originalKey}_${fieldKey}_${Date.now()}`,
                label: formatFieldName(fieldKey),
                type: 'table',
                required: false,
                x: 0,
                y: 0,
                width: 400,
                height: 200,
                section: originalKey,
                confidence: 1,
                columns: columns.length > 0 ? columns : (Array.isArray(fieldVal) && fieldVal.length > 0 ? Object.keys(fieldVal[0] || {}) : ['Column 1', 'Column 2']),
                rows: Array.isArray(fieldVal) ? fieldVal : (fieldVal ? [fieldVal] : []),
                previewRows: Array.isArray(fieldVal) ? Math.max(fieldVal.length, 1) : 1,
                options: [],
                validation: {}
              });
              return;
            }
            
            // Handle signature type
            if (fieldType === 'signature') {
              section.fields.push({
                id: `${originalKey}_${fieldKey}_${Date.now()}`,
                label: formatFieldName(fieldKey),
                type: 'signature',
                required: false,
                x: bbox[0] || 0,
                y: bbox[1] || 0,
                width: bbox.length === 4 ? (bbox[2] - bbox[0]) : 200,
                height: bbox.length === 4 ? (bbox[3] - bbox[1]) : 60,
                section: originalKey,
                confidence: 1,
                options: [],
                validation: {},
                bbox: bbox.length === 4 ? bbox : undefined
              });
              return;
            }

            // Override with persisted type if available
            const normalizedLabel = normalize(fieldKey);
            const persistedType = fieldTypeByLabel.get(normalizedLabel);
            const finalFieldType = persistedType || fieldType;
            const persistedRequired = fieldRequiredByLabel.get(normalizedLabel);

            section.fields.push({
              id: `${originalKey}_${fieldKey}_${Date.now()}`,
              label: formatFieldName(fieldKey),
              type: finalFieldType,
              required: persistedRequired ?? false,
              x: 0,
              y: 0,
              width: 200,
              height: 40,
              section: originalKey,
              confidence: 1,
              options: options.length > 0 ? options : [],
              validation: {}
            });
          });
        }

        sections.push(section);
      }
    });

    // Filter out metadata sections and sort by order
    const filteredSections = sections.filter(section => {
      // Filter out sections that are metadata (KeyOrder, _keyOrder, etc.)
      const normalizedId = section.id.toLowerCase();
      const normalizedName = section.name.toLowerCase();
      return !normalizedId.startsWith('_') && 
             normalizedName !== 'keyorder' && 
             !normalizedName.startsWith('_key') &&
             normalizedId !== 'keyorder' &&
             !normalizedId.startsWith('_key');
    });
    
    return filteredSections.sort((a, b) => a.order - b.order);
  };

  // Section management functions
  const addSection = (name: string) => {
    console.log('Adding section:', name, 'Current sections:', sections.length);
    const newSection: HierarchicalSection = {
      id: `section_${Date.now()}`,
      name: name,
      order: sections.length,
      fields: []
    };
    setSections(prev => {
      const newSections = [...prev, newSection];
      console.log('New sections after add:', newSections.length);
      return newSections;
    });
    setExpandedSections(prev => new Set([...prev, newSection.id]));
  };

  const editSection = (sectionId: string, newName: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, name: newName } : section
    ));
  };

  const deleteSection = (sectionId: string) => {
    setSections(prev => prev.filter(section => section.id !== sectionId));
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Field management functions
  const addFieldToSection = (sectionId: string) => {
    console.log('🔧 addFieldToSection called with sectionId:', sectionId);
    const newField: TemplateField = {
      id: `${sectionId}_field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      x: 0,
      y: 0,
      width: 200,
      height: 40,
      section: sectionId,
      confidence: 1,
      options: [],
      validation: {}
    };
    console.log('🔧 Created new field:', newField);
    setEditingField(newField);
  };

  const updateField = (fieldId: string, updatedField: TemplateField) => {
    setSections(prev => prev.map(section => ({
      ...section,
      fields: section.fields.map(field => 
        field.id === fieldId ? updatedField : field
      )
    })));
  };

  const deleteField = (fieldId: string) => {
    setSections(prev => prev.map(section => ({
      ...section,
      fields: section.fields.filter(field => field.id !== fieldId)
    })));
  };

  // Reorder functions
  const reorderFields = (sectionId: string, fieldId: string, newIndex: number) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        const fields = [...section.fields];
        const currentIndex = fields.findIndex(field => field.id === fieldId);
        
        if (currentIndex !== -1 && currentIndex !== newIndex) {
          // Remove field from current position
          const [movedField] = fields.splice(currentIndex, 1);
          // Insert at new position
          fields.splice(newIndex, 0, movedField);
        }
        
        return { ...section, fields };
      }
      return section;
    }));
  };

  const reorderSections = (sectionId: string, newIndex: number) => {
    setSections(prev => {
      const sections = [...prev];
      const currentIndex = sections.findIndex(section => section.id === sectionId);
      
      if (currentIndex !== -1 && currentIndex !== newIndex) {
        // Remove section from current position
        const [movedSection] = sections.splice(currentIndex, 1);
        // Insert at new position
        sections.splice(newIndex, 0, movedSection);
        
        // Update order property
        return sections.map((section, index) => ({
          ...section,
          order: index
        }));
      }
      
      return sections;
    });
  };

  const handleFieldSave = (field: TemplateField) => {
    console.log('🔧 handleFieldSave called with field:', field);
    console.log('🔧 Current sections:', sections);
    
    // Check if this is a new field (no ID or ID starts with section name)
    const isNewField = !field.id || field.id.includes('_field_');
    console.log('🔧 Is new field:', isNewField);
    
    if (isNewField && field.section) {
      // New field with section, add it to the section
      console.log('🔧 Adding new field to existing section:', field.section);
      setSections(prev => {
        const newSections = prev.map(section => 
          section.id === field.section 
            ? { ...section, fields: [...section.fields, field] }
            : section
        );
        console.log('🔧 New sections after adding field:', newSections);
        return newSections;
      });
    } else if (!isNewField && field.section) {
      // Existing field, update it
      console.log('🔧 Updating existing field:', field.id);
      updateField(field.id, field);
    } else {
      // Field without section, add to first section or create default section
      console.log('🔧 Adding field without section');
      let targetSectionId = sections.length > 0 ? sections[0].id : 'general';
      
      if (sections.length === 0) {
        const defaultSection: HierarchicalSection = {
          id: 'general',
          name: 'General',
          order: 0,
          fields: []
        };
        setSections([defaultSection]);
        setExpandedSections(new Set(['general']));
      }
      
      const fieldWithSection = { ...field, section: targetSectionId };
      
      setSections(prev => prev.map(section => 
        section.id === targetSectionId 
          ? { ...section, fields: [...section.fields, fieldWithSection] }
          : section
      ));
    }
    setEditingField(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Sort sections by order to preserve LLM/manual sequence
      const sortedSections = [...sections].sort((a, b) => a.order - b.order);
      
      const formData = {
        title: formTitle,
        description: formDescription,
        sections: sortedSections.map(section => ({
          id: section.id,
          name: section.name,
          order: section.order
        })),
        // Maintain field order within each section
        fields: sortedSections.flatMap(section => section.fields),
        hierarchicalData: convertSectionsToHierarchicalData(sortedSections)
      };
      
      if (onSave) {
        await onSave(formData);
      }
      
      if (onDataChange) {
        onDataChange(formData);
      }
    } catch (error) {
      console.error('Error saving form:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Convert sections back to hierarchical data format
  const convertSectionsToHierarchicalData = (sections: HierarchicalSection[]): any => {
    const hierarchicalData: any = {};
    
    // Sort sections by order to preserve LLM/manual sequence
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    
    sortedSections.forEach(section => {
      const sectionData: any = {};
      const nameCounts: Record<string, number> = {};

      section.fields.forEach(field => {
        // Build a safe key from label and ensure uniqueness within section
        const baseKey = (field.label || 'field').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field';
        const count = (nameCounts[baseKey] || 0) + 1;
        nameCounts[baseKey] = count;
        const key = count === 1 ? baseKey : `${baseKey}_${count}`;

        if (field.type === 'table') {
          // Preserve actual rows when present; otherwise provide a single empty row with inferred columns
          const rows = (field as any).rows as any[] | undefined;
          if (Array.isArray(rows) && rows.length > 0) {
            sectionData[key] = rows;
          } else {
            const cols = field.columns && field.columns.length > 0 ? field.columns : ['column_1', 'column_2'];
            sectionData[key] = [Object.fromEntries(cols.map((c) => [c, '']))];
          }
        } else if (field.type === 'checkbox') {
          sectionData[key] = [] as string[];
        } else if (field.type === 'select' || field.type === 'radio') {
          sectionData[key] = '';
        } else if (field.type === 'date') {
          sectionData[key] = '';
        } else if (field.type === 'signature') {
          sectionData[key] = { image_url: '', signed_at: '' };
        } else {
          // text, email, number, phone, textarea, file, etc.
          sectionData[key] = '';
        }
      });
      
      const sectionKey = (section.name || 'section').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'section';
      hierarchicalData[sectionKey] = sectionData;
    });
    
    return hierarchicalData;
  };

  return (
    <div className="space-y-6">
      <FormToolbar
        formTitle={formTitle}
        formDescription={formDescription}
        onTitleChange={onTitleChange || (() => {})}
        onDescriptionChange={onDescriptionChange || (() => {})}
        onAddSection={addSection}
        onSave={handleSave}
        isSaving={isSaving}
        hideSettings={hideFormSettings}
        hideSaveButton={true}
      />

      {/* Sections */}
      <div 
        className="space-y-4"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedSectionId = e.dataTransfer.getData('text/plain');
          const targetSectionId = e.currentTarget.getAttribute('data-section-id');
          
          if (draggedSectionId && targetSectionId && draggedSectionId !== targetSectionId) {
            const targetIndex = sections.findIndex(section => section.id === targetSectionId);
            if (targetIndex !== -1) {
              reorderSections(draggedSectionId, targetIndex);
            }
          }
        }}
      >
        {sections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No sections created yet.</p>
            <p className="text-sm mt-2">Click "Add Section" to get started.</p>
          </div>
        ) : (
          sections.map((section) => (
            <div
              key={section.id}
              data-section-id={section.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const draggedSectionId = e.dataTransfer.getData('text/plain');
                
                if (draggedSectionId && draggedSectionId !== section.id) {
                  const targetIndex = sections.findIndex(s => s.id === section.id);
                  if (targetIndex !== -1) {
                    reorderSections(draggedSectionId, targetIndex);
                  }
                }
              }}
            >
              <SectionManager
                section={section}
                isExpanded={expandedSections.has(section.id)}
                onToggleExpanded={toggleSectionExpanded}
                onEditSection={editSection}
                onDeleteSection={deleteSection}
                onAddField={addFieldToSection}
                onEditField={setEditingField}
                onDeleteField={deleteField}
                onEditFieldName={() => {}} // Not implemented yet
                onReorderFields={reorderFields}
                onReorderSection={reorderSections}
              />
            </div>
          ))
        )}
      </div>

      {/* Field Editor Modal */}
      <FieldEditor
        field={editingField}
        isOpen={!!editingField}
        onClose={() => setEditingField(null)}
        onSave={handleFieldSave}
      />
    </div>
  );
};