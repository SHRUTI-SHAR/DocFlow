/**
 * BulkDocumentViewer Component
 * Page-by-page viewer for extracted document data
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Save,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X,
  BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bulkDocumentsApi } from '@/services/bulkProcessingApi';
import { TranscriptViewer } from './TranscriptViewer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkDocumentViewerProps {
  jobId: string;
  documentId: string;
  documentName: string;
  onBack: () => void;
}

interface ExtractedField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_value: string | null;
  field_group: string | null;
  confidence_score: number | null;
  page_number: number;
  needs_manual_review: boolean;
  validation_status: string;
}

export const BulkDocumentViewer: React.FC<BulkDocumentViewerProps> = ({
  jobId,
  documentId,
  documentName,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [pageData, setPageData] = useState<Record<number, ExtractedField[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalFields, setTotalFields] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'transcript'>('data');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [jobId, documentId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await bulkDocumentsApi.getDocumentFieldsGrouped(jobId, documentId);
      setPageData(data.pages);
      setTotalFields(data.total_fields);
      setTotalPages(data.page_count);
      
      // Set current page to first available page
      const pageNumbers = Object.keys(data.pages).map(Number).sort((a, b) => a - b);
      if (pageNumbers.length > 0) {
        setCurrentPage(pageNumbers[0]);
      }
    } catch (error) {
      console.error('Failed to fetch document data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load document data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all edited fields
      const updates = Object.entries(editedValues);
      for (const [fieldId, value] of updates) {
        await bulkDocumentsApi.updateField(jobId, documentId, fieldId, {
          field_value: value,
          validation_status: 'validated'
        });
      }
      
      toast({ title: 'Changes saved' });
      setEditedValues({});
      setIsEditing(false);
      fetchData(); // Refresh data
    } catch (error) {
      toast({
        title: 'Failed to save changes',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await bulkDocumentsApi.exportDocument(jobId, documentId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentName}_data.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export downloaded' });
    } catch (error) {
      toast({ title: 'Failed to export', variant: 'destructive' });
    }
  };

  const pageNumbers = Object.keys(pageData).map(Number).sort((a, b) => a - b);
  const currentFields = pageData[currentPage] || [];

  // Group fields by field_group
  const groupedFields = currentFields.reduce((acc, field) => {
    const group = field.field_group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, ExtractedField[]>);

  // Check if a group of fields represents a table (fields with [index].column pattern)
  const isTableGroup = (fields: ExtractedField[]): boolean => {
    if (fields.length < 2) return false;
    // Check if fields have array index pattern like [0].column, [1].column
    const tablePattern = /\[\d+\]\./;
    const tableFields = fields.filter(f => tablePattern.test(f.field_name));
    return tableFields.length >= 2;
  };

  // Parse table fields into rows and columns
  const parseTableData = (fields: ExtractedField[]): { 
    headers: string[]; 
    rows: { rowIndex: number; cells: Record<string, ExtractedField> }[];
    nonTableFields: ExtractedField[];
  } => {
    const tablePattern = /\[(\d+)\]\.(.+)$/;
    const rowsMap: Record<number, Record<string, ExtractedField>> = {};
    const columnsOrder: string[] = []; // Track column order as they appear
    const nonTableFields: ExtractedField[] = [];

    for (const field of fields) {
      const match = field.field_name.match(tablePattern);
      if (match) {
        const rowIndex = parseInt(match[1]);
        const columnName = match[2];
        
        if (!rowsMap[rowIndex]) {
          rowsMap[rowIndex] = {};
        }
        rowsMap[rowIndex][columnName] = field;
        
        // Track column order - add only if not already present
        if (!columnsOrder.includes(columnName)) {
          columnsOrder.push(columnName);
        }
      } else {
        nonTableFields.push(field);
      }
    }

    // Use the order columns first appeared (preserves document order)
    const headers = columnsOrder;

    // Convert rows map to sorted array
    const rows = Object.entries(rowsMap)
      .map(([idx, cells]) => ({ rowIndex: parseInt(idx), cells }))
      .sort((a, b) => a.rowIndex - b.rowIndex);

    return { headers, rows, nonTableFields };
  };

  // Format column header for display
  const formatColumnHeader = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getFieldValue = (field: ExtractedField) => {
    if (editedValues[field.id] !== undefined) {
      return editedValues[field.id];
    }
    return field.field_value || '';
  };

  const formatFieldName = (name: string) => {
    return name
      .replace(/[_\[\]\.]/g, ' ')
      // Convert 0-indexed numbers to 1-indexed for display (e.g., "Paragraphs 0" → "Paragraphs 1")
      .replace(/\d+/g, match => ` ${parseInt(match) + 1} `)
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Documents
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {documentName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {totalFields} fields extracted from {totalPages} pages
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditedValues({});
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isSaving || Object.keys(editedValues).length === 0}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs for Data vs Transcript */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'data' | 'transcript')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Extracted Data
            </TabsTrigger>
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Transcript
            </TabsTrigger>
          </TabsList>

          {/* Extracted Data Tab */}
          <TabsContent value="data" className="space-y-4 mt-4">
            {/* Page Navigation */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const idx = pageNumbers.indexOf(currentPage);
                      if (idx > 0) setCurrentPage(pageNumbers[idx - 1]);
                    }}
                    disabled={pageNumbers.indexOf(currentPage) === 0}
                    className="shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground shrink-0">Page</span>
                      <div className="flex-1 horizontal-scroll">
                        <div className="flex gap-2 pb-2">
                          {pageNumbers.map(page => (
                            <Button
                              key={page}
                              variant={page === currentPage ? 'default' : 'outline'}
                              size="sm"
                              className="min-w-[44px] shrink-0"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const idx = pageNumbers.indexOf(currentPage);
                      if (idx < pageNumbers.length - 1) setCurrentPage(pageNumbers[idx + 1]);
                    }}
                    disabled={pageNumbers.indexOf(currentPage) === pageNumbers.length - 1}
                    className="shrink-0"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Data */}
            <div className="space-y-4">
              {Object.entries(groupedFields).map(([groupName, fields]) => {
            const hasTable = isTableGroup(fields);
            const { headers, rows, nonTableFields } = hasTable 
              ? parseTableData(fields) 
              : { headers: [], rows: [], nonTableFields: fields };

            return (
              <Card key={groupName}>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-1 h-6 bg-primary rounded" />
                    {formatFieldName(groupName)}
                    <Badge variant="outline" className="ml-2">
                      {fields.length} fields
                    </Badge>
                    {hasTable && (
                      <Badge variant="secondary" className="ml-1">
                        Table
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Render non-table fields first */}
                  {nonTableFields.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {nonTableFields.map(field => (
                        <div 
                          key={field.id} 
                          className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatFieldName(field.field_name)}
                            </span>
                            {field.needs_manual_review && (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            )}
                            {field.validation_status === 'validated' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <div className="md:col-span-2">
                            {isEditing ? (
                              <Input
                                value={getFieldValue(field)}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                className="text-sm"
                                placeholder="Enter value..."
                              />
                            ) : (
                              <div className="text-sm bg-muted/50 px-3 py-2 rounded min-h-[2.5rem] flex items-center">
                                {field.field_value || <span className="text-muted-foreground italic">Empty</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Render table if present */}
                  {hasTable && rows.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="border border-border px-3 py-2 text-left font-medium text-muted-foreground w-12">
                              #
                            </th>
                            {headers.map(header => (
                              <th 
                                key={header} 
                                className="border border-border px-3 py-2 text-left font-medium text-muted-foreground"
                              >
                                {formatColumnHeader(header)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(({ rowIndex, cells }) => (
                            <tr key={rowIndex} className="hover:bg-muted/30">
                              <td className="border border-border px-3 py-2 text-muted-foreground">
                                {rowIndex + 1}
                              </td>
                              {headers.map(header => {
                                const cell = cells[header];
                                return (
                                  <td key={header} className="border border-border px-3 py-2">
                                    {isEditing && cell ? (
                                      <Input
                                        value={getFieldValue(cell)}
                                        onChange={(e) => handleFieldChange(cell.id, e.target.value)}
                                        className="text-sm h-8"
                                        placeholder="..."
                                      />
                                    ) : (
                                      <span className={!cell?.field_value ? 'text-muted-foreground italic' : ''}>
                                        {cell?.field_value || '-'}
                                      </span>
                                    )}
                                    {cell?.needs_manual_review && (
                                      <AlertCircle className="h-3 w-3 text-orange-500 inline ml-1" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Fallback for non-table groups without the table check */}
                  {!hasTable && nonTableFields.length === 0 && (
                    <div className="space-y-3">
                      {fields.map(field => (
                        <div 
                          key={field.id} 
                          className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatFieldName(field.field_name)}
                            </span>
                            {field.needs_manual_review && (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            )}
                            {field.validation_status === 'validated' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <div className="md:col-span-2">
                            {isEditing ? (
                              <Input
                                value={getFieldValue(field)}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                className="text-sm"
                                placeholder="Enter value..."
                              />
                            ) : (
                              <div className="text-sm bg-muted/50 px-3 py-2 rounded min-h-[2.5rem] flex items-center">
                                {field.field_value || <span className="text-muted-foreground italic">Empty</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

              {currentFields.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No data on this page</h3>
                    <p className="text-muted-foreground">
                      This page doesn't have any extracted fields
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Transcript Tab */}
          <TabsContent value="transcript" className="mt-4">
            <TranscriptViewer 
              jobId={jobId}
              documentId={documentId}
              documentName={documentName}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
