import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Users, Calendar, FileText, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';

interface FormResponse {
  id: string;
  form_data: any;
  status: string;
  completion_percentage: number;
  submitted_at: string;
  created_at: string;
}

export const FormResponses = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [formTitle, setFormTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user && formId) {
      fetchResponses();
    }
  }, [user, formId]);

  const fetchResponses = async () => {
    try {
      // Get form details
      const { data: formData, error: formError } = await supabase
        .from('public_forms')
        .select('form_title')
        .eq('id', formId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (formError) {
        console.error('Error fetching form:', formError);
      }

      if (formData) {
        setFormTitle(formData.form_title);
      } else {
        setFormTitle('Form Responses');
      }

      // Get form responses from public_form_submissions table
      // Public forms use public_form_submissions, not form_submissions
      // Show ALL responses to this form (the form ownership is already verified above)
      const { data: responsesData, error: responsesError } = await supabase
        .from('public_form_submissions')
        .select('*')
        .eq('public_form_id', formId) // Get all submissions for this form
        .order('submitted_at', { ascending: false });

      if (responsesError) {
        console.error('Error fetching responses:', responsesError);
      }

      // Map public_form_submissions to FormResponse format
      // Note: public_form_submissions doesn't have created_at, only submitted_at
      const mappedResponses = (responsesData || []).map((r: any) => ({
        id: r.id,
        form_data: r.form_data,
        status: r.submitted_at ? 'submitted' : 'draft',
        completion_percentage: 100, // Public form submissions are always complete when submitted
        submitted_at: r.submitted_at,
        created_at: r.submitted_at || new Date().toISOString() // Use submitted_at as created_at since there's no separate created_at field
      }));

      setResponses(mappedResponses);
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFieldName = (fieldName: string): string => {
    const cleaned = fieldName
      .replace(/_page_\d+$/i, '')
      .replace(/[_\s]page\s*\d+$/i, '')
      .replace(/\s+page\s+\d+$/i, '');
    return cleaned
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const renderFormData = (data: any, depth: number = 0, sectionName?: string): React.ReactNode => {
    // Check if this is a base64 data URL (file stored as plain string)
    if (typeof data === 'string' && data.startsWith('data:')) {
      // It's a base64 data URL - try to detect if it's an image
      const isImage = data.match(/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/);
      if (isImage) {
        return (
          <div className="space-y-2">
            <img 
              src={data} 
              alt="Uploaded image" 
              className="max-w-md rounded-lg border border-border shadow-sm"
              style={{ maxHeight: '300px' }}
            />
          </div>
        );
      } else {
        // Non-image file - show download link
        return (
          <div className="space-y-2">
            <a 
              href={data} 
              download="file"
              className="text-primary hover:underline flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Download file
            </a>
          </div>
        );
      }
    }
    
    // Check if this is an object with a 'data' property containing base64 (alternative file format)
    if (data && typeof data === 'object' && 'data' in data && typeof (data as any).data === 'string' && (data as any).data.startsWith('data:')) {
      const fileData = data as { data: string, filename?: string, mimeType?: string };
      const base64Data = fileData.data;
      const isImage = base64Data.match(/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/);
      
      if (isImage || base64Data.startsWith('data:image/')) {
        return (
          <div className="space-y-2">
            <img 
              src={base64Data} 
              alt={fileData.filename || 'Uploaded image'} 
              className="max-w-md rounded-lg border border-border shadow-sm"
              style={{ maxHeight: '300px' }}
            />
            {fileData.filename && (
              <p className="text-xs text-muted-foreground">{fileData.filename}</p>
            )}
          </div>
        );
      } else {
        // Non-image file - show download link
        return (
          <div className="space-y-2">
            <a 
              href={base64Data} 
              download={fileData.filename || 'file'}
              className="text-primary hover:underline flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {fileData.filename || 'Download file'}
            </a>
          </div>
        );
      }
    }
    
    // Check if this is a file object (from form submission)
    if (data && typeof data === 'object' && '_type' in data && data._type === 'file') {
      const fileData = data as { _type: 'file', filename?: string, data?: string, mimeType?: string };
      if (fileData.data && fileData.data.startsWith('data:')) {
        // It's a base64 data URL - display as image or file
        if (fileData.mimeType?.startsWith('image/')) {
          return (
            <div className="space-y-2">
              <img 
                src={fileData.data} 
                alt={fileData.filename || 'Uploaded image'} 
                className="max-w-md rounded-lg border border-border shadow-sm"
                style={{ maxHeight: '300px' }}
              />
              {fileData.filename && (
                <p className="text-xs text-muted-foreground">{fileData.filename}</p>
              )}
            </div>
          );
        } else {
          // Non-image file - show download link
          return (
            <div className="space-y-2">
              <a 
                href={fileData.data} 
                download={fileData.filename || 'file'}
                className="text-primary hover:underline flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {fileData.filename || 'Download file'}
              </a>
            </div>
          );
        }
      } else if (fileData.data && typeof fileData.data === 'string') {
        // File data might be stored as plain base64 string
        return renderFormData(fileData.data, depth, sectionName);
      } else {
        return <span className="text-muted-foreground">No file data</span>;
      }
    }
    
    if (!data || typeof data !== 'object') {
      return <span className="text-foreground">{data === null ? 'N/A' : String(data)}</span>;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <span className="text-muted-foreground italic">No items</span>;
      }
      
      // Check if it's an array of objects (table)
      const isTable = data.length > 0 && typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0]);
      
      if (isTable) {
        const columns = Array.from(new Set(data.flatMap((row: any) => Object.keys(row || {}))));
        return (
          <div className="overflow-x-auto rounded-lg border border-border mt-2">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-2 text-left text-sm font-semibold">
                      {formatFieldName(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, idx: number) => (
                  <tr key={idx} className="border-b border-border">
                    {columns.map((col) => {
                      const cellValue = row[col];
                      return (
                        <td key={col} className="px-4 py-2 text-sm">
                          {cellValue !== null && cellValue !== undefined ? (
                            // Check if it's a file or base64 string
                            (typeof cellValue === 'string' && cellValue.startsWith('data:')) ||
                            (typeof cellValue === 'object' && '_type' in cellValue && cellValue._type === 'file') ? (
                              <div className="max-w-xs">
                                {renderFormData(cellValue, depth + 1)}
                              </div>
                            ) : (
                              String(cellValue)
                            )
                          ) : (
                            <span className="text-muted-foreground italic">N/A</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      
      // Simple array (like checkbox selections)
      return (
        <div className="space-y-1">
          {data.map((item, idx) => (
            <div key={idx} className="text-sm">
              • {String(item)}
            </div>
          ))}
        </div>
      );
    }

    // Object - render as sections
    // Get ordered entries using _keyOrder if available
    let entries: Array<[string, any]> = [];
    const keyOrder = (data as any)?._keyOrder;
    
    if (Array.isArray(keyOrder) && keyOrder.length > 0) {
      // Use _keyOrder to sort entries
      const dataEntries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
      entries = keyOrder
        .map((key: string) => {
          const entry = dataEntries.find(([k]) => k === key);
          return entry ? entry : null;
        })
        .filter((entry): entry is [string, any] => entry !== null);
      
      // Add any remaining entries not in keyOrder (safety check)
      const orderedKeys = new Set(keyOrder);
      dataEntries.forEach(([key, value]) => {
        if (!orderedKeys.has(key)) {
          entries.push([key, value]);
        }
      });
    } else {
      // No _keyOrder, use natural order
      entries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
    }
    
    // For top-level (depth === 0), render as sections with highlighted headings
    if (depth === 0) {
      return (
        <div className="space-y-6">
          {entries.map(([key, value]) => {
            const sectionTitle = formatFieldName(key);
            const isNestedObject = typeof value === 'object' && value !== null && !Array.isArray(value) && !('_type' in value);
            const isTypedField = typeof value === 'object' && value !== null && '_type' in value;
            const isArray = Array.isArray(value);
            
            // If it's a single typed field or simple value
            if (isTypedField || (!isNestedObject && !isArray)) {
              // Check if it's a file
              const fileValue = isTypedField ? (value as any).value : value;
              if (fileValue && typeof fileValue === 'object' && '_type' in fileValue && fileValue._type === 'file') {
                return (
                  <div key={key} className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                      {sectionTitle}
                    </h3>
                    {renderFormData(fileValue, depth + 1, key)}
                  </div>
                );
              }
              
              const displayValue = isTypedField 
                ? ((value as any).value !== null && (value as any).value !== undefined ? String((value as any).value) : 'N/A')
                : (value !== null && value !== undefined ? String(value) : 'N/A');
              
              return (
                <div key={key} className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                    {sectionTitle}
                  </h3>
                  <p className="text-foreground">{displayValue}</p>
                </div>
              );
            }
            
            // If it's a nested object or array, render as a section
            return (
              <div key={key} className="space-y-3">
                <h3 className="text-lg font-bold text-foreground border-b border-border pb-2">
                  {sectionTitle}
                </h3>
                <div className="pl-4">
                  {renderFormData(value, depth + 1, key)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    // For nested objects (depth > 0), render as fields within a section
    // Check for section-specific field order (e.g., _personal_info_fieldOrder)
    let orderedFieldEntries = entries;
    if (sectionName) {
      // Normalize section name to match metadata key format (lowercase, underscores)
      const normalizedSectionName = sectionName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const sectionFieldOrderKey = `_${normalizedSectionName}_fieldOrder`;
      const sectionFieldOrder = (data as any)?.[sectionFieldOrderKey];
      
      if (Array.isArray(sectionFieldOrder) && sectionFieldOrder.length > 0) {
        orderedFieldEntries = sectionFieldOrder
          .map((key: string) => {
            const entry = entries.find(([k]) => k === key);
            return entry ? entry : null;
          })
          .filter((entry): entry is [string, any] => entry !== null);
        
        // Add any remaining fields not in order
        const orderedKeys = new Set(sectionFieldOrder);
        entries.forEach(([key, value]) => {
          if (!orderedKeys.has(key)) {
            orderedFieldEntries.push([key, value]);
          }
        });
      }
    }
    
    return (
      <div className="space-y-3">
        {orderedFieldEntries.map(([key, value]) => {
          const fieldLabel = formatFieldName(key);
          
          // First, check if this is a file (object with 'data' property containing base64)
          const isFileObject = value && typeof value === 'object' && !Array.isArray(value) && 
            ('data' in value && typeof (value as any).data === 'string' && (value as any).data.startsWith('data:'));
          
          // Check for typed field format
          const isTypedField = typeof value === 'object' && value !== null && '_type' in value;
          
          // Check for nested object (excluding file objects)
          const isNestedObject = typeof value === 'object' && value !== null && !Array.isArray(value) && 
            !isTypedField && !isFileObject;
          
          return (
            <div key={key} className="space-y-1">
              <div className="font-semibold text-sm text-foreground">
                {fieldLabel}:
              </div>
              <div className="text-sm text-muted-foreground pl-4">
                {isFileObject ? (
                  // File object with 'data' property - render it
                  renderFormData(value, depth + 1, key)
                ) : isTypedField ? (
                  // Check if the value is a file object
                  (value as any).value && typeof (value as any).value === 'object' && '_type' in (value as any).value && (value as any).value._type === 'file' ? (
                    renderFormData((value as any).value, depth + 1, key)
                  ) : (
                    <span>
                      {(value as any).value !== null && (value as any).value !== undefined ? String((value as any).value) : 'N/A'}
                    </span>
                  )
                ) : (
                  // Check if value itself is a file object with _type
                  value && typeof value === 'object' && '_type' in value && value._type === 'file' ? (
                    renderFormData(value, depth + 1, key)
                  ) : isNestedObject ? (
                    renderFormData(value, depth + 1, key)
                  ) : (
                    renderFormData(value, depth + 1, key)
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleViewResponse = (response: FormResponse) => {
    setSelectedResponse(response);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header Section */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/forms')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{formTitle} - Responses</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{responses.length} total {responses.length === 1 ? 'response' : 'responses'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {responses.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No responses yet</h3>
              <p className="text-muted-foreground">
                Share your form link to start collecting responses.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {responses.map((response) => (
              <Card 
                key={response.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewResponse(response)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Response #{response.id.slice(-8)}</CardTitle>
                  <CardDescription className="mt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(response.created_at)}
                    </div>
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{response.completion_percentage}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize">{response.status}</span>
                  </div>

                  {response.submitted_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                      <FileText className="h-4 w-4" />
                      Submitted {formatDate(response.submitted_at)}
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleViewResponse(response);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Response Detail Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="text-xl font-bold">
                Response #{selectedResponse?.id.slice(-8)} - Submitted Data
              </DialogTitle>
              <DialogDescription className="pt-1">
                Submitted on {selectedResponse && formatDate(selectedResponse.submitted_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {selectedResponse && (
                <div>
                  {selectedResponse.form_data && Object.keys(selectedResponse.form_data).length > 0 ? (
                    renderFormData(selectedResponse.form_data)
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data submitted</p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};