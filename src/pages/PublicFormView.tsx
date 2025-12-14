import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PublicForm {
  id: string;
  form_title: string;
  form_description: string;
  form_config: any;
  requires_auth: boolean;
  is_active: boolean;
  success_message: string;
}

export const PublicFormView = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchForm();
    }
  }, [slug]);

  const fetchForm = async () => {
    try {
      const { data, error } = await supabase
        .from('public_forms')
        .select('*')
        .eq('public_url_slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching form:', error);
        toast({
          title: "Form not found",
          description: "The form you're looking for doesn't exist or is no longer active.",
          variant: "destructive",
        });
        return;
      }

      setForm(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const setValue = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const reconstructHierarchicalData = (flatData: Record<string, any>, template: any, prefix: string = ''): any => {
    if (!template || typeof template !== 'object') {
      return template;
    }
    
    const result: any = {};
    
    Object.entries(template).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (Array.isArray(value)) {
        // For arrays (tables), check if we have table array data
        const tableKey = fullKey;
        if (flatData[tableKey] && Array.isArray(flatData[tableKey])) {
          result[key] = flatData[tableKey];
        } else {
          // Reconstruct from individual cell values
          result[key] = value.map((item, index) => {
            if (typeof item === 'object' && item !== null) {
              const reconstructed: any = {};
              Object.keys(item).forEach(colKey => {
                const cellKey = `${tableKey}.${index}.${colKey}`;
                reconstructed[colKey] = flatData[cellKey] ?? item[colKey] ?? '';
              });
              return reconstructed;
            }
            return flatData[`${tableKey}.${index}`] ?? item;
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        // Reconstruct nested object recursively
        result[key] = reconstructHierarchicalData(flatData, value, fullKey);
      } else {
        // Simple value - use flat data if available
        result[key] = flatData[fullKey] ?? value ?? '';
      }
    });
    
    return result;
  };

  // Helper function to convert File objects to base64 data URLs
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper function to process form data and convert File objects to base64
  const processFormData = async (data: any): Promise<any> => {
    if (data instanceof File) {
      // Convert File to base64 data URL
      const base64 = await convertFileToBase64(data);
      return {
        _type: 'file',
        filename: data.name,
        fileSize: data.size,
        mimeType: data.type,
        data: base64
      };
    }
    
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => processFormData(item)));
    }
    
    if (data && typeof data === 'object') {
      const processed: any = {};
      await Promise.all(
        Object.entries(data).map(async ([key, value]) => {
          processed[key] = await processFormData(value);
        })
      );
      return processed;
    }
    
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Reconstruct hierarchical structure from flat form values
      const formConfig = (form.form_config as any) || {};
      const hierarchicalData = formConfig.hierarchicalData || {};
      let submissionData = reconstructHierarchicalData(formValues, hierarchicalData);
      
      // Process form data to convert File objects to base64
      submissionData = await processFormData(submissionData);

      // Get current user or use null for anonymous
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('public_form_submissions')
        .insert({
          public_form_id: form.id,
          user_id: user?.id || null, // Use null for anonymous users
          form_data: submissionData,
          submitted_at: new Date().toISOString(),
          submitter_email: submissionData.email || null,
          submitter_name: submissionData.name || null,
          ip_address: null, // Could be added later for analytics
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Update submission count
      const { error: updateError } = await supabase
        .from('public_forms')
        .update({ 
          submission_count: form ? (form as any).submission_count + 1 : 1 
        })
        .eq('id', form.id);

      if (updateError) {
        console.warn('Failed to update submission count:', updateError);
        // Don't throw here as the main submission succeeded
      }

      setSubmitted(true);
      toast({
        title: "Form submitted successfully!",
        description: form.success_message,
      });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: "Submission Failed",
        description: error?.message || "There was an error submitting your form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Form Not Found</CardTitle>
            <CardDescription>
              The form you're looking for doesn't exist or is no longer active.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Thank You!</CardTitle>
            <CardDescription>
              {form.success_message}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const formConfig = (form.form_config as any) || {};
  const hierarchicalData = formConfig.hierarchicalData || {};
  const sections = formConfig.sections || [];
  const fields = formConfig.fields || [];

  // Helpers to infer correct input types from saved fields metadata
  const normalizeKey = (label: string) =>
    (label || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'field';
  const isProbablyFileField = (k: string) => {
    const key = k.toLowerCase();
    return (
      key.includes('file') ||
      key.includes('upload') ||
      key.includes('attachment') ||
      key.includes('document') ||
      key.endsWith('_file') ||
      key.endsWith('_document')
    );
  };
  const fieldTypeByKey: Map<string, string> = new Map();
  const fieldRequiredByKey: Map<string, boolean> = new Map();
  try {
    fields.forEach((f: any) => {
      const n = normalizeKey(f?.label || '');
      if (n && f?.type) fieldTypeByKey.set(n, f.type);
      fieldRequiredByKey.set(n, !!f?.required);
    });
  } catch {}

  // Helper function to render field by type (used by renderFieldValue)
  const renderFieldByType = (
    fieldType: string, 
    label: string, 
    fieldPath: string, 
    options: string[] = [], 
    currentValues: Record<string, any>,
    setValueFn: (key: string, val: any) => void,
    isRequired: boolean = false
  ) => {
    switch (fieldType) {
      case 'email':
        return (
          <input 
            type="email" 
            className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
            placeholder={`Enter ${label.toLowerCase()}`}
            value={currentValues[fieldPath] ?? ''}
            required={isRequired}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'number':
        return (
          <input 
            type="number" 
            className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
            placeholder={`Enter ${label.toLowerCase()}`}
            value={currentValues[fieldPath] ?? ''}
            required={isRequired}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'phone':
        return (
          <input 
            type="tel" 
            className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
            placeholder="+1234567890"
            value={currentValues[fieldPath] ?? ''}
            required={isRequired}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'date':
        return (
          <input 
            type="date" 
            className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
            value={currentValues[fieldPath] ?? ''}
            required={isRequired}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'textarea':
        return (
          <textarea 
            className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px]" 
            placeholder={`Enter ${label.toLowerCase()}`}
            value={currentValues[fieldPath] ?? ''}
            required={isRequired}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
      
      case 'select':
        return (
          <select
            className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            value={currentValues[fieldPath] ?? ''}
            required={isRequired}
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
          <div className="space-y-2">
            {(options.length > 0 ? options : ['Option 1', 'Option 2']).map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name={fieldPath}
                  value={option}
                  checked={currentValues[fieldPath] === option}
                  required={isRequired && index === 0}
                  onChange={() => setValueFn(fieldPath, option)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {(options.length > 0 ? options : ['Option 1', 'Option 2']).map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
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
                  className="w-4 h-4 text-primary focus:ring-primary rounded"
                />
                <span className="text-sm text-foreground">{option}</span>
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
              required={isRequired}
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
            className="w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
            placeholder={`Enter ${label.toLowerCase()}`}
            value={currentValues[fieldPath] ?? ''}
            required={isRequired}
            onChange={(e) => setValueFn(fieldPath, e.target.value)}
          />
        );
    }
  };

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

  const renderFieldValue = (key: string, value: any, path: string[] = [], depth: number = 0) => {
    const fieldKey = path.join('.');
    const fieldLabel = formatFieldName(key);

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
        (Object.prototype.hasOwnProperty.call(value[0], 'bbox') || Object.prototype.hasOwnProperty.call(value[0], 'label') || 
         Object.prototype.hasOwnProperty.call(value[0], 'image_url') || Object.prototype.hasOwnProperty.call(value[0], 'signed_at')) &&
        (key.toLowerCase().includes('signature') || key.toLowerCase().includes('sign'));
      
      // If it's a checkbox array, render as checkboxes
      const fieldPath = path.join('.');
      const normalized = key.replace(/_\d+$/, '');
      const matchingField = fields.find((f: any) => {
        const fieldKey = normalizeKey(f?.label || '');
        return fieldKey === key || fieldKey === normalized;
      });
      const isCheckboxType = matchingField?.type === 'checkbox';
      
      if ((isCheckboxArray && !isArrayOfObjects) || isCheckboxType) {
        const fieldLabel = formatFieldName(key);
        const fieldOptions = matchingField?.options || [];
        const isRequired = fieldRequiredByKey.get(normalizeKey(key)) || fieldRequiredByKey.get(normalized) || false;
        
        return (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground block">
              {fieldLabel} {isRequired && <span className="text-destructive">*</span>}
            </label>
            {renderFieldByType('checkbox', fieldLabel, fieldPath, fieldOptions, formValues, setValue, isRequired)}
          </div>
        );
      }
      
      if (isSignatureArray) {
        return (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">{fieldLabel}</label>
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-12 text-center bg-gradient-to-br from-muted/50 to-muted/20 hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-muted-foreground">Signature Area</span>
              </div>
            </div>
          </div>
        );
      }
      
      // Handle arrays (tables) - only if not checkbox/signature
      const valueKey = fieldKey;
      const currentValue = formValues[valueKey] || value;

      // If array of objects, build a stable set of columns from union of keys
      const objectColumns: string[] = isArrayOfObjects
        ? Array.from(new Set((value as Record<string, any>[]).flatMap((row) => Object.keys(row))))
        : [];

      // Normalize rows: if data looks like "columns represented as separate one-key objects",
      // collapse into a single empty row with all columns so row count doesn't equal column count
      const looksLikeColumnsAsRows = isArrayOfObjects && (value as Record<string, any>[]).every((row) => Object.keys(row).length === 1);
      const normalizedRows: any[] = looksLikeColumnsAsRows
        ? [Object.fromEntries(objectColumns.map((c) => [c, '']))]
        : (Array.isArray(currentValue) ? currentValue : value);
      return (
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">{fieldLabel}</label>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {isArrayOfObjects
                    ? objectColumns.map((colKey) => (
                        <th key={colKey} className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          {colKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </th>
                      ))
                    : <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Value</th>
                  }
                </tr>
              </thead>
              <tbody>
                {normalizedRows.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    {isArrayOfObjects && typeof item === 'object' && item !== null
                      ? objectColumns.map((colKey, colIndex) => {
                          const cellKey = `${valueKey}.${index}.${colKey}`;
                          return (
                            <td key={colIndex} className="px-4 py-3">
                              <input 
                                type="text" 
                                className="w-full p-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                placeholder="Enter value"
                                value={formValues[cellKey] ?? (item[colKey] ?? '')}
                                onChange={(e) => {
                                  const newTable = [...(Array.isArray(currentValue) ? currentValue : value)];
                                  if (!newTable[index] || typeof newTable[index] !== 'object') newTable[index] = {};
                                  newTable[index][colKey] = e.target.value;
                                  setValue(cellKey, e.target.value);
                                  setValue(valueKey, newTable);
                                }}
                              />
                            </td>
                          );
                        })
                      : <td className="px-4 py-3">
                          <input 
                            type="text" 
                            className="w-full p-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                            placeholder="Enter value"
                            value={formValues[`${valueKey}.${index}`] ?? (item || '')}
                            onChange={(e) => {
                              const newTable = [...(Array.isArray(currentValue) ? currentValue : value)];
                              newTable[index] = e.target.value;
                              setValue(`${valueKey}.${index}`, e.target.value);
                              setValue(valueKey, newTable);
                            }}
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
          const valueKey = fieldKey;
          const currentValue = formValues[valueKey] || rows;
          
          return (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">{fieldLabel}</label>
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      {columns.map((col: string, colIndex: number) => (
                        <th key={colIndex} className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          {col.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(rows.length > 0 ? rows : [{}]).slice(0, 3).map((row: any, index: number) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        {columns.map((colKey: string) => {
                          const cellKey = `${valueKey}.${index}.${colKey}`;
                          return (
                            <td key={colKey} className="px-4 py-3">
                              <input 
                                type="text" 
                                className="w-full p-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                placeholder="Enter value"
                                value={formValues[cellKey] ?? (row[colKey] ?? '')}
                                onChange={(e) => {
                                  const newTable = [...(Array.isArray(currentValue) ? currentValue : rows)];
                                  if (!newTable[index] || typeof newTable[index] !== 'object') newTable[index] = {};
                                  newTable[index][colKey] = e.target.value;
                                  setValue(cellKey, e.target.value);
                                  setValue(valueKey, newTable);
                                }}
                              />
                            </td>
                          );
                        })}
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
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">{fieldLabel}</label>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-12 text-center bg-gradient-to-br from-muted/50 to-muted/20 hover:border-primary/50 transition-colors">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Signature Area</span>
                </div>
              </div>
            </div>
          );
        }
        
        // Handle all other field types (text, date, number, email, etc.)
        const fieldType = typedValue._type || 'text';
        const fieldOptions = Array.isArray(typedValue.options) ? typedValue.options : [];
        const normalized = key.replace(/_\d+$/, '');
        
        // Override with persisted type if available
        const matchingField = fields.find((f: any) => {
          const fieldKeyNormalized = normalizeKey(f?.label || '');
          return fieldKeyNormalized === key || fieldKeyNormalized === normalized;
        });
        
        const finalFieldType = matchingField?.type || fieldTypeByKey.get(normalizeKey(key)) || fieldTypeByKey.get(normalized) || fieldType;
        const finalOptions = matchingField?.options || fieldOptions;
        const isRequired = fieldRequiredByKey.get(normalizeKey(key)) || fieldRequiredByKey.get(normalized) || false;
        
        return (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground block">
              {fieldLabel} {isRequired && <span className="text-destructive">*</span>}
            </label>
            {renderFieldByType(finalFieldType, fieldLabel, fieldKey, finalOptions, formValues, setValue, isRequired)}
          </div>
        );
      }
      
      // Check if it's a legacy signature object
      if (Object.prototype.hasOwnProperty.call(value, 'image_url') || Object.prototype.hasOwnProperty.call(value, 'signed_at')) {
        return (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">{fieldLabel}</label>
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-12 text-center bg-gradient-to-br from-muted/50 to-muted/20 hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-muted-foreground">Signature Area</span>
              </div>
            </div>
          </div>
        );
      }
      
      // Nested object - will be handled by parent
      return null;
    } else {
      // Simple field (primitive or null) - use field type from formData.fields or infer from name
      const normalized = key.replace(/_\d+$/, '');
      
      // Try to find the matching field from formData.fields to get its type
      const matchingField = fields.find((f: any) => {
        const fieldKeyNormalized = normalizeKey(f?.label || '');
        return fieldKeyNormalized === key || fieldKeyNormalized === normalized;
      });
      
      let fieldType = matchingField?.type || fieldTypeByKey.get(normalizeKey(key)) || fieldTypeByKey.get(normalized) || 'text';
      const fieldOptions = matchingField?.options || [];
      const isRequired = fieldRequiredByKey.get(normalizeKey(key)) || fieldRequiredByKey.get(normalized) || false;
      
      // If no matching field found, try to infer type from field name
      if (!matchingField && !fieldTypeByKey.get(normalizeKey(key)) && !fieldTypeByKey.get(normalized)) {
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
          <label className="text-sm font-semibold text-foreground block">
            {fieldLabel} {isRequired && <span className="text-destructive">*</span>}
          </label>
          {renderFieldByType(fieldType, fieldLabel, fieldKey, fieldOptions, formValues, setValue, isRequired)}
        </div>
      );
    }
  };

  const renderHierarchicalData = (data: any, sectionName?: string, path: string[] = [], depth: number = 0) => {
    if (!data) return null;

    const isTopLevel = depth === 0;

    // Render top-level sections as cards
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
      } else if (sections && sections.length > 0) {
        // Fallback: use sections order to determine section sequence
        const sectionOrderMap = new Map<string, number>();
        sections.forEach((s: any) => {
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
        <div className="space-y-6">
          {orderedEntries.map(([key, value]) => {
            const sectionTitle = formatFieldName(key);
            
            return (
              <Card key={key} className="shadow-md border-border hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/5 to-transparent pb-4 border-b">
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <div className="h-1.5 w-10 bg-primary rounded-full"></div>
                    {sectionTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {Array.isArray(value) ? (
                    renderFieldValue(key, value, [key], 1)
                  ) : typeof value === 'object' && value !== null ? (
                    // Check if it's a single typed field or a nested section
                    '_type' in value && (value as any)._type !== 'table' ? (
                      // Single field with _type metadata - render directly
                      renderFieldValue(key, value, [key], 1)
                    ) : (
                      // Nested section - pass the section key so nested rendering can access field order
                      renderHierarchicalData(value, key, [key], 1)
                    )
                  ) : (
                    // Primitive or null value - render as single field
                    renderFieldValue(key, value, [key], 1)
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    // Render nested content (sub-sections within a card)
    // This handles fields within a section
    let orderedFieldEntries: Array<[string, any]> = [];
    
    // If we're rendering fields within a section (depth === 1), try to get field order
    // The sectionName parameter contains the section key when passed from parent
    if (depth === 1 && sectionName) {
      // Field order is stored at top level as _sectionName_fieldOrder
      const fieldOrderKey = `_${sectionName}_fieldOrder`;
      const fieldOrder = (hierarchicalData as any)?.[fieldOrderKey];
      
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
    
    return (
      <div className="space-y-5">
        {orderedFieldEntries.map(([key, value]) => {
          if (Array.isArray(value)) {
            return (
              <div key={key}>
                {renderFieldValue(key, value, [...path, key], depth)}
              </div>
            );
          } else if (typeof value === 'object' && value !== null) {
            // FIRST: Check if it's a field with _type metadata (new LLM format)
            if ('_type' in value) {
              // It's a typed field - render it directly
              return (
                <div key={key}>
                  {renderFieldValue(key, value, [...path, key], depth)}
                </div>
              );
            }
            
            // Check if it's a signature object
            if (Object.prototype.hasOwnProperty.call(value, 'image_url') || Object.prototype.hasOwnProperty.call(value, 'signed_at')) {
              return (
                <div key={key}>
                  {renderFieldValue(key, value, [...path, key], depth)}
                </div>
              );
            }
            
            // Handle nested objects (sub-sections within sections)
            // Only if it's not a typed field (checked above)
            const subsectionTitle = formatFieldName(key);
            return (
              <div key={key} className="space-y-4 pt-2 border-t border-border/50">
                <h5 className="text-base font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="h-0.5 w-6 bg-primary/50 rounded-full"></div>
                  {subsectionTitle}
                </h5>
                {renderHierarchicalData(value, undefined, [...path, key], depth + 1)}
              </div>
            );
          } else {
            // Handle simple fields
            return (
              <div key={key}>
                {renderFieldValue(key, value, [...path, key], depth)}
              </div>
            );
          }
        })}
      </div>
    );
  };


  return (
    <div className="h-dvh overflow-y-auto scrollbar-thin bg-gradient-to-br from-background via-muted/20 to-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Form Header */}
        <Card className="mb-8 shadow-lg border-border">
          <CardHeader className="text-center pb-6 bg-gradient-to-r from-primary/5 via-primary/5 to-transparent">
            <CardTitle className="text-3xl font-bold mb-2">{form.form_title}</CardTitle>
            {form.form_description && (
              <CardDescription className="text-base mt-2">{form.form_description}</CardDescription>
            )}
          </CardHeader>
        </Card>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
              {hierarchicalData && Object.keys(hierarchicalData).length > 0 ? (
                renderHierarchicalData(hierarchicalData)
              )               : sections.length > 0 ? (
                <div className="space-y-6">
                  {/* Sort sections by order to preserve sequence */}
                  {[...sections].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((section: any) => (
                    <Card key={section.id} className="shadow-md border-border hover:shadow-lg transition-shadow">
                      <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/5 to-transparent pb-4 border-b">
                        <CardTitle className="text-xl font-bold flex items-center gap-3">
                          <div className="h-1.5 w-10 bg-primary rounded-full"></div>
                          {section.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-5">
                        {fields
                          .filter((field: any) => field.section === section.id)
                          .map((field: any) => (
                            <div key={field.id} className="space-y-2">
                              <label className="text-sm font-semibold text-foreground block">
                                {field.label} {field.required && <span className="text-destructive">*</span>}
                              </label>
                              {renderFieldByType(field.type || 'text', field.label, field.id, field.options || [], formValues, setValue, field.required || false)}
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="shadow-md border-border">
                  <CardContent className="pt-6 space-y-5">
                    {fields.map((field: any) => (
                      <div key={field.id} className="space-y-2">
                        <label className="text-sm font-semibold text-foreground block">
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </label>
                        {renderFieldByType(field.type || 'text', field.label, field.id, field.options || [], formValues, setValue, field.required || false)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              
              {/* Submit Button */}
              <Card className="mt-8 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-semibold shadow-sm"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Form'
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => window.history.back()}
                      className="h-12 text-base"
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
      </div>
    </div>
  );
};