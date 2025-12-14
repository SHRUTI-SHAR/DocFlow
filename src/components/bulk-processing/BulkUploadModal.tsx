/**
 * BulkUploadModal Component
 * Simple modal to upload PDFs for bulk processing
 */

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bulkUploadApi } from '@/services/bulkProcessingApi';

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onJobCreated: (jobId: string) => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  open,
  onClose,
  onJobCreated
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one PDF file',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Step 1: Upload files to backend
      const uploadResult = await bulkUploadApi.uploadFiles(files);
      
      // Step 2: Create job with uploaded file metadata
      const jobName = `Bulk Job - ${new Date().toLocaleString()}`;
      const files = uploadResult.files.map(f => ({
        path: f.path,
        filename: f.filename || f.original_filename
      }));
      const jobResult = await bulkUploadApi.createJobWithFiles({ jobName, files });
      
      toast({
        title: 'Job created!',
        description: `Created job with ${files.length} documents`,
      });

      onJobCreated(jobResult.job.id);
      onClose();
      
      // Reset form
      setFiles([]);
    } catch (error) {
      console.error('Failed to create job:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to create job',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Bulk Processing Job</DialogTitle>
          <DialogDescription>
            Upload PDFs to process in bulk. All files will be processed in parallel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label>Upload PDFs</Label>
            <div className="mt-2">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF files only
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={async () => {
                setIsUploading(true);
                try {
                  const data = await bulkUploadApi.createTestJob();
                  toast({
                    title: 'Test job created!',
                    description: 'Created test job with 1 dummy PDF',
                  });
                  onJobCreated(data.job.id);
                  onClose();
                } catch (error) {
                  toast({
                    title: 'Failed to create test job',
                    description: error instanceof Error ? error.message : 'Unknown error',
                    variant: 'destructive'
                  });
                } finally {
                  setIsUploading(false);
                }
              }}
              disabled={isUploading}
            >
              Create Test Job
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Create Job
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
