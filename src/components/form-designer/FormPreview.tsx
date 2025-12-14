import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FormPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    title: string;
    description: string;
    fields: any[];
    sections?: Array<{id: string, name: string, order: number}>;
    hierarchicalData?: any;
  };
}

export const FormPreview: React.FC<FormPreviewProps> = ({ isOpen, onClose, formData }) => {
  const [values, setValues] = React.useState<Record<string, any>>({});
  const setValue = (key: string, val: any) => setValues(prev => ({ ...prev, [key]: val }));
  const normalizeKey = (label: string) =>
    (label || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'field';
  
  // Format field/section names for display - removes page suffixes
  const formatFieldName = (fieldName: string): string => {
    // Remove page number suffixes (e.g., "_page_1", " Page 1", etc.)
    const cleaned = fieldName
      .replace(/_page_\d+$/i, '') // Remove "_page_1" at the end
      .replace(/[_\s]page\s*\d+$/i, '') // Remove " page 1" or "_page1" at the end
      .replace(/\s+page\s+\d+$/i, ''); // Remove " Page 1" at the end
    
    return cleaned
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  // Build a map from normalized field label -> type so preview can render correct input types
  const fieldTypeByKey = React.useMemo(() => {
    const map = new Map<string, string>();
    try {
      (formData.fields || []).forEach((f: any) => {
        const key = normalizeKey(f?.label || '');
        if (key && f?.type) map.set(key, f.type);
      });
    } catch {}
    return map;
  }, [formData.fields]);
  const isProbablyFileField = (key: string) => {
    const k = key.toLowerCase();
    return (
      k.includes('file') ||
      k.includes('document_upload') ||
      k.includes('attachment') ||
      k.includes('upload') ||
      k.endsWith('_document') ||
      k.endsWith('_file')
    );
  };
  
  // Early return if formData is null or undefined
  if (!formData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin overflow-x-hidden w-full">
          <DialogHeader>
            <DialogTitle>Form Preview</DialogTitle>
          </DialogHeader>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No form data available for preview.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  // Helper function to render field by type (used by both renderField and renderHierarchicalData)
  const renderFieldByType = (
    fieldType: string, 
    label: string, 
    fieldPath: string, 
    options: string[] = [], 
    currentValues: Record<string, any>,
    setValueFn: (key: string, val: any) => void,
    fieldId?: string
  ) => {
    switch (fieldType) {
      case 'email':
        return (
          <input 
            type="email" 
            className="w-full p-2 border rounded-md" 
            placeholder="email@example.com"
            value={currentValues[fieldPath] ?? ''}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'number':
        return (
          <input 
            type="number" 
            className="w-full p-2 border rounded-md" 
            placeholder="123"
            value={currentValues[fieldPath] ?? ''}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'phone':
        return (
          <input 
            type="tel" 
            className="w-full p-2 border rounded-md" 
            placeholder="+1234567890"
            value={currentValues[fieldPath] ?? ''}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'date':
        return (
          <input 
            type="date" 
            className="w-full p-2 border rounded-md" 
            value={currentValues[fieldPath] ?? ''}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'textarea':
        return (
          <textarea 
            className="w-full p-2 border rounded-md min-h-[100px]" 
            placeholder={label}
            value={currentValues[fieldPath] ?? ''}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'select':
        return (
          <select
            className="w-full p-2 border rounded-md"
            value={currentValues[fieldPath] ?? ''}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          >
            <option value="">Select an option</option>
            {(options.length > 0 ? options : ['Option 1', 'Option 2']).map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="space-y-1">
            {(options.length > 0 ? options : ['Option 1', 'Option 2']).map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  name={fieldPath}
                  checked={currentValues[fieldPath] === option}
                  onChange={() => setValueFn(fieldPath, option)}
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-1">
            {(options.length > 0 ? options : ['Option 1', 'Option 2']).map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={Array.isArray(currentValues[fieldPath]) ? currentValues[fieldPath].includes(option) : false}
                  onChange={(e) => {
                    const current = Array.isArray(currentValues[fieldPath]) ? currentValues[fieldPath] as string[] : [];
                    setValueFn(
                      fieldPath,
                      e.target.checked ? [...current, option] : current.filter((o) => o !== option)
                    );
                  }}
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'file':
        return (
          <div className="flex flex-col gap-2">
            <input
              type="file"
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              onChange={(e) => setValueFn(fieldPath, e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            />
            {currentValues[fieldPath] && typeof currentValues[fieldPath] === 'object' && 'name' in (currentValues[fieldPath] as any) && (
              <div className="text-xs text-muted-foreground">Selected: {(currentValues[fieldPath] as File).name}</div>
            )}
          </div>
        );
      
      default:
      case 'text':
        return (
          <input 
            type="text" 
            className="w-full p-2 border rounded-md" 
            placeholder={label}
            value={currentValues[fieldPath] ?? ''}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
    }
  };

  const renderField = (field: any) => {
    switch (field.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md" 
              placeholder={field.label}
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          </div>
        );
      
      case 'email':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <input 
              type="email" 
              className="w-full p-2 border rounded-md" 
              placeholder="email@example.com"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <input 
              type="number" 
              className="w-full p-2 border rounded-md" 
              placeholder="123"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          </div>
        );
      
      case 'date':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <input 
              type="date" 
              className="w-full p-2 border rounded-md" 
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <select 
              className="w-full p-2 border rounded-md"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            >
              <option value="">Select an option</option>
              {(field.options || []).map((option: string, index: number) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      
      case 'textarea':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <textarea 
              className="w-full p-2 border rounded-md h-20" 
              placeholder="Enter text..."
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <div className="space-y-1">
              {(field.options || ['Option 1', 'Option 2']).map((option: string, index: number) => (
                <label key={index} className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={Array.isArray(values[field.id]) ? values[field.id].includes(option) : false}
                    onChange={(e) => {
                      const current = Array.isArray(values[field.id]) ? values[field.id] as string[] : [];
                      setValue(
                        field.id,
                        e.target.checked ? [...current, option] : current.filter((o) => o !== option)
                      );
                    }}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <div className="space-y-1">
              {(field.options || ['Option 1', 'Option 2']).map((option: string, index: number) => (
                <label key={index} className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    name={field.id}
                    checked={values[field.id] === option}
                    onChange={() => setValue(field.id, option)}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );
      
      case 'phone':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <input 
              type="tel" 
              className="w-full p-2 border rounded-md" 
              placeholder="(000) 000-0000"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                onChange={(e) => {
                  const input = e.currentTarget as HTMLInputElement;
                  setValue(field.id, input.files && input.files[0] ? input.files[0] : null);
                }}
              />
              {values[field.id] && typeof values[field.id] === 'object' && 'name' in (values[field.id] as any) && (
                <div className="text-xs text-muted-foreground">Selected: {(values[field.id] as File).name}</div>
              )}
            </div>
          </div>
        );
      
      case 'table':
        // Determine number of rows dynamically based on field.rows, previewRows, or fallback to 1
        const rowCount = (field as any).rows?.length || (field as any).previewRows || 1;
        return (
          <div className="space-y-2 w-full">
            <label className="text-sm font-medium">{field.label}</label>
            <div className="overflow-x-auto w-full max-w-full scrollbar-hide border border-gray-200 rounded-md">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {(field.columns || ['Column 1', 'Column 2']).map((column: string, index: number) => (
                      <th key={index} className="border border-gray-300 px-3 py-2 text-left text-sm font-medium whitespace-nowrap">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: rowCount }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {(field.columns || ['Column 1', 'Column 2']).map((column: string, colIndex: number) => (
                        <td key={colIndex} className="border border-gray-300 px-3 py-2 whitespace-nowrap">
                          <input 
                            type="text" 
                            className="w-full p-1 border rounded text-sm min-w-[100px]" 
                            placeholder="Sample data"
                            value={values[`${field.id}-${rowIndex}-${colIndex}`] ?? ''}
                            onChange={(e) => setValue(`${field.id}-${rowIndex}-${colIndex}`, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      case 'signature':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
              <span className="text-sm text-gray-500">Signature Area</span>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md" 
              placeholder={field.label}
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          </div>
        );
    }
  };

  const renderHierarchicalData = (data: any, sectionName?: string, path: string[] = [], depth: number = 0) => {
    if (!data) return null;

    const isTopLevel = depth === 0;

    // Match PublicFormView: render top-level sections as cards
    if (isTopLevel) {
      // Extract key order from metadata if available, otherwise use formData.sections order
      let orderedEntries: Array<[string, any]> = [];
      
      // Try to get order from _keyOrder metadata
      const keyOrder = (data as any)?._keyOrder;
      if (Array.isArray(keyOrder) && keyOrder.length > 0) {
        // Use _keyOrder to sort entries, but filter out metadata keys
        const dataEntries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
        orderedEntries = keyOrder
          .map((key: string) => {
            const entry = dataEntries.find(([k]) => k === key);
            return entry ? entry : null;
          })
          .filter((entry): entry is [string, any] => entry !== null);
        
        // Add any remaining entries not in keyOrder (shouldn't happen, but safety check)
        const orderedKeys = new Set(keyOrder);
        dataEntries.forEach(([key, value]) => {
          if (!orderedKeys.has(key)) {
            orderedEntries.push([key, value]);
          }
        });
      } else if (formData.sections && formData.sections.length > 0) {
        // Fallback: use formData.sections order to determine section sequence
        const sectionsMap = new Map<string, {id: string, name: string, order: number}>();
        formData.sections.forEach(s => {
          sectionsMap.set(s.id, s);
        });
        
        // Create a map of section key (normalized section id) to order
        const sectionOrderMap = new Map<string, number>();
        formData.sections.forEach(s => {
          const normalizedKey = (s.name || s.id).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
          sectionOrderMap.set(normalizedKey, s.order);
          sectionOrderMap.set(s.id.toLowerCase(), s.order);
        });
        
        const dataEntries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
        orderedEntries = dataEntries.sort(([keyA], [keyB]) => {
          const orderA = sectionOrderMap.get(keyA) ?? sectionOrderMap.get(keyA.toLowerCase()) ?? 999;
          const orderB = sectionOrderMap.get(keyB) ?? sectionOrderMap.get(keyB.toLowerCase()) ?? 999;
          return orderA - orderB;
        });
      } else {
        // No order information, just filter and use natural order
        orderedEntries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
      }
      
      return (
        <div className="space-y-6 w-full min-w-0">
          {orderedEntries.map(([key, value]) => {
            const sectionTitle = formatFieldName(key);
            
            // Always render as a section card (like in design form page) - even for single fields
            return (
              <Card key={key} className="shadow-md border-border w-full min-w-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/5 to-transparent pb-4 border-b">
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <div className="h-1.5 w-10 bg-primary rounded-full"></div>
                    {sectionTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 w-full min-w-0 overflow-hidden">
                  {Array.isArray(value) ? (
                    // Reuse array/table rendering at depth 1
                    renderHierarchicalData({ [key]: value }, undefined, [], 1)
                  ) : typeof value === 'object' && value !== null ? (
                    // Check if it's a single typed field or a nested section
                    '_type' in value && (value as any)._type !== 'table' ? (
                      // Single field with _type metadata - render directly
                      (() => {
                        const fieldPath = [...path, key].join('.');
                        const normalized = key.replace(/_\d+$/, '');
                        const typedValue = value as { _type: string, value?: any, options?: string[] };
                        
                        let fieldType = typedValue._type || 'text';
                        let fieldOptions = Array.isArray(typedValue.options) ? typedValue.options : [];
                        
                        // Fallback: Try to find the matching field from formData.fields with improved matching
                        const normalizedKey = normalizeKey(key);
                        const normalizedKeyNoPage = normalizeKey(key.replace(/_page_\d+$/i, '').replace(/[_\s]page\s*\d+$/i, ''));
                        const matchingField = (formData.fields || []).find((f: any) => {
                          const fieldKey = normalizeKey(f?.label || '');
                          const fieldKeyNoPage = normalizeKey((f?.label || '').replace(/_page_\d+$/i, '').replace(/[_\s]page\s*\d+$/i, ''));
                          return fieldKey === normalizedKey || 
                                 fieldKey === normalizedKeyNoPage ||
                                 fieldKeyNoPage === normalizedKeyNoPage ||
                                 fieldKey === normalized ||
                                 fieldKey === key ||
                                 fieldKeyNoPage === normalizedKey;
                        });
                        
                        // Also check fieldTypeByKey map
                        const typeFromMap = fieldTypeByKey.get(normalizedKey) || 
                                            fieldTypeByKey.get(normalizedKeyNoPage) ||
                                            fieldTypeByKey.get(normalized) ||
                                            fieldTypeByKey.get(key);
                        
                        if (matchingField) {
                          // Prefer matchingField type, but use _type if it's more specific
                          fieldType = matchingField.type || (typedValue._type ? typedValue._type : typeFromMap || 'text');
                          fieldOptions = matchingField.options || fieldOptions;
                        } else if (typeFromMap) {
                          fieldType = typedValue._type || typeFromMap || 'text';
                        } else {
                          // Try to infer type from field name if not found
                          const lowerKey = key.toLowerCase();
                          if (lowerKey.includes('date') || lowerKey.includes('dob') || lowerKey.includes('birth') || lowerKey.includes('valid') || lowerKey.includes('expir')) {
                            fieldType = typedValue._type || 'date';
                          } else if (lowerKey.includes('email')) {
                            fieldType = typedValue._type || 'email';
                          } else if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('contact')) {
                            fieldType = typedValue._type || 'phone';
                          } else if (lowerKey.includes('number') || lowerKey.includes('quantity') || lowerKey.includes('amount') || lowerKey.includes('price') || lowerKey.includes('age')) {
                            fieldType = typedValue._type || 'number';
                          } else if (lowerKey.includes('address') || lowerKey.includes('description') || lowerKey.includes('note') || lowerKey.includes('comment')) {
                            fieldType = typedValue._type || 'textarea';
                          }
                        }
                        
                        return (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">{sectionTitle}</label>
                            {renderFieldByType(fieldType, sectionTitle, fieldPath, fieldOptions, values, setValue, key)}
                          </div>
                        );
                      })()
                    ) : (
                      // Nested section - pass the section key so nested rendering can access field order
                      renderHierarchicalData(value, key, [key], 1)
                    )
                  ) : (
                    // Primitive or null value - render as single field
                    (() => {
                      const fieldPath = [...path, key].join('.');
                      const normalized = key.replace(/_\d+$/, '');
                      
                      // Extract field type: first check formData.fields
                      let fieldType = 'text';
                      let fieldOptions: string[] = [];
                      
                      // Fallback: Try to find the matching field from formData.fields
                      const matchingField = (formData.fields || []).find((f: any) => {
                        const fieldKey = normalizeKey(f?.label || '');
                        return fieldKey === key || fieldKey === normalized;
                      });
                      
                      if (matchingField) {
                        fieldType = matchingField.type || 'text';
                        fieldOptions = matchingField.options || [];
                      } else {
                        // Try to infer type from field name if not found
                        const lowerKey = key.toLowerCase();
                        if (lowerKey.includes('date') || lowerKey.includes('dob') || lowerKey.includes('birth') || lowerKey.includes('valid') || lowerKey.includes('expir')) {
                          fieldType = 'date';
                        } else if (lowerKey.includes('email')) {
                          fieldType = 'email';
                        } else if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('contact')) {
                          fieldType = 'phone';
                        } else if (lowerKey.includes('number') || lowerKey.includes('quantity') || lowerKey.includes('amount') || lowerKey.includes('price') || lowerKey.includes('age')) {
                          fieldType = 'number';
                        } else if (lowerKey.includes('address') || lowerKey.includes('description') || lowerKey.includes('note') || lowerKey.includes('comment')) {
                          fieldType = 'textarea';
                        }
                      }
                      
                      return (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{sectionTitle}</label>
                          {renderFieldByType(fieldType, sectionTitle, fieldPath, fieldOptions, values, setValue, key)}
                        </div>
                      );
                    })()
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    // Render nested content (sub-sections within a card)
    // This handles fields within a section (similar to PublicFormView)
    let orderedFieldEntries: Array<[string, any]> = [];
    
    // If we're rendering fields within a section (depth === 1), try to get field order
    if (depth === 1 && sectionName) {
      // Field order is stored at top level as _sectionName_fieldOrder
      const fieldOrderKey = `_${sectionName}_fieldOrder`;
      // Access the top-level hierarchicalData from formData prop
      const topLevelHierarchicalData = formData.hierarchicalData;
      const fieldOrder = topLevelHierarchicalData && typeof topLevelHierarchicalData === 'object' 
        ? (topLevelHierarchicalData as any)?.[fieldOrderKey] 
        : undefined;
      
      if (Array.isArray(fieldOrder) && fieldOrder.length > 0) {
        // Use field order to sort entries
        const dataEntries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
        orderedFieldEntries = fieldOrder
          .map((key: string) => {
            const entry = dataEntries.find(([k]) => k === key);
            return entry ? entry : null;
          })
          .filter((entry): entry is [string, any] => entry !== null);
        
        // Add any remaining entries not in fieldOrder
        const orderedKeys = new Set(fieldOrder);
        dataEntries.forEach(([key, value]) => {
          if (!orderedKeys.has(key)) {
            orderedFieldEntries.push([key, value]);
          }
        });
      } else {
        // No field order metadata, use natural order (filtered)
        orderedFieldEntries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
      }
    } else {
      // For deeper nesting or no section name, use natural order (filtered)
      orderedFieldEntries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
    }

    const indentStyle = depth > 0 ? { marginLeft: `${depth * 1.5}rem` } : {};

    return (
      <div className="space-y-4 w-full min-w-0" style={indentStyle}>
        {/* Only show h3 heading for sub-sections (depth > 1), not for fields inside section cards (depth === 1) */}
        {sectionName && depth > 1 && (
          <h3 className={`text-lg font-semibold border-b pb-2 ${isTopLevel ? 'mt-0' : 'mt-4'}`}>
            {formatFieldName(sectionName)}
          </h3>
        )}
        
        {orderedFieldEntries.map(([key, value]) => {
          // Skip keys that match the section name to avoid duplicate section headings
          // This happens when a nested object has a field with the same name as the section
          if (sectionName) {
            const normalizedSectionName = normalizeKey(sectionName);
            const normalizedKey = normalizeKey(key);
            // Also check without page suffixes for comparison
            const sectionNameWithoutPage = sectionName.replace(/_page_\d+$/i, '').replace(/[_\s]page\s*\d+$/i, '');
            const keyWithoutPage = key.replace(/_page_\d+$/i, '').replace(/[_\s]page\s*\d+$/i, '');
            const normalizedSectionNameNoPage = normalizeKey(sectionNameWithoutPage);
            const normalizedKeyNoPage = normalizeKey(keyWithoutPage);
            
            if (normalizedKey === normalizedSectionName || normalizedKeyNoPage === normalizedSectionNameNoPage) {
              return null; // Skip rendering this field as it matches the section name
            }
          }
          if (Array.isArray(value)) {
            // First check: Is it an array of objects (table) or primitives (checkbox/signature)?
            const isArrayOfObjects = value.length > 0 && value.every((v) => typeof v === 'object' && v !== null && !Array.isArray(v));
            
            // Check if this is a checkbox array (empty array or array of primitives, not objects)
            // Empty arrays are treated as checkboxes (they're initialized as [] in hierarchical data)
            const isCheckboxArray = value.length === 0 || (value.length > 0 && value.every(item => 
              typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' || item === null
            ));
            
            // Check if this is a signature array (has bbox and label properties)
            const isSignatureArray = value.length > 0 && 
              !isCheckboxArray &&
              isArrayOfObjects &&
              (value[0].hasOwnProperty('bbox') || value[0].hasOwnProperty('label') || 
               value[0].hasOwnProperty('image_url') || value[0].hasOwnProperty('signed_at')) &&
              (key.toLowerCase().includes('signature') || key.toLowerCase().includes('sign'));
            
            // If it's a checkbox array (empty or array of primitives), render as checkboxes
            // Also check field type from formData to be sure
            const normalized = key.replace(/_\d+$/, '');
            const matchingField = (formData.fields || []).find((f: any) => {
              const fieldKey = normalizeKey(f?.label || '');
              return fieldKey === key || fieldKey === normalized;
            });
            const isCheckboxType = matchingField?.type === 'checkbox';
            
            if ((isCheckboxArray && !isArrayOfObjects) || isCheckboxType) {
              const fieldLabel = formatFieldName(key);
              const fieldPath = [...path, key].join('.');
              
              const fieldOptions = matchingField?.options || [];
              
              return (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium">{fieldLabel}</label>
                  {renderFieldByType('checkbox', fieldLabel, fieldPath, fieldOptions, values, setValue, key)}
                </div>
              );
            }
            
            if (isSignatureArray) {
              // Render as signature area (single signature area, not multiple rows)
              return (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium">{formatFieldName(key)}</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                    <span className="text-sm text-gray-500">Signature Area</span>
                  </div>
                </div>
              );
            }

            // Table rendering for array of objects
            const objectColumns: string[] = isArrayOfObjects
              ? Array.from(new Set((value as Record<string, any>[]).flatMap((row) => Object.keys(row))))
              : [];
            const looksLikeColumnsAsRows = isArrayOfObjects && (value as Record<string, any>[]).every((row) => Object.keys(row).length === 1);
            const normalizedRows: any[] = looksLikeColumnsAsRows
              ? [Object.fromEntries(objectColumns.map((c) => [c, '']))]
              : value;

            return (
              <div key={key} className="space-y-2 w-full min-w-0">
                <label className="text-sm font-medium">{formatFieldName(key)}</label>
                <div className="overflow-x-auto w-full max-w-full scrollbar-hide border border-gray-200 rounded-md">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {isArrayOfObjects
                          ? objectColumns.map((colKey) => (
                              <th key={colKey} className="border border-gray-300 px-3 py-2 text-left text-sm font-medium whitespace-nowrap">
                                {formatFieldName(colKey)}
                              </th>
                            ))
                          : <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium whitespace-nowrap">Value</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedRows.map((item, index) => (
                        <tr key={index}>
                          {isArrayOfObjects && typeof item === 'object'
                            ? objectColumns.map((colKey, colIndex) => (
                                <td key={colIndex} className="border border-gray-300 px-3 py-2 whitespace-nowrap">
                                  <input 
                                    type="text" 
                                    className="w-full p-1 border rounded text-sm min-w-[100px]" 
                                    placeholder="Sample data"
                                    value={values[[...path, key, String(index), colKey].join('.')] ?? ''}
                                    onChange={(e) => setValue([...path, key, String(index), colKey].join('.'), e.target.value)}
                                  />
                                </td>
                              ))
                            : <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">
                                <input 
                                  type="text" 
                                  className="w-full p-1 border rounded text-sm" 
                                  placeholder="Sample data"
                                  value={values[[...path, key, String(index)].join('.')] ?? ''}
                                  onChange={(e) => setValue([...path, key, String(index)].join('.'), e.target.value)}
                                />
                              </td>
                          }
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          } else if (typeof value === 'object' && value !== null) {
            // FIRST: Check if it's a field with _type metadata (new LLM format)
            if ('_type' in value) {
              const typedValue = value as { _type: string, value?: any, options?: string[] };
              
              // Handle table type
              if (typedValue._type === 'table') {
                const columns = Array.isArray((typedValue as any)._columns) ? (typedValue as any)._columns : 
                               (Array.isArray(typedValue.value) && typedValue.value.length > 0 ? Object.keys(typedValue.value[0] || {}) : ['Column 1', 'Column 2']);
                const rows = Array.isArray(typedValue.value) ? typedValue.value : [];
                
                return (
                  <div key={key} className="space-y-2 w-full min-w-0">
                    <label className="text-sm font-medium">{formatFieldName(key)}</label>
                    <div className="overflow-x-auto w-full max-w-full scrollbar-thin border border-gray-200 rounded-md">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            {columns.map((col, colIndex) => (
                              <th key={colIndex} className="border border-gray-300 px-3 py-2 text-left text-sm font-medium whitespace-nowrap">
                                {formatFieldName(col)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(rows.length > 0 ? rows : [{}]).slice(0, 3).map((row: any, index: number) => (
                            <tr key={index}>
                              {columns.map((colKey) => (
                                <td key={colKey} className="border border-gray-300 px-3 py-2 whitespace-nowrap">
                                  <input 
                                    type="text" 
                                    className="w-full p-1 border rounded text-sm min-w-[100px]" 
                                    placeholder="Sample data"
                                    value={values[[...path, key, String(index), colKey].join('.')] ?? ''}
                                    onChange={(e) => setValue([...path, key, String(index), colKey].join('.'), e.target.value)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
              
              // Handle signature type
              if (typedValue._type === 'signature') {
                return (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium">{formatFieldName(key)}</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                      <span className="text-sm text-gray-500">Signature Area</span>
                    </div>
                  </div>
                );
              }
              
              // Handle all other field types (text, date, number, email, etc.)
              const fieldLabel = formatFieldName(key);
              const fieldPath = [...path, key].join('.');
              let fieldType = typedValue._type || 'text';
              let fieldOptions = Array.isArray(typedValue.options) ? typedValue.options : [];
              
              // Fallback: Also try to match with formData.fields to ensure correct type
              // Sometimes the _type might be missing or incorrect, so use formData.fields as backup
              const normalized = key.replace(/_\d+$/, '');
              const normalizedKey = normalizeKey(key);
              const normalizedKeyNoPage = normalizeKey(key.replace(/_page_\d+$/i, '').replace(/[_\s]page\s*\d+$/i, ''));
              const matchingField = (formData.fields || []).find((f: any) => {
                const fieldKey = normalizeKey(f?.label || '');
                const fieldKeyNoPage = normalizeKey((f?.label || '').replace(/_page_\d+$/i, '').replace(/[_\s]page\s*\d+$/i, ''));
                return fieldKey === normalizedKey || 
                       fieldKey === normalizedKeyNoPage ||
                       fieldKeyNoPage === normalizedKeyNoPage ||
                       fieldKey === normalized ||
                       fieldKey === key ||
                       fieldKeyNoPage === normalizedKey;
              });
              
              // Use matchingField type if available and _type is generic, otherwise use _type
              if (matchingField?.type && (fieldType === 'text' || !typedValue._type)) {
                fieldType = matchingField.type;
                fieldOptions = matchingField.options || fieldOptions;
              }
              
              // Also check fieldTypeByKey map
              const typeFromMap = fieldTypeByKey.get(normalizedKey) || 
                                  fieldTypeByKey.get(normalizedKeyNoPage) ||
                                  fieldTypeByKey.get(normalized) ||
                                  fieldTypeByKey.get(key);
              
              if (typeFromMap && (fieldType === 'text' || !typedValue._type)) {
                fieldType = typeFromMap;
              }
              
              return (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium">{fieldLabel}</label>
                  {renderFieldByType(fieldType, fieldLabel, fieldPath, fieldOptions, values, setValue, key)}
                </div>
              );
            }
            
            // Check if it's a legacy signature object
            if (Object.prototype.hasOwnProperty.call(value, 'image_url') || Object.prototype.hasOwnProperty.call(value, 'signed_at')) {
              return (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium">{formatFieldName(key)}</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                    <span className="text-sm text-gray-500">Signature Area</span>
                  </div>
                </div>
              );
            }
            
            // Handle nested objects (sub-sections) - only if it's not a typed field
            return (
              <div key={key} className="space-y-3">
                {renderHierarchicalData(value, formatFieldName(key), [...path, key], depth + 1)}
              </div>
            );
          } else {
            // Handle simple fields - extract type from value if it has _type metadata, otherwise use formData.fields
            const fieldLabel = formatFieldName(key);
            const fieldPath = [...path, key].join('.');
            const normalized = key.replace(/_\d+$/, ''); // drop numeric suffixes like _2
            const normalizedKeyNoPage = normalizeKey(key.replace(/_page_\d+$/i, '').replace(/[_\s]page\s*\d+$/i, ''));
            
            // Extract field type: first check if value has _type (new LLM format), then check formData.fields
            let fieldType = 'text';
            let fieldOptions: string[] = [];
            
            // Check if value has new LLM format with _type metadata
            if (value && typeof value === 'object' && '_type' in value) {
              fieldType = (value as any)._type || 'text';
              fieldOptions = Array.isArray((value as any).options) ? (value as any).options : [];
            } else {
              // Try to find the matching field from formData.fields using multiple matching strategies
              const normalizedKey = normalizeKey(key);
              const matchingField = (formData.fields || []).find((f: any) => {
                const fieldKey = normalizeKey(f?.label || '');
                const fieldKeyNoPage = normalizeKey((f?.label || '').replace(/_page_\d+$/i, '').replace(/[_\s]page\s*\d+$/i, ''));
                // Match on normalized keys (with and without page suffixes)
                return fieldKey === normalizedKey || 
                       fieldKey === normalizedKeyNoPage ||
                       fieldKeyNoPage === normalizedKeyNoPage ||
                       fieldKey === normalized ||
                       fieldKey === key ||
                       fieldKeyNoPage === normalizedKey;
              });
              
              // Also check fieldTypeByKey map (which is built from formData.fields)
              const typeFromMap = fieldTypeByKey.get(normalizedKey) || 
                                  fieldTypeByKey.get(normalizedKeyNoPage) ||
                                  fieldTypeByKey.get(normalized) ||
                                  fieldTypeByKey.get(key);
              
              // Try to infer type from field name if not found
              let inferredType = 'text';
              const lowerKey = key.toLowerCase();
              if (lowerKey.includes('date') || lowerKey.includes('dob') || lowerKey.includes('birth') || lowerKey.includes('valid') || lowerKey.includes('expir')) {
                inferredType = 'date';
              } else if (lowerKey.includes('email')) {
                inferredType = 'email';
              } else if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('contact')) {
                inferredType = 'phone';
              } else if (lowerKey.includes('number') || lowerKey.includes('quantity') || lowerKey.includes('amount') || lowerKey.includes('price') || lowerKey.includes('age')) {
                inferredType = 'number';
              } else if (lowerKey.includes('address') || lowerKey.includes('description') || lowerKey.includes('note') || lowerKey.includes('comment')) {
                inferredType = 'textarea';
              }
              
              // Priority: matchingField type > typeFromMap > inferredType > 'text'
              fieldType = matchingField?.type || typeFromMap || inferredType;
              fieldOptions = matchingField?.options || [];
            }
            
            return (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium">{fieldLabel}</label>
                {renderFieldByType(fieldType, fieldLabel, fieldPath, fieldOptions, values, setValue, key)}
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin overflow-x-hidden w-full">
        <DialogHeader>
          <DialogTitle>Form Preview: {formData.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 w-full min-w-0">
          {/* Form Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{formData.title || 'Untitled Form'}</h1>
            {formData.description && (
              <p className="text-gray-600">{formData.description}</p>
            )}
          </div>
          
          {/* Form Fields */}
          <div className="space-y-6 w-full min-w-0">
            {formData.hierarchicalData && Object.keys(formData.hierarchicalData).length > 0 ? (
              renderHierarchicalData(formData.hierarchicalData)
            ) : formData.sections && formData.sections.length > 0 ? (
              <div className="space-y-4">
                {formData.sections.map((section) => (
                  <div key={section.id} className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">{section.name}</h3>
                    <div className="space-y-4">
                      {formData.fields
                        ?.filter(field => field.section === section.id)
                        .map((field) => (
                          <div key={field.id}>
                            {renderField(field)}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
                
                {/* Fields without sections */}
                {formData.fields
                  ?.filter(field => !field.section || !formData.sections?.some(s => s.id === field.section))
                  .map((field) => (
                    <div key={field.id}>
                      {renderField(field)}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No fields to display</p>
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="text-center pt-6 border-t">
            <Button className="px-8" disabled>
              Submit Form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
