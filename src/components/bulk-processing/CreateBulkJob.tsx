/**
 * CreateBulkJob Component  
 * Simple, clean job creation with file upload
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  CreditCard,
  FileSpreadsheet,
  FileCheck,
  Files
} from 'lucide-react';

// Document type options
const DOCUMENT_TYPES = [
  {
    value: 'general',
    label: 'General Documents',
    description: 'Forms, applications, certificates, etc.',
    icon: Files
  },
  {
    value: 'bank_statement',
    label: 'Bank Statements',
    description: 'Multi-page tables with transaction data',
    icon: FileSpreadsheet
  },
  {
    value: 'identity_document',
    label: 'Identity Documents',
    description: 'Aadhaar, PAN, Passport, DL, etc.',
    icon: CreditCard
  }
] as const;

type DocumentType = typeof DOCUMENT_TYPES[number]['value'];
import { useToast } from '@/hooks/use-toast';
import { bulkUploadApi, bulkJobsApi } from '@/services/bulkProcessingApi';

interface CreateBulkJobProps {
  onComplete: (jobId: string) => void;
  onCancel: () => void;
}

export const CreateBulkJob: React.FC<CreateBulkJobProps> = ({
  onComplete,
  onCancel
}) => {
  const [jobName, setJobName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('general');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const pdfFiles = selectedFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    
    if (pdfFiles.length !== selectedFiles.length) {
      toast({
        title: 'Only PDF files allowed',
        description: 'Some files were skipped because they are not PDFs',
        variant: 'destructive'
      });
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
    setUploadComplete(false);
    setUploadedPaths([]);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    
    if (pdfFiles.length !== droppedFiles.length) {
      toast({
        title: 'Only PDF files allowed',
        variant: 'destructive'
      });
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
    setUploadComplete(false);
    setUploadedPaths([]);
  }, [toast]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadComplete(false);
    setUploadedPaths([]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload files in batches of 5
      const batchSize = 5;
      const allPaths: string[] = [];
      
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const result = await bulkUploadApi.uploadFiles(batch);
        allPaths.push(...result.files.map(f => f.path));
        
        setUploadProgress(Math.min(100, ((i + batch.length) / files.length) * 100));
      }
      
      setUploadedPaths(allPaths);
      setUploadComplete(true);
      toast({ title: 'Files uploaded successfully' });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!jobName.trim()) {
      toast({ title: 'Please enter a job name', variant: 'destructive' });
      return;
    }
    
    if (uploadedPaths.length === 0) {
      toast({ title: 'Please upload files first', variant: 'destructive' });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const result = await bulkUploadApi.createJobWithFiles({
        jobName: jobName.trim(),
        filePaths: uploadedPaths,
        documentType: documentType  // Pass selected document type
      });
      
      toast({ title: 'Job created successfully!' });
      
      // Start the job
      await bulkJobsApi.startJob(result.job.id);
      toast({ title: 'Processing started' });
      
      onComplete(result.job.id);
    } catch (error) {
      console.error('Failed to create job:', error);
      toast({
        title: 'Failed to create job',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold">Create New Job</h1>
          <p className="text-muted-foreground">
            Upload PDF documents for bulk processing
          </p>
        </div>

        {/* Job Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Name</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter a name for this job..."
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              disabled={isCreating}
            />
          </CardContent>
        </Card>

        {/* Document Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Type</CardTitle>
            <CardDescription>
              Select the type of documents you're uploading for optimized processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={documentType} 
              onValueChange={(value) => setDocumentType(value as DocumentType)}
              className="grid gap-3"
              disabled={isCreating}
            >
              {DOCUMENT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <div key={type.value}>
                    <RadioGroupItem
                      value={type.value}
                      id={type.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.value}
                      className="flex items-center gap-4 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors [&:has([data-state=checked])]:border-primary"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {type.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                      {documentType === type.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            
            {/* Bank Statement Info */}
            {documentType === 'bank_statement' && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Bank Statement Mode</p>
                    <p className="text-xs mt-1">
                      Tables that span multiple pages will be automatically merged. 
                      Headers from the first page will be applied to continuation pages.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">
                Drop PDF files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports multiple PDF files
              </p>
              <input
                id="file-input"
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading || isCreating}
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">{files.length} files selected</span>
                  <span className="text-muted-foreground">{formatSize(totalSize)}</span>
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted/50 rounded px-3 py-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatSize(file.size)}
                        </span>
                      </div>
                      {!uploadComplete && !isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      {uploadComplete && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      Uploading... {uploadProgress.toFixed(0)}%
                    </p>
                  </div>
                )}

                {/* Upload Button */}
                {!uploadComplete && (
                  <Button
                    className="w-full"
                    onClick={handleUpload}
                    disabled={isUploading || files.length === 0}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {files.length} Files
                      </>
                    )}
                  </Button>
                )}

                {/* Upload Complete */}
                {uploadComplete && (
                  <div className="flex items-center gap-2 text-green-600 text-sm justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                    All files uploaded successfully
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Job Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleCreateJob}
          disabled={!jobName.trim() || !uploadComplete || isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Job...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Create Job & Start Processing
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
