/**
 * MappingPreview Component
 * Preview export data before downloading
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Download,
  Save,
  FileSpreadsheet,
  FileText,
  Loader2,
  Table,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bulkMappingApi } from '@/services/bulkProcessingApi';

interface PreviewRow {
  document_id: string;
  document_name: string;
  values: Record<string, string | null>;
}

interface MappingPreviewProps {
  jobId: string;
  mappings: Record<string, string | null>;
  excelColumns: string[];
  templateId?: string | null;
  onBack: () => void;
  onExport: (format: 'xlsx' | 'csv', saveTemplate: boolean, templateName?: string) => void;
  onSaveTemplate: () => void;
}

export const MappingPreview: React.FC<MappingPreviewProps> = ({
  jobId,
  mappings,
  excelColumns,
  templateId,
  onBack,
  onExport,
  onSaveTemplate
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreview();
  }, [jobId, mappings]);

  const fetchPreview = async () => {
    setIsLoading(true);
    try {
      const response = await bulkMappingApi.previewExport(jobId, {
        mappings,
        limit: 5,
        template_id: templateId || undefined
      });
      
      setPreviewData(response.rows);
      setTotalDocuments(response.total_documents);
    } catch (error) {
      console.error('Failed to fetch preview:', error);
      toast({
        title: 'Failed to load preview',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setIsExporting(true);
    try {
      await onExport(format, false);
    } finally {
      setIsExporting(false);
    }
  };

  // Get mapped columns only
  const mappedColumns = excelColumns.filter(col => mappings[col]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading preview...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <span className="font-medium">Export Preview</span>
              </div>
              <Badge variant="outline">
                {totalDocuments} documents
              </Badge>
              <Badge variant="secondary">
                {mappedColumns.length} columns
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Edit Mappings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Table className="h-5 w-5" />
            Data Preview
            <span className="text-sm font-normal text-muted-foreground">
              (showing first {previewData.length} of {totalDocuments} rows)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {previewData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-3 py-2 text-left font-medium text-muted-foreground">
                      Document
                    </th>
                    {excelColumns.map(col => (
                      <th
                        key={col}
                        className={`border border-border px-3 py-2 text-left font-medium ${
                          mappings[col] ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {col}
                        {!mappings[col] && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            unmapped
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={row.document_id} className="hover:bg-muted/30">
                      <td className="border border-border px-3 py-2 font-medium">
                        <span className="truncate block max-w-[200px]" title={row.document_name}>
                          {row.document_name}
                        </span>
                      </td>
                      {excelColumns.map(col => (
                        <td
                          key={col}
                          className={`border border-border px-3 py-2 ${
                            !mappings[col] ? 'bg-muted/30' : ''
                          }`}
                        >
                          {row.values[col] ? (
                            <span className="truncate block max-w-[200px]" title={row.values[col] || ''}>
                              {row.values[col]?.substring(0, 100)}
                              {(row.values[col]?.length || 0) > 100 ? '...' : ''}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data to preview</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Button
                className="w-full h-auto py-4"
                onClick={() => handleExport('xlsx')}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5 mr-2" />
                )}
                <div className="text-left">
                  <div className="font-medium">Download Excel</div>
                  <div className="text-xs opacity-80">.xlsx format</div>
                </div>
              </Button>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Button
                variant="outline"
                className="w-full h-auto py-4"
                onClick={() => handleExport('csv')}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5 mr-2" />
                )}
                <div className="text-left">
                  <div className="font-medium">Download CSV</div>
                  <div className="text-xs opacity-80">.csv format</div>
                </div>
              </Button>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Button
                variant="secondary"
                className="w-full h-auto py-4"
                onClick={onSaveTemplate}
              >
                <Save className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Save as Template</div>
                  <div className="text-xs opacity-80">Reuse this mapping</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mappings
        </Button>
      </div>
    </div>
  );
};
