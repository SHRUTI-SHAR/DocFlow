/**
 * Simple Bulk Processing Test Page
 * Upload single PDF → See results
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProcessingResult {
  jobId: string;
  documentId: string;
  status: string;
  extractedFields?: Record<string, any>;
  error?: string;
}

export default function BulkTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a PDF file first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      // Create job with folder path (simplified approach)
      const bulkApiUrl = import.meta.env.VITE_BULK_API_URL;
      if (!bulkApiUrl) throw new Error('VITE_BULK_API_URL not configured');
      
      const jobRes = await fetch(`${bulkApiUrl}/api/v1/bulk-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test - ${selectedFile.name}`,
          source_type: 'folder',
          source_config: {
            path: 'C:\\Users\\madma\\Desktop\\docflow\\docu-to-form\\BNI\\New folder',
            file_types: ['pdf'],
            recursive: false
          },
          processing_config: {
            mode: 'once',
            discovery_batch_size: 10
          },
          processing_options: {
            priority: 3,
            max_retries: 3,
            parallel_workers: 10,
            signature_detection: false,
            retry_delay: 60,
            exponential_backoff: true,
            send_to_review_queue: true,
            cost_tracking: true,
            detailed_logging: false
          }
        }),
      });

      if (!jobRes.ok) {
        const errorText = await jobRes.text();
        throw new Error(`Job creation failed: ${errorText}`);
      }
      const jobData = await jobRes.json();
      const jobId = jobData.id;

      // Start job
      const bulkApiUrlStart = import.meta.env.VITE_BULK_API_URL;
      if (!bulkApiUrlStart) throw new Error('VITE_BULK_API_URL not configured');
      
      const startRes = await fetch(`${bulkApiUrlStart}/api/v1/bulk-jobs/${jobId}/start`, {
        method: 'POST',
      });

      if (!startRes.ok) throw new Error('Job start failed');

      toast({
        title: "Processing Started",
        description: "PDF is being processed...",
      });

      // Poll for results
      let attempts = 0;
      const maxAttempts = 60;

      const pollInterval = setInterval(async () => {
        attempts++;

        try {
          const bulkApiUrlPoll = import.meta.env.VITE_BULK_API_URL;
          if (!bulkApiUrlPoll) throw new Error('VITE_BULK_API_URL not configured');
          
          const statusRes = await fetch(`${bulkApiUrlPoll}/api/v1/bulk-jobs/${jobId}`);
          if (!statusRes.ok) throw new Error('Status check failed');
          
          const statusData = await statusRes.json();
          
          if (statusData.status === 'completed' || statusData.status === 'failed' || attempts >= maxAttempts) {
            clearInterval(pollInterval);

            setResult({
              jobId: jobId,
              documentId: statusData.id,
              status: statusData.status,
              extractedFields: {
                total_documents: statusData.total_documents,
                processed_documents: statusData.processed_documents,
                failed_documents: statusData.failed_documents,
              },
              error: statusData.status === 'failed' ? 'Processing failed' : undefined,
            });

            setIsProcessing(false);

            toast({
              title: statusData.status === 'completed' ? "Success" : "Failed",
              description: statusData.status === 'completed' 
                ? "PDF processed successfully!" 
                : "Processing failed",
              variant: statusData.status === 'completed' ? "default" : "destructive",
            });
          }
        } catch (error) {
          console.error('Polling error:', error);
          // Stop polling if server is unreachable after multiple attempts
          if (attempts >= 5) {
            clearInterval(pollInterval);
            setIsProcessing(false);
            toast({
              title: "Server Error",
              description: "Cannot reach bulk processing server. Please restart the backend.",
              variant: "destructive",
            });
          }
        }
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Bulk Processing Test</h1>
        <p className="text-muted-foreground">Upload a single PDF and see the extracted results</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{selectedFile.name}</span>
              <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Processing Result</CardTitle>
              {result.status === 'completed' ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Job ID:</span>
                <p className="font-mono text-xs mt-1">{result.jobId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium mt-1 capitalize">{result.status}</p>
              </div>
            </div>

            {/* Extracted Fields */}
            {result.extractedFields && Object.keys(result.extractedFields).length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Extracted Fields:</h3>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  {Object.entries(result.extractedFields).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">{key}:</span>
                      <span className="col-span-2 break-words">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            <details className="text-sm">
              <summary className="cursor-pointer font-medium mb-2">View Raw JSON</summary>
              <pre className="bg-muted rounded-lg p-4 overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>

            {/* Error */}
            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                <p className="font-medium">Error:</p>
                <p>{result.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Select a PDF file (currently uses folder: BNI/New folder)</li>
            <li>Click "Upload" to create and start processing job</li>
            <li>Wait for processing (polls every 2 seconds)</li>
            <li>See job status and document counts</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-4">
            Note: Currently processes PDFs from: C:\Users\madma\Desktop\docflow\docu-to-form\BNI\New folder
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
