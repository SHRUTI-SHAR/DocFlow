import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, 
  Database, 
  FileText, 
  Globe, 
  CheckCircle, 
  Clock,
  Loader2,
  Archive,
  Send
} from 'lucide-react';
import { DocumentData, WorkflowInstance, ExportConfig } from '@/types/workflow';

interface PersistExportStepProps {
  documentData: DocumentData | null;
  workflowInstance: WorkflowInstance | null;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
}

export const PersistExportStep: React.FC<PersistExportStepProps> = ({ 
  documentData, 
  workflowInstance, 
  onComplete, 
  onError 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'json',
    includeOriginal: true,
    includeAuditTrail: true,
    destination: ''
  });
  const [customApiEndpoint, setCustomApiEndpoint] = useState('');
  const [exportResults, setExportResults] = useState<any>(null);

  const handlePersistAndExport = async () => {
    if (!documentData || !workflowInstance) return;

    setIsProcessing(true);
    try {
      // Simulate persistence
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create the final export data
      const exportData = {
        document: {
          id: documentData.id,
          filename: documentData.filename,
          originalFile: exportConfig.includeOriginal ? documentData.originalFile?.name : null,
          processedAt: new Date().toISOString(),
          confidence: documentData.confidence,
        },
        extractedData: documentData.extractedFields.reduce((acc, field) => ({
          ...acc,
          [field.name]: field.value
        }), {}),
        workflow: exportConfig.includeAuditTrail ? {
          id: workflowInstance.id,
          status: workflowInstance.status,
          stages: workflowInstance.stages,
          createdAt: workflowInstance.createdAt,
          completedAt: workflowInstance.completedAt,
        } : null,
        metadata: {
          processingSteps: [
            'capture',
            'preprocess', 
            'understand',
            'generate',
            'validate',
            'workflow',
            'persist'
          ],
          exportConfig,
          exportedAt: new Date().toISOString(),
        }
      };

      // Simulate export based on format
      let exportResult;
      switch (exportConfig.format) {
        case 'json':
          exportResult = {
            format: 'JSON',
            size: JSON.stringify(exportData).length,
            content: JSON.stringify(exportData, null, 2)
          };
          break;
        case 'csv':
          const csvHeaders = Object.keys(exportData.extractedData).join(',');
          const csvValues = Object.values(exportData.extractedData).join(',');
          const csvContent = `${csvHeaders}\n${csvValues}`;
          exportResult = {
            format: 'CSV',
            size: csvContent.length,
            content: csvContent
          };
          break;
        case 'pdf':
          exportResult = {
            format: 'PDF',
            size: 1024 * 500, // Simulate 500KB PDF
            content: '[PDF Document Generated]'
          };
          break;
        case 'api':
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          exportResult = {
            format: 'API',
            endpoint: customApiEndpoint || exportConfig.destination,
            status: 'Success',
            response: { id: 'api-export-' + Date.now(), status: 'received' }
          };
          break;
      }

      setExportResults(exportResult);

      const finalResult = {
        documentData,
        workflowInstance,
        exportData,
        exportResult,
        persistedAt: new Date().toISOString(),
      };

      onComplete(finalResult);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Persistence and export failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExportData = () => {
    if (!exportResults) return;

    const blob = new Blob([exportResults.content], { 
      type: exportConfig.format === 'json' ? 'application/json' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${documentData?.filename || 'document'}.${exportConfig.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!documentData || !workflowInstance) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Document data and workflow instance required. Please complete previous steps first.
        </p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Persisting data and exporting...</p>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Saving original document</p>
          <p>• Storing extracted data</p>
          <p>• Creating audit trail</p>
          <p>• Generating export file</p>
        </div>
      </div>
    );
  }

  if (exportResults) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Export Complete!</h3>
          <p className="text-muted-foreground">
            Your document has been successfully processed and exported
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Processing Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Database className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h4 className="font-medium">Data Persisted</h4>
                <p className="text-sm text-muted-foreground">
                  Original file and extracted data stored
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Archive className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h4 className="font-medium">Audit Trail</h4>
                <p className="text-sm text-muted-foreground">
                  Complete processing history recorded
                </p>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Export format: {exportResults.format} • 
                Size: {typeof exportResults.size === 'number' 
                  ? `${Math.round(exportResults.size / 1024)} KB` 
                  : 'N/A'}
                {exportResults.endpoint && ` • Sent to: ${exportResults.endpoint}`}
              </AlertDescription>
            </Alert>

            {(exportConfig.format === 'json' || exportConfig.format === 'csv') && (
              <Button onClick={downloadExportData} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download {exportResults.format.toUpperCase()} File
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Document:</span>
                <span className="font-medium">{documentData.filename}</span>
              </div>
              <div className="flex justify-between">
                <span>Fields Extracted:</span>
                <Badge variant="secondary">{documentData.extractedFields.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Average Confidence:</span>
                <Badge variant="secondary">{Math.round(documentData.confidence)}%</Badge>
              </div>
              <div className="flex justify-between">
                <span>Workflow Stages:</span>
                <Badge variant="secondary">{workflowInstance.stages.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Processing Time:</span>
                <span className="text-muted-foreground">
                  {Math.round((Date.now() - workflowInstance.createdAt.getTime()) / 1000)}s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Persist & Export Data</h3>
        <p className="text-muted-foreground">
          Save the processed data and configure export options
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Export Format</Label>
              <Select
                value={exportConfig.format}
                onValueChange={(value: any) => setExportConfig(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      CSV
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      PDF Report
                    </div>
                  </SelectItem>
                  <SelectItem value="api">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      API Endpoint
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportConfig.format === 'api' && (
              <div>
                <Label className="text-sm">API Endpoint URL</Label>
                <Input
                  value={customApiEndpoint}
                  onChange={(e) => setCustomApiEndpoint(e.target.value)}
                  placeholder="https://api.example.com/webhook"
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Include Original File</Label>
                <Switch
                  checked={exportConfig.includeOriginal}
                  onCheckedChange={(checked) => 
                    setExportConfig(prev => ({ ...prev, includeOriginal: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Include Audit Trail</Label>
                <Switch
                  checked={exportConfig.includeAuditTrail}
                  onCheckedChange={(checked) => 
                    setExportConfig(prev => ({ ...prev, includeAuditTrail: checked }))
                  }
                />
              </div>
            </div>

            {exportConfig.format !== 'api' && (
              <div>
                <Label className="text-sm">Export Destination (Optional)</Label>
                <Input
                  value={exportConfig.destination || ''}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, destination: e.target.value }))}
                  placeholder="/path/to/export/folder"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Document Information</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Filename:</span>
                    <span>{documentData.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fields:</span>
                    <span>{documentData.extractedFields.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span>{Math.round(documentData.confidence)}%</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Workflow Status</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={workflowInstance.status === 'completed' ? 'default' : 'secondary'}>
                      {workflowInstance.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Stages:</span>
                    <span>{workflowInstance.stages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{workflowInstance.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Export Preview</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span>{exportConfig.format.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Include Original:</span>
                    <span>{exportConfig.includeOriginal ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Include Audit:</span>
                    <span>{exportConfig.includeAuditTrail ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Export */}
      <div className="flex justify-center">
        <Button onClick={handlePersistAndExport} size="lg">
          <Send className="w-4 h-4 mr-2" />
          Persist & Export
        </Button>
      </div>
    </div>
  );
};