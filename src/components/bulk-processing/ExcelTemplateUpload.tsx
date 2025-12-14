/**
 * ExcelTemplateUpload Component
 * Upload Excel template and parse column headers with worksheet selection
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Loader2,
  Sheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bulkMappingApi } from '@/services/bulkProcessingApi';

interface ExcelTemplateUploadProps {
  jobId: string;
  onTemplateUploaded: (columns: string[], templateId?: string) => void;
  templates?: Array<{
    id: string;
    name: string;
    description?: string;
    usage_count?: number;
  }>;
}

export const ExcelTemplateUpload: React.FC<ExcelTemplateUploadProps> = ({
  jobId,
  onTemplateUploaded,
  templates = []
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<ArrayBuffer | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [uploadResult, setUploadResult] = useState<{
    columns: string[];
    sheet_name: string;
    all_sheets: string[];
  } | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isChangingSheet, setIsChangingSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (file: File, sheetName?: string) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/x-excel'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an Excel file (.xlsx or .xls)',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await bulkMappingApi.uploadTemplate(jobId, file, sheetName);
      
      setUploadResult({
        columns: result.columns,
        sheet_name: result.sheet_name,
        all_sheets: result.all_sheets || [result.sheet_name]
      });
      setSelectedSheet(result.sheet_name);
      
      toast({
        title: 'Template Parsed',
        description: `Found ${result.columns.length} columns in "${result.sheet_name}"`
      });
    } catch (error) {
      console.error('Failed to parse template:', error);
      toast({
        title: 'Failed to parse template',
        description: 'Please check your Excel file and try again',
        variant: 'destructive'
      });
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSheetChange = async (newSheet: string) => {
    if (!selectedFile || newSheet === selectedSheet) return;
    
    setIsChangingSheet(true);
    setSelectedSheet(newSheet);
    
    try {
      const result = await bulkMappingApi.uploadTemplate(jobId, selectedFile, newSheet);
      
      setUploadResult({
        columns: result.columns,
        sheet_name: result.sheet_name,
        all_sheets: result.all_sheets || uploadResult?.all_sheets || [result.sheet_name]
      });
      
      toast({
        title: 'Worksheet Changed',
        description: `Found ${result.columns.length} columns in "${result.sheet_name}"`
      });
    } catch (error) {
      console.error('Failed to parse worksheet:', error);
      toast({
        title: 'Failed to parse worksheet',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsChangingSheet(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setSelectedSheet('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProceed = () => {
    if (uploadResult) {
      onTemplateUploaded(uploadResult.columns, selectedTemplateId || undefined);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Excel Template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works:</h4>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>Upload an Excel file with the column headers you want</li>
            <li>Select the worksheet containing your template columns</li>
            <li>AI will automatically suggest mappings to extracted fields</li>
            <li>Review and adjust the mappings if needed</li>
            <li>Export your data in the Excel format</li>
          </ol>
        </div>

        {/* Upload Zone */}
        {!selectedFile ? (
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleInputChange}
              className="hidden"
            />
            <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Drop your Excel template here
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <Badge variant="secondary">.xlsx, .xls</Badge>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected File */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Loading State */}
            {isUploading && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Parsing template...</span>
              </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Template parsed successfully!</span>
                </div>
                
                {/* Worksheet Selector */}
                {uploadResult.all_sheets.length > 1 && (
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sheet className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-900 dark:text-amber-100">
                        Multiple worksheets found ({uploadResult.all_sheets.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-amber-800 dark:text-amber-200">Select worksheet:</span>
                      <Select
                        value={selectedSheet}
                        onValueChange={handleSheetChange}
                        disabled={isChangingSheet}
                      >
                        <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Select worksheet" />
                        </SelectTrigger>
                        <SelectContent>
                          {uploadResult.all_sheets.map((sheet) => (
                            <SelectItem key={sheet} value={sheet}>
                              {sheet}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isChangingSheet && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  </div>
                )}
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Current sheet: <span className="font-medium text-foreground">{uploadResult.sheet_name}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Columns found: <span className="font-medium text-foreground">{uploadResult.columns.length}</span>
                  </p>
                  
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                    {uploadResult.columns.map((col, idx) => (
                      <Badge key={idx} variant="outline">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Template Selector */}
                {templates.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        Choose Mapping Template (Optional)
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Select
                        value={selectedTemplateId || "__none__"}
                        onValueChange={(val) => setSelectedTemplateId(val === "__none__" ? undefined : val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No template (manual mapping)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No template (manual mapping)</SelectItem>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} {t.usage_count ? `(${t.usage_count} uses)` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplateId && templates.find(t => t.id === selectedTemplateId) && (
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {templates.find(t => t.id === selectedTemplateId)?.description || 'No description'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClear}>
                    Choose Different File
                  </Button>
                  <Button onClick={handleProceed} disabled={isChangingSheet}>
                    Continue to Mapping
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
